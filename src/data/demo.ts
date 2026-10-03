import type { Data, Profile } from "./types";
export const demoProfile: Profile = {
  ownerName: "Noor",
  currency: "KES",
  demoBusiness: true,
  name: "Noor's Coffee Farm",
  experience: "Coffee farm tour",
  language: "English",
  visitors: "English, French, Kiswahili",
  price: 1500,
  duration: 90,
  capacity: 8,
  hours: "Mon–Sat · 10:00, 14:00, 16:30",
};
export function demoData(): Data {
  const day = (offset: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
  return {
    profile: null,
    replies: [],
    messages: [
      {
        id: "m1",
        guest: "Camille Laurent",
        language: "French",
        text: "Bonjour ! Nous sommes quatre. Peut-on visiter votre ferme demain à 14 h ?",
        unread: true,
        demo: true,
      },
      {
        id: "m2",
        guest: "Daniel Brooks",
        language: "English",
        text: "Hi Noor! How much is the coffee tour per person? Can children join?",
        unread: true,
        demo: true,
      },
      {
        id: "m3",
        guest: "Amina Hassan",
        language: "Kiswahili",
        text: "Habari! Shamba lenu liko wapi? Tunaweza kufika kwa basi?",
        unread: true,
        demo: true,
      },
      {
        id: "m4",
        guest: "Lena Fischer",
        language: "German",
        text: "Ist die Tour barrierefrei? Mein Vater benutzt einen Rollstuhl.",
        unread: false,
        demo: true,
      },
    ],
    bookings: [
      {
        id: "b1",
        messageId: "m2",
        guest: "Daniel Brooks",
        date: day(0),
        time: "10:00",
        guests: 2,
        status: "confirmed",
        notes: "Interested in roasting and tasting.",
        demo: true,
      },
      {
        id: "b2",
        messageId: "m1",
        guest: "Camille Laurent",
        date: day(1),
        time: "14:00",
        guests: 4,
        status: "pending",
        notes: "French-speaking group. Confirm availability with the guest.",
        demo: true,
      },
      {
        id: "b3",
        messageId: "m3",
        guest: "Amina Hassan",
        date: day(2),
        time: "10:00",
        guests: 3,
        status: "confirmed",
        notes: "Needs public transport directions.",
        demo: true,
      },
    ],
    reviews: [
      {
        id: "r1",
        guest: "Maya",
        rating: 5,
        text: "Noor made the coffee tasting so special. We loved learning from a local grower.",
        theme: "tasting",
        demo: true,
      },
      {
        id: "r2",
        guest: "Jean",
        rating: 4,
        text: "A wonderful tour, but the turn from the main road was hard to find.",
        theme: "directions",
        demo: true,
      },
      {
        id: "r3",
        guest: "Peter",
        rating: 4,
        text: "Great coffee! A sign by the bus stop would make arrival easier.",
        theme: "directions",
        demo: true,
      },
      {
        id: "r4",
        guest: "Zawadi",
        rating: 5,
        text: "The tasting and stories about growing coffee were the highlight of our visit.",
        theme: "tasting",
        demo: true,
      },
    ],
  };
}
