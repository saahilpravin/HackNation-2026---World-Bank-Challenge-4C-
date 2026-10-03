import type { Booking, Data } from "./types";
export function validateBooking(
  booking: Booking,
  all: Booking[],
  capacity: number,
): string | null {
  if (
    !Number.isInteger(booking.guests) ||
    booking.guests < 1 ||
    booking.guests > capacity
  )
    return `Participants must be between 1 and ${capacity}.`;
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(booking.date) ||
    Number.isNaN(Date.parse(booking.date)) ||
    new Date(booking.date).toISOString().slice(0, 10) !== booking.date
  )
    return "Use a valid date: YYYY-MM-DD.";
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(booking.time))
    return "Use a valid time: HH:mm.";
  const occupied = all
    .filter(
      (b) =>
        b.id !== booking.id &&
        b.date === booking.date &&
        b.time === booking.time &&
        b.status === "confirmed",
    )
    .reduce((n, b) => n + b.guests, 0);
  if (booking.status === "confirmed" && occupied + booking.guests > capacity)
    return "This time slot would exceed your guest capacity.";
  return null;
}
export function approveReply(
  data: Data,
  messageId: string,
  text: string,
): Data {
  const message = data.messages.find((m) => m.id === messageId);
  if (!message || !text.trim())
    throw new Error("A message and a non-empty reply are required.");
  if (data.replies.some((r) => r.messageId === messageId))
    throw new Error("A reply is already queued for this message.");
  return {
    ...data,
    messages: data.messages.map((m) =>
      m.id === messageId ? { ...m, unread: false } : m,
    ),
    replies: [
      ...data.replies,
      {
        id: `reply-${messageId}`,
        messageId,
        text: text.trim(),
        approvedAt: new Date().toISOString(),
        status: "queued",
        demo: message.demo,
      },
    ],
  };
}
