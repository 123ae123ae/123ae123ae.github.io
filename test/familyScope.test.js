import test from "node:test";
import assert from "node:assert/strict";
import { chooseActiveBaby, chooseActiveFamily, formatInviteCode, makeScopedRecord, normalizeInviteCode, recordScope, recordsForBaby, removeBabyFromContext, scopedStorageKey } from "../src/familyScope.js";

const family = { id: "family-a" };
const babies = [
  { id: "baby-a", family_id: "family-a", birth_date: "2026-02-10" },
  { id: "baby-b", family_id: "family-a", birth_date: "2026-02-10" },
];

test("same-birthday twins remain distinct and last baby is restored", () => {
  assert.equal(chooseActiveBaby(babies, "baby-b", null).id, "baby-b");
  assert.notEqual(babies[0].id, babies[1].id);
});

test("record scope always uses the selected baby's family and id", () => {
  assert.deepEqual(recordScope(family, babies[1], "user-a"), { family_id: "family-a", baby_id: "baby-b", user_id: "user-a" });
  assert.throws(() => recordScope({ id: "family-b" }, babies[1], "user-a"), /invalid_baby_scope/);
});

test("deleting baby A does not remove or switch away from baby B", () => {
  const result = removeBabyFromContext(babies, "baby-a", "baby-b");
  assert.deepEqual(result.babies.map((baby) => baby.id), ["baby-b"]);
  assert.equal(result.activeBaby.id, "baby-b");
});

test("empty family has no active baby", () => assert.equal(chooseActiveBaby([], null, null), null));

test("family and local cache selection are scoped", () => {
  const memberships = [{ family_id: "family-a" }, { family_id: "family-b" }];
  assert.equal(chooseActiveFamily(memberships, "family-b", null).family_id, "family-b");
  assert.notEqual(scopedStorageKey("meals", "baby-a"), scopedStorageKey("meals", "baby-b"));
});

test("one family can contain two babies", () => assert.deepEqual(babies.map(baby => baby.id), ["baby-a", "baby-b"]));

test("a meal created for baby A is invisible in baby B's query", () => {
  const records = [makeScopedRecord({ id: "meal-a" }, family, babies[0], "user-a")];
  assert.equal(recordsForBaby(records, family.id, babies[1].id).length, 0);
});

test("switching baby updates the selected dataset", () => {
  const records = [makeScopedRecord({ id: "meal-a" }, family, babies[0], "user-a"), makeScopedRecord({ id: "meal-b" }, family, babies[1], "user-a")];
  assert.deepEqual(recordsForBaby(records, family.id, "baby-b").map(item => item.id), ["meal-b"]);
});

test("rapid twin records retain the baby selected at creation time", () => {
  const first = makeScopedRecord({ id: "one" }, family, babies[0], "user-a");
  const second = makeScopedRecord({ id: "two" }, family, babies[1], "user-a");
  assert.equal(first.baby_id, "baby-a");
  assert.equal(second.baby_id, "baby-b");
});

test("a baby from another family cannot be used for a write", () => {
  assert.throws(() => makeScopedRecord({}, family, { id: "outsider", family_id: "family-x" }, "user-a"), /invalid_baby_scope/);
});

test("family invite codes survive spaces, lowercase and copied separators", () => {
  assert.equal(normalizeInviteCode("a1b2 c3d4-e5f6"), "A1B2C3D4E5F6");
  assert.equal(formatInviteCode("a1b2c3d4e5f6"), "A1B2-C3D4-E5F6");
  assert.equal(normalizeInviteCode("A1B2-C3D4-E5F6-extra"), "A1B2C3D4E5F6");
});
