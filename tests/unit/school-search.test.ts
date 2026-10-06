import assert from "node:assert/strict";
import test from "node:test";
import { matchesSchoolSearch } from "../../src/lib/school-search";

const school = { name: "Sint-Nicolaas Lyceum", concepts: ["Montessori"], street: "Émile Zolaweg", houseNumber: "12", postalCode: "1017RV", city: "Amsterdam", brin: "AB12" };
for (const query of ["nicolaas", "MONTESSORI", "emile zolaweg 12", "1017 rv", "1017RV", "Amsterdam Montessori Nicolaas", "Sint—Nicolaas", "ab12", "  "]) {
  test(`matches ${JSON.stringify(query)}`, () => assert.equal(matchesSchoolSearch(school, query), true));
}
test("all terms must match, including similar names", () => {
  assert.equal(matchesSchoolSearch(school, "Nicolaas College"), false);
  assert.equal(matchesSchoolSearch(school, "Dalton"), false);
});
test("stored postcode whitespace and null fields", () => {
  assert.equal(matchesSchoolSearch({ ...school, postalCode: "1017 rv", street: null }, "1017RV"), true);
});
