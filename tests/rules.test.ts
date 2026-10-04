import test from "node:test";
import assert from "node:assert/strict";
import { approveReply, validateBooking } from "../src/data/rules.ts";
import type { Booking, Data } from "../src/data/types.ts";
const booking: Booking = {
  id: "b",
  messageId: "m",
  guest: "Test",
  date: "2026-10-04",
  time: "14:00",
  guests: 4,
  status: "confirmed",
  notes: "",
  demo: true,
};
test("capacity includes other confirmed guests in the same slot", () => {
  assert.match(
    validateBooking(booking, [{ ...booking, id: "other", guests: 5 }], 8)!,
    /capacity/,
  );
  assert.equal(
    validateBooking(
      booking,
      [{ ...booking, id: "other", status: "pending", guests: 5 }],
      8,
    ),
    null,
  );
});
test("invalid dates, times and fractional guests are rejected", () => {
  for (const patch of [
    { date: "2026-02-30" },
    { time: "25:00" },
    { guests: 1.5 },
    { guests: 0 },
  ])
    assert.ok(validateBooking({ ...booking, ...patch }, [], 8));
});
const data: Data = {
  profile: null,
  messages: [
    {
      id: "m",
      guest: "Test",
      text: "Hello",
      language: "English",
      unread: true,
      demo: true,
    },
  ],
  bookings: [],
  reviews: [],
  replies: [],
};
test("approval queues a reply and never marks it sent", () => {
  const next = approveReply(data, "m", " Welcome! ");
  assert.equal(next.replies[0].status, "queued");
  assert.equal(next.replies[0].text, "Welcome!");
  assert.equal(next.messages[0].unread, false);
  assert.equal(data.replies.length, 0);
  assert.throws(() => approveReply(next, "m", "duplicate"));
});
test("empty replies and missing messages cannot be approved", () => {
  assert.throws(() => approveReply(data, "m", " "));
  assert.throws(() => approveReply(data, "unknown", "Hi"));
});
