import test from "node:test";
import assert from "node:assert/strict";
import { workspacePriorities, localCopilot } from "./risk.js";

test("operational priorities use local date, preserve data and exclude completed tasks", () => {
  const today = new Date(2026, 10, 27, 12);
  const workspace = {
  "systems": [
    {
      "id": "a",
      "name": "Demo"
    },
    {
      "id": "b",
      "assessment": {
        "date": "2026-10-01",
        "review": "2026-11-26",
        "scenario": "prohibited"
      }
    },
    {
      "id": "c",
      "assessment": {
        "date": "2026-10-01",
        "review": "2026-12-27"
      }
    },
    {
      "id": "d",
      "assessment": {
        "date": "2026-10-01",
        "review": "2026-12-28"
      }
    }
  ],
  "tasks": [
    {
      "id": "1",
      "date": "2026-11-26",
      "status": "Da fare"
    },
    {
      "id": "2",
      "date": "2026-11-27",
      "status": "Da fare"
    },
    {
      "id": "3",
      "date": "2026-12-27",
      "status": "In corso"
    },
    {
      "id": "4",
      "date": "2026-11-25",
      "status": "Completata"
    },
    {
      "id": "5",
      "date": "2026-12-28"
    },
    {
      "id": "6",
      "date": "2026-11-31"
    }
  ]
};
  const snapshot = JSON.stringify(workspace);
  const result = workspacePriorities(workspace, today);
  assert.deepEqual(result.overdue.map(x=>x.id), ["1"]);
  assert.deepEqual(result.upcoming.map(x=>x.id), ["2","3"]);
  assert.deepEqual(result.screenings.map(x=>x.id), ["a"]);
  assert.deepEqual(result.reviews.map(x=>x.id), ["b","c"]);
  assert.deepEqual(result.prohibited.map(x=>x.id), ["b"]);
  assert.equal(JSON.stringify(workspace), snapshot);
  assert.ok(Object.values(workspacePriorities({},today)).every(x=>x.length===0));
});
test("local copilot links the user to the correct document section", () => {
  const workspace = {systems:[],tasks:[]};
  assert.equal(localCopilot("Dove allego la visura?",workspace).page,"profile");
  assert.equal(localCopilot("Esporta policy",workspace).page,"docs");
});
