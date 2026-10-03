import type { Booking, Data } from "./types.ts";
import { validateBooking } from "./rules.ts";
export function recordBooking(data:Data, booking:Booking):Data {
 if(!data.profile) throw new Error("Set up your business first.");
 if(!booking.guest.trim()) throw new Error("Enter a guest or group name.");
 if(data.bookings.some(b=>b.id===booking.id)) throw new Error("This booking already exists.");
 const error=validateBooking(booking,data.bookings,data.profile.capacity);
 if(error) throw new Error(error);
 return {...data,bookings:[...data.bookings,{...booking,guest:booking.guest.trim()}]};
}
