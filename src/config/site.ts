/**
 * Site-wide constants. Values marked TODO are PLACEHOLDERS lifted from the wireframe:
 * replace them with the client's real details before launch.
 */
export const site = {
  name: "MultiSS",
  legalName: "Multi Success Supplies (Pty) Ltd",
  tagline: "Multi Success Supplies",
  description:
    "Laboratory and medical equipment, consumables, chemicals and reagents for professionals who care about precision.",
  contact: {
    address: "123 Laboratory Road, Sandton, 2196", // TODO real address
    phone: "+27 11 000 0000", // TODO
    email: "info@multiss.co.za", // TODO
    hours: "Mon–Fri 08:00–17:00", // TODO
  },
  trust: ["Quality products", "Fast delivery", "Secure payments", "Excellent support"],
  /** While true, legal and policy pages show a "draft" notice. Set to false once MultiSS approves the wording. */
  legalDraft: true,
} as const;

/** Order matters: it drives the category rail, the grid and the footer. */
export const categories = [
  { name: "Laboratory Equipment", slug: "laboratory-equipment", icon: "microscope" },
  { name: "Medical Equipment", slug: "medical-equipment", icon: "stethoscope" },
  { name: "Chemicals & Reagents", slug: "chemicals-reagents", icon: "flask" },
  { name: "Consumables", slug: "consumables", icon: "pipette" },
  { name: "Safety & Protection", slug: "safety-protection", icon: "shield" },
  { name: "Glassware", slug: "glassware", icon: "beaker" },
  { name: "Furniture", slug: "furniture", icon: "armchair" },
  { name: "Special Offers", slug: "special-offers", icon: "tag" },
] as const;

export type CategoryIconName = (typeof categories)[number]["icon"];

export const mainNav = [
  { label: "Home", href: "/" },
  { label: "Shop", href: "/shop" },
  { label: "Deals", href: "/shop?category=special-offers" },
  { label: "About us", href: "/about" },
  { label: "Contact us", href: "/contact" },
] as const;
