import { test } from "node:test";
import assert from "node:assert/strict";
import { assess, assessmentChecks, localCopilot } from "./risk.js";

test("calendario Omnibus e obblighi indipendenti di trasparenza", () => {
  const result = assess({
    scenario: "annex3",
    role: "deployer",
    transparency: true,
  });
  assert.match(result.next[0], /2 dicembre 2027/);
  assert.match(result.next[1], /art. 26/);
  assert.match(result.next[2], /2 agosto 2026/);
  assert.match(
    assess({ scenario: "annex1", role: "provider" }).next[0],
    /2 agosto 2028/,
  );
  assert.equal(
    assess({ scenario: "prohibited", role: "provider" }).next.length,
    1,
  );
  assert.equal(assess({ scenario: "toString", role: "unknown" }), null);
});

test("Copilota locale: distingue le domande e propone un'azione", () => {
  const workspace = { systems: [{}], tasks: [{ status: "Completata" }, { status: "Da fare" }] };
  assert.equal(localCopilot("Usiamo l’IA per valutare i CV", workspace).page, "risk");
  assert.match(localCopilot("Abbiamo un chatbot clienti?", workspace).text, /art\. 50/);
  assert.equal(localCopilot("Usiamo ChatGPT per le email", workspace).page, "systems");
  assert.match(localCopilot("Quali scadenze ho?", workspace).text, /piano: 1/);
  assert.equal(localCopilot("Ciao, da dove comincio?", workspace).page, "dashboard");
});

test("Checklist proporzionata a ruolo e scenario", () => {
  const ids = (scenario, role, transparency) => assessmentChecks(scenario, role, transparency).map(item => item.id);
  assert.deepEqual(ids("prohibited", "provider", true), ["scope", "prohibition"]);
  assert.ok(ids("annex3", "deployer", true).includes("impact"));
  assert.ok(ids("annex3", "deployer", true).includes("disclosure"));
  assert.ok(!ids("annex3", "deployer", true).includes("technical"));
  assert.ok(ids("annex1", "provider", true).includes("marking"));
  assert.ok(!ids("annex1", "provider", true).includes("impact"));
});
