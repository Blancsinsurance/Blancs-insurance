export type Agent = {
  id: string; // uuid from Supabase agents table
  slug: string; // friendly id for URLs
  name: string;
  phone: string;
  email: string;
  languages: string[];
  photoUrl?: string;
};

// Mirrors the `agents` table in Supabase (id = real uuid).
export const AGENTS: Agent[] = [
  {
    id: "d72dc62e-250d-4a0a-aa90-73be64414aa7",
    slug: "jimmy-saint-hillaire",
    name: "Jimmy Saint Hillaire",
    phone: "(239) 235-1022",
    email: "Agency@blancsins.com",
    languages: ["English", "Kreyòl"],
  },
  {
    id: "63239919-d5f6-4f61-bd62-f7710c4dce43",
    slug: "odessa-skinner",
    name: "Odessa Skinner",
    phone: "(239) 878-8577",
    email: "Odessa@blancsins.com",
    languages: ["English"],
  },
  {
    id: "6de5e555-3466-475b-9ac0-f47cad1b429c",
    slug: "sylvia-chacon",
    name: "Sylvia Chacon",
    phone: "(239) 391-7828",
    email: "Sylvia@blancsins.com",
    languages: ["English", "Español"],
  },
  {
    id: "b6a53c58-13c0-4ef7-9751-71c456e8517a",
    slug: "sergio-alvarez",
    name: "Sergio Alvarez",
    phone: "(239) 416-2884",
    email: "SergioAlvarez@blancsins.com",
    languages: ["English", "Español"],
  },
  {
    id: "f2d7d423-36d5-47db-a9c6-7f22238095f9",
    slug: "delwin-thermitus",
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
    { day: "Monday", value: "9:00 AM - 5:00 PM" },
    { day: "Tuesday", value: "9:00 AM - 5:00 PM" },
    { day: "Wednesday", value: "9:00 AM - 5:00 PM" },
    { day: "Thursday", value: "9:00 AM - 5:00 PM" },
    { day: "Friday", value: "9:00 AM - 5:00 PM" },
    { day: "Saturday", value: "9:00 AM - 5:00 PM" },
    { day: "Sunday", value: "Closed" },
  ],
};

/** Resolve either a uuid or a legacy slug to the agent record. */
export function findAgent(idOrSlug: string | null | undefined): Agent | undefined {
  if (!idOrSlug) return undefined;
  return (
    AGENTS.find((a) => a.id === idOrSlug) ||
    AGENTS.find((a) => a.slug === idOrSlug)
  );
}

/** Match a signed-in user's email to an agent (case-insensitive). */
export function findAgentByEmail(email: string | null | undefined): Agent | undefined {
  if (!email) return undefined;
  const normalized = email.trim().toLowerCase();
  return AGENTS.find((a) => a.email.toLowerCase() === normalized);
}
