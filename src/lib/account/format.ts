const date = new Intl.DateTimeFormat("en-ZA", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Johannesburg" });

export function formatDate(value: Date | null | undefined): string {
  return value ? date.format(value) : "";
}
