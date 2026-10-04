import test from "node:test";
import assert from "node:assert/strict";
import {
  emptyData,
  emptyProfile,
  finishSetup,
  isDemoProfile,
} from "../src/data/profile.ts";
import { demoData, demoProfile } from "../src/data/demo.ts";
test("new Lauda workspaces are empty and do not impersonate the demo business", () => {
  const data = emptyData();
  assert.equal(data.profile, null);
  assert.equal(data.messages.length, 0);
  assert.equal(data.reviews.length, 0);
  assert.equal(emptyProfile.name, "");
  assert.equal(isDemoProfile(emptyProfile), false);
});
test("generic business setup removes demo fixtures but preserves real records", () => {
  const demo = demoData();
  const real = { ...demo.messages[0], id: "real", demo: false };
  const next = finishSetup(
    { ...demo, messages: [...demo.messages, real] },
    {
      ...emptyProfile,
      name: "City Studio",
      experience: "Workshop",
      price: 30,
      currency: "EUR",
    },
  );
  assert.deepEqual(next.messages, [real]);
  assert.equal(next.bookings.length, 0);
  assert.equal(next.profile?.name, "City Studio");
  assert.equal(next.profile?.demoBusiness, false);
  assert.ok(demo.messages.length);
});
test("existing Noor profiles retain demo identification without requiring a data reset", () => {
  const { demoBusiness, ...legacy } = demoProfile;
  assert.equal(isDemoProfile(legacy), true);
  assert.equal(isDemoProfile({ ...legacy, name: "City Studio" }), false);
  assert.equal(isDemoProfile({ ...legacy, demoBusiness: false }), false);
});
