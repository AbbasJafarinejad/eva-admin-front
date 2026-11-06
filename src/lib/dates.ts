export function tehranDateString(date: Date) {
  // YYYY-MM-DD in Asia/Tehran (no DST guessing; rely on Intl)
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

