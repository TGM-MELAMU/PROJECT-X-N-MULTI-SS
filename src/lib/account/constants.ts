/** Shared by server and browser code, so it must not import anything server-only. */
export const PROVINCES = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal", "Limpopo",
  "Mpumalanga", "Northern Cape", "North West", "Western Cape",
] as const;

export const MAX_ADDRESSES = 10;
