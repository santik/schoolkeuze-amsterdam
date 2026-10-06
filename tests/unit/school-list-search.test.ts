import assert from "node:assert/strict";
import test from "node:test";

delete process.env.DATABASE_URL;

test("sample backend search uses the shared matcher and combined filters", async () => {
  const { listSchools } = await import("../../src/server/schoolsStore");
  const all = await listSchools({ take: 200 });
  const target = all.find((s) => s.postalCode && s.concepts.length > 0)!;
  assert.ok(target, "sample data needs a school with a postcode and concept");

  const spaced = target.postalCode!.replace(/^(\d{4})(\w+)$/, "$1 $2").toLowerCase();
  const byPostcode = await listSchools({ q: spaced, take: 200 });
  assert.ok(byPostcode.some((s) => s.id === target.id));

  const byConcept = await listSchools({ q: `${target.concepts[0]} ${target.name.split(" ")[0]}`, take: 200 });
  assert.ok(byConcept.some((s) => s.id === target.id));

  const none = await listSchools({ q: "zzz-no-such-school", take: 200 });
  assert.equal(none.length, 0);

  const wrongLevel = await listSchools({ q: target.name, levels: ["PRAKTIJKONDERWIJS"], take: 200 });
  assert.ok(wrongLevel.every((s) => s.levels.some((l) => l === "PRAKTIJKONDERWIJS")));
});
