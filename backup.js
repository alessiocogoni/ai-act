import { mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { DatabaseSync, backup } from "node:sqlite";

const source = resolve(process.env.DB_PATH || "private/copilota.sqlite");
if (!process.argv[2])
  throw new Error("Indicare il percorso di destinazione del backup.");
const destination = resolve(process.argv[2]);
if (source === destination)
  throw new Error("La destinazione deve essere diversa dal database attivo.");
await mkdir(dirname(destination), { recursive: true, mode: 0o700 });
const database = new DatabaseSync(source, { readOnly: true });
try {
  await backup(database, destination);
  console.log("Backup SQLite completato.");
} finally {
  database.close();
}
