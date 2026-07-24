export type Agent = {
  id: string;
  name: string;
  phone: string;
  email: string;
  languages: string[];
  photoUrl?: string;
};

// Mirrors the `agents` table in Supabase. Seed this table directly in
// production; this file is a typed fallback/reference used for local dev.
export const AGENTS: Agent[] = [
  {
    id: "jimmy-saint-hillaire",
    name: "Jimmy Saint Hillaire",
    phone: "(239) 235-1022",
    email: "Agency@blancsins.com",
    languages: ["English", "Kreyòl"],
  },
  {
    id: "odessa-skinner",
    name: "Odessa Skinner",
    phone: "(239) 878-8577",
    email: "Odessa@blancsins.com",
    languages: ["English"],
  },
  {
    id: "sylvia-chacon",
    name: "Sylvia Chacon",
    phone: "(239) 391-7828",
    email: "Sylvia@blancsins.com",
    languages: ["English", "Español"],
  },
  {
    id: "sergio-alvarez",
    name: "Sergio Alvarez",
    phone: "(239) 416-2884",
    email: "SergioAlvarez@blancsins.com",
    languages: ["English", "Español"],
  },
  {
    id: "delwin-thermitus",
    name: "Delwin Thermitus",
    phone: "(863) 612-6690",
    email: "Delwin@blancsins.com",
    languages: ["English", "Kreyòl"],
  },
];

export const OFFICE = {
  phone: "(239) 300-3830",
  email: "Agency@blancsins.com",
  hours: [
    { day: "Monday", value: "9:00 AM – 5:00 PM" },
    { day: "Tuesday", value: "9:00 AM – 5:00 PM" },
    { day: "Wednesday", value: "9:00 AM – 5:00 PM" },
    { day: "Thursday", value: "9: