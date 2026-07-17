import test from "node:test";
import assert from "node:assert/strict";
import { foodEntryKey, mergeFoodSettings, sameSettings } from "../src/foodSettings.js";

const at = minute => `2026-07-18T10:${String(minute).padStart(2, "0")}:00.000Z`;

test("one parent's new food is not clobbered by the other's stale array", () => {
  const cloud = [{ name: "橄榄油", custom: true, updatedAt: at(10) }];
  const local = [{ name: "小米粥", custom: true, updatedAt: at(5) }];
  const merged = mergeFoodSettings(cloud, local);
  assert.deepEqual(merged.map(entry => entry.name).sort(), ["小米粥", "橄榄油"]);
});

test("same entry resolves to the newer side", () => {
  const cloud = [{ name: "橄榄油", custom: true, amount: "5克", updatedAt: at(10) }];
  const newer = [{ name: "橄榄油", custom: true, amount: "10克", updatedAt: at(20) }];
  assert.equal(mergeFoodSettings(cloud, newer)[0].amount, "10克");
  const older = [{ name: "橄榄油", custom: true, amount: "10克", updatedAt: at(1) }];
  assert.equal(mergeFoodSettings(cloud, older)[0].amount, "5克");
});

test("legacy entries without updatedAt lose to stamped ones, cloud wins ties", () => {
  const cloud = [{ name: "橄榄油", custom: true, amount: "5克" }];
  const stamped = [{ name: "橄榄油", custom: true, amount: "10克", updatedAt: at(1) }];
  assert.equal(mergeFoodSettings(cloud, stamped)[0].amount, "10克");
  const legacy = [{ name: "橄榄油", custom: true, amount: "10克" }];
  assert.equal(mergeFoodSettings(cloud, legacy)[0].amount, "5克");
});

test("newer delete tombstone wins so deletions do not resurrect", () => {
  const cloud = [{ name: "橄榄油", custom: true, updatedAt: at(10) }];
  const local = [{ name: "橄榄油", custom: true, deleted: true, updatedAt: at(20) }];
  const merged = mergeFoodSettings(cloud, local);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].deleted, true);
});

test("builtin edits keyed by baseName do not collide with custom foods", () => {
  assert.notEqual(
    foodEntryKey({ name: "橄榄油", custom: true }),
    foodEntryKey({ baseName: "橄榄油", name: "橄榄油", custom: false }),
  );
});

test("sameSettings is order independent", () => {
  const a = [{ name: "A", custom: true, updatedAt: at(1) }, { name: "B", custom: true, updatedAt: at(2) }];
  const b = [a[1], a[0]];
  assert.equal(sameSettings(a, b), true);
  assert.equal(sameSettings(a, [a[0]]), false);
});
