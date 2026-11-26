import { test } from "node:test";
import assert from "node:assert/strict";
import { assess } from "./risk.js";

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
