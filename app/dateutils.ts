// --- Date helpers: parse and format consistently across components ---
export function parseDate(s: any): Date | null {
  if (!s) return null;
  try {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  } catch (e) {
    return null;
  }
}

export function ordinalSuffix(n: number) {
  const j = n % 10;
  const k = n % 100;
  if (j === 1 && k !== 11) return `${n}st`;
  if (j === 2 && k !== 12) return `${n}nd`;
  if (j === 3 && k !== 13) return `${n}rd`;
  return `${n}th`;
}

/**
 * Format a Date as: "12th September 2205 4:05 PM"
 * If includeYear is false, the year is omitted: "12th September 4:05 PM"
 */
export  function formatDateTimeNice(d: Date, includeYear = true) {
  const day = ordinalSuffix(d.getDate());
  // Use English month long name to match example
  const month = d.toLocaleString("en-GB", { month: "short" });
  const year = d.getFullYear();
  const hour24 = d.getHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hour24 >= 12 ? "PM" : "AM";
  return includeYear
    ? `${day} ${month} ${year} ${hour12}:${minutes} ${ampm}`
    : `${day} ${month} ${hour12}:${minutes} ${ampm}`;
}

export  function formatTimeOnly(d: Date) {
  const hour24 = d.getHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hour24 >= 12 ? "PM" : "AM";
  return `${hour12}:${minutes} ${ampm}`;
}