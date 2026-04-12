export default function formatPostDate(dateStr: string, locale = "en"): string {
  const date = new Date(dateStr + "Z");
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffSecs = Math.round(diffMs / 1000);
  const diffMins = Math.round(diffSecs / 60);
  const diffHours = Math.round(diffMins / 60);
  const diffDays = Math.round(diffHours / 24);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  if (Math.abs(diffSecs) < 60)  return rtf.format(diffSecs, "second");
  if (Math.abs(diffMins) < 60)  return rtf.format(diffMins, "minute");
  if (Math.abs(diffHours) < 24) return rtf.format(diffHours, "hour");
  if (Math.abs(diffDays) < 7)   return rtf.format(diffDays, "day");
  if (Math.abs(diffDays) < 30)  return rtf.format(Math.round(diffDays / 7), "week");
  if (Math.abs(diffDays) < 365) return rtf.format(Math.round(diffDays / 30), "month");
  return rtf.format(Math.round(diffDays / 365), "year");
}
