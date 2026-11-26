import { createServer } from "node:http";
import { DatabaseSync } from "node:sqlite";
import {
  createHash,
  randomBytes,
  randomUUID,
  scrypt,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { promisify } from "node:util";
import { sources } from "./risk.js";

const derive = promisify(scrypt);
const port = Number(process.env.PORT || 8000);
const origin = new URL(process.env.APP_ORIGIN || "http://localhost:" + port);
if (
  origin.protocol !== "https:" &&
  !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)
) {
  throw new Error("Configurare APP_ORIGIN con un indirizzo HTTPS.");
}
process.umask(0o077);
const path = resolve(process.env.DB_PATH || "private/copilota.sqlite");
mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
const db = new DatabaseSync(path);
db.exec(`
  PRAGMA foreign_keys = ON;
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;
  CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, password TEXT NOT NULL);
  CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, user_id TEXT REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS organizations (id TEXT PRIMARY KEY, payload TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 0, pdf BLOB);
  CREATE TABLE IF NOT EXISTS memberships (
    org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK(role IN ('owner','editor','viewer')),
    PRIMARY KEY (org_id, user_id)
  );
`);

const files = new Map(
  [
    ["/", ["index.html", "text/html; charset=utf-8"]],
    ["/index.html", ["index.html", "text/html; charset=utf-8"]],
    ["/app.js", ["app.js", "text/javascript; charset=utf-8"]],
    ["/risk.js", ["risk.js", "text/javascript; charset=utf-8"]],
  ].map(([url, [file, type]]) => [
    url,
    { body: readFileSync(new URL(file, import.meta.url)), type },
  ]),
);

const hash = (value) => createHash("sha256").update(value).digest("hex");
const secretEqual = (a, b) =>
  timingSafeEqual(Buffer.from(hash(a)), Buffer.from(hash(b)));
const aiEnabled = Boolean(
  process.env.OPENAI_API_KEY && process.env.OPENAI_MODEL,
);
const secureCookie = origin.protocol === "https:" ? "; Secure" : "";
const cookie = (value, age) =>
  "session=" +
  value +
  "; HttpOnly; SameSite=Strict; Path=/; Max-Age=" +
  age +
  secureCookie;
const error = (status, message) =>
  Object.assign(new Error(message), { status });
const json = (res, value, status = 200) => {
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(value));
};
const attempts = new Map();
function limit(key, max, interval) {
  const now = Date.now();
  for (const [id, entry] of attempts)
    if (entry.until <= now) attempts.delete(id);
  const entry = attempts.get(key) || { count: 0, until: now + interval };
  if (entry.count >= max) throw error(429, "Riprova più tardi.");
  entry.count++;
  attempts.set(key, entry);
}

async function body(req, max = 5 * 1024 * 1024) {
  if (req.headers["content-type"]?.split(";")[0] !== "application/json")
    throw error(415, "Formato non supportato.");
  const buffers = [];
  let size = 0;
  for await (const part of req.iterator({ destroyOnReturn: false })) {
    size += part.length;
    if (size > max) {
      req.resume();
      throw error(413, "Dimensione massima superata.");
    }
    buffers.push(part);
  }
  try {
    const value = JSON.parse(Buffer.concat(buffers).toString("utf8"));
    if (!value || Array.isArray(value) || typeof value !== "object")
      throw new Error();
    return value;
  } catch {
    throw error(400, "Dati non validi.");
  }
}

function normalizeWorkspace(value, id) {
  if (
    !value ||
    typeof value.name !== "string" ||
    !value.name.trim() ||
    value.name.length > 150 ||
    !value.data ||
    !Array.isArray(value.data.systems) ||
    !Array.isArray(value.data.tasks) ||
    Buffer.byteLength(JSON.stringify(value.data)) > 1024 * 1024
  )
    throw error(400, "Dati del workspace non validi.");
  for (const key of [
    "systems",
    "tasks",
    "docs",
    "training",
    "interviews",
    "survey",
    "consultations",
  ]) {
    const rows = value.data[key];
    if (
      rows !== undefined &&
      (!Array.isArray(rows) ||
        rows.some(
          (row) => !row || Array.isArray(row) || typeof row !== "object",
        ))
    ) {
      throw error(400, "Registro non valido.");
    }
  }
  const payload = { id, name: value.name.trim(), data: value.data };
  for (const key of ["kind", "tax", "sector", "contact"]) {
    if (typeof value[key] === "string") payload[key] = value[key].slice(0, 500);
  }
  let pdf = null;
  if (value.visuraData != null || value.visura) {
    const encoded =
      typeof value.visuraData === "string" &&
      value.visuraData.match(
        /^data:(?:application\/(?:pdf|octet-stream)|);base64,([A-Za-z0-9+/]+={0,2})$/,
      );
    pdf = encoded && Buffer.from(encoded[1], "base64");
    if (
      !pdf ||
      pdf.length > 2 * 1024 * 1024 ||
      pdf.subarray(0, 5).toString() !== "%PDF-"
    ) {
      throw error(400, "La visura deve essere un PDF di massimo 2 MB.");
    }
    payload.visura =
      typeof value.visura === "string"
        ? value.visura.slice(0, 200)
        : "visura.pdf";
  }
  return { payload: JSON.stringify(payload), pdf };
}

function transaction(action) {
  db.exec("BEGIN IMMEDIATE");
  try {
    action();
    db.exec("COMMIT");
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}

async function authenticate(req, res, registration) {
  const { email: rawEmail, password, key } = await body(req, 4096);
  const email =
    typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  limit("ip:" + req.socket.remoteAddress, 30, 600_000);
  limit("account:" + email.slice(0, 254), 8, 600_000);
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    typeof password !== "string" ||
    password.length < 12 ||
    password.length > 128
  ) {
    throw error(400, "Inserisci email e password da 12 a 128 caratteri.");
  }
  let user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (registration) {
    const required = process.env.REGISTRATION_KEY;
    if (
      !required ||
      required.length < 24 ||
      typeof key !== "string" ||
      !secretEqual(required, key)
    ) {
      throw error(403, "Registrazione non abilitata o codice non valido.");
    }
    const salt = randomBytes(16).toString("hex");
    const passwordHash = (await derive(password, salt, 64)).toString("hex");
    user = { id: randomUUID() };
    const result = db
      .prepare("INSERT OR IGNORE INTO users VALUES (?, ?, ?, ?)")
      .run(user.id, email, salt, passwordHash);
    if (!result.changes) throw error(409, "Account già registrato.");
  } else {
    const digest = (
      await derive(password, user?.salt || "00".repeat(16), 64)
    ).toString("hex");
    if (!user || !secretEqual(digest, user.password))
      throw error(401, "Credenziali non valide.");
  }
  db.prepare("DELETE FROM sessions WHERE expires <= ?").run(Date.now());
  const token = randomBytes(32).toString("hex");
  const seconds = 8 * 3600;
  db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(
    hash(token),
    user.id,
    Date.now() + seconds * 1000,
  );
  res.setHeader("Set-Cookie", cookie(token, seconds));
  json(res, { email, aiEnabled });
}

async function copilot(req, res, account) {
  if (!aiEnabled) throw error(503, "Copilota AI non configurato.");
  limit("ai:" + account.id, 10, 600_000);
  const { question } = await body(req, 8192);
  if (
    typeof question !== "string" ||
    !question.trim() ||
    question.length > 1500
  )
    throw error(400, "Inserisci una domanda di massimo 1500 caratteri.");
  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + process.env.OPENAI_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL,
        store: false,
        max_output_tokens: 700,
        instructions:
          "Rispondi in italiano come guida orientativa sull’AI Act, chiedi dettagli se mancano e non inventare obblighi o fonti. Indica il limite della risposta e rimanda alle fonti ufficiali: " +
          Object.values(sources).join(" "),
        input: question,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error();
    const answer = (await response.json()).output
      ?.flatMap((item) => item.content || [])
      .filter((item) => item.type === "output_text")
      .map((item) => item.text)
      .join("\n");
    if (!answer) throw new Error();
    json(res, { answer, sources });
  } catch {
    throw error(502, "Copilota AI temporaneamente non disponibile.");
  }
}

const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
  );
  res.setHeader("Cache-Control", "no-store");
  const url = req.url?.split("?")[0];
  const method = req.method;
  try {
    if (url === "/api/status" && method === "GET")
      return json(res, { available: true });
    const asset = files.get(url);
    if (asset && ["GET", "HEAD"].includes(method)) {
      res.writeHead(200, { "Content-Type": asset.type });
      return res.end(method === "HEAD" ? undefined : asset.body);
    }
    if (!url?.startsWith("/api/")) throw error(404, "Pagina non trovata.");
    if (method !== "GET" && req.headers.origin !== origin.origin)
      throw error(403, "Origine della richiesta non valida.");
    if (method === "POST" && ["/api/login", "/api/register"].includes(url))
      return await authenticate(req, res, url.endsWith("register"));

    const token = /(?:^|;\s*)session=([a-f0-9]{64})(?:;|$)/.exec(
      req.headers.cookie || "",
    )?.[1];
    const account =
      token &&
      db
        .prepare(
          "SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id WHERE token = ? AND expires > ?",
        )
        .get(hash(token), Date.now());
    if (!account) throw error(401, "Accedi per continuare.");
    if (url === "/api/logout" && method === "POST") {
      db.prepare("DELETE FROM sessions WHERE token = ?").run(hash(token));
      res.setHeader("Set-Cookie", cookie("", 0));
      return json(res, {});
    }
    if (url === "/api/me" && method === "GET")
      return json(res, { email: account.email, aiEnabled });
    if (url === "/api/orgs" && method === "GET") {
      const rows = db
        .prepare(
          "SELECT id, role, payload FROM organizations JOIN memberships ON org_id = id WHERE user_id = ?",
        )
        .all(account.id);
      return json(
        res,
        rows.map((row) => ({
          id: row.id,
          role: row.role,
          name: JSON.parse(row.payload).name,
        })),
      );
    }
    if (url === "/api/orgs" && method === "POST") {
      const id = randomUUID();
      const value = await body(req);
      const { payload, pdf } = normalizeWorkspace(value, id);
      transaction(() => {
        db.prepare(
          "INSERT INTO organizations (id, payload, pdf) VALUES (?, ?, ?)",
        ).run(id, payload, pdf);
        db.prepare("INSERT INTO memberships VALUES (?, ?, 'owner')").run(
          id,
          account.id,
        );
      });
      return json(res, { id }, 201);
    }

    const match =
      /^\/api\/orgs\/([a-f0-9-]{36})(?:\/(members|copilot|document))?$/.exec(
        url,
      );
    if (!match) throw error(404, "Funzione non trovata.");
    const [, id, section] = match;
    const member = db.prepare(
      "SELECT role FROM memberships WHERE org_id = ? AND user_id = ?",
    );
    const role = member.get(id, account.id)?.role;
    if (!role) throw error(404, "Organizzazione non trovata.");
    if (section === "copilot" && method === "POST")
      return await copilot(req, res, account);
    if (section === "document" && method === "GET") {
      const pdf = db
        .prepare("SELECT pdf FROM organizations WHERE id = ?")
        .get(id).pdf;
      if (!pdf) throw error(404, "Documento non trovato.");
      res.writeHead(200, {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="visura.pdf"',
      });
      return res.end(pdf);
    }
    if (!section && method === "GET") {
      const row = db
        .prepare("SELECT payload, version FROM organizations WHERE id = ?")
        .get(id);
      return json(res, {
        ...JSON.parse(row.payload),
        role,
        version: row.version,
      });
    }
    if (!section && method === "PUT") {
      const value = await body(req);
      const writableRole = member.get(id, account.id)?.role;
      if (!["editor", "owner"].includes(writableRole))
        throw error(403, "Accesso in sola lettura.");
      const old = db
        .prepare("SELECT payload, pdf FROM organizations WHERE id = ?")
        .get(id);
      const samePDF = value.keepDocument === true && old.pdf;
      if (samePDF) delete value.visura;
      const normalized = normalizeWorkspace(value, id);
      if (samePDF) {
        const payload = JSON.parse(normalized.payload);
        payload.visura = JSON.parse(old.payload).visura;
        normalized.payload = JSON.stringify(payload);
      }
      const result = db
        .prepare(
          "UPDATE organizations SET payload = ?, pdf = ?, version = version + 1 WHERE id = ? AND version = ?",
        )
        .run(
          normalized.payload,
          samePDF ? old.pdf : normalized.pdf,
          id,
          typeof value.version === "number" ? value.version : -1,
        );
      if (!result.changes)
        throw error(
          409,
          "Workspace aggiornato altrove. Esporta la bozza o ricarica prima di riprovare.",
        );
      return json(res, { version: value.version + 1 });
    }
    if (!section && method === "DELETE" && role === "owner") {
      db.prepare("DELETE FROM organizations WHERE id = ?").run(id);
      return json(res, {});
    }
    if (section === "members" && role === "owner") {
      if (method === "GET") {
        return json(
          res,
          db
            .prepare(
              "SELECT email, role FROM memberships JOIN users ON user_id = users.id WHERE org_id = ?",
            )
            .all(id),
        );
      }
      if (method === "PUT") {
        const { email, role: nextRole } = await body(req, 4096);
        const user =
          typeof email === "string" &&
          db
            .prepare("SELECT id FROM users WHERE email = ?")
            .get(email.trim().toLowerCase());
        if (
          !user ||
          user.id === account.id ||
          !["editor", "viewer", "remove"].includes(nextRole)
        )
          throw error(400, "Account o ruolo non valido.");
        if (
          !db
            .prepare(
              "SELECT 1 FROM memberships WHERE org_id = ? AND user_id = ? AND role = 'owner'",
            )
            .get(id, account.id)
        )
          throw error(403, "Permessi insufficienti.");
        if (nextRole === "remove")
          db.prepare(
            "DELETE FROM memberships WHERE org_id = ? AND user_id = ? AND role != 'owner'",
          ).run(id, user.id);
        else
          db.prepare(
            "INSERT INTO memberships VALUES (?, ?, ?) ON CONFLICT(org_id,user_id) DO UPDATE SET role = excluded.role WHERE role != 'owner'",
          ).run(id, user.id, nextRole);
        return json(res, {});
      }
    }
    throw error(403, "Operazione non consentita.");
  } catch (e) {
    if (!e.status) console.error(e.name);
    if (!res.headersSent)
      json(
        res,
        { error: e.status ? e.message : "Errore interno." },
        e.status || 500,
      );
  }
});
server.listen(port, process.env.BIND_HOST || "127.0.0.1", () =>
  console.log("Copilota AI Act pronto sulla porta " + port),
);
