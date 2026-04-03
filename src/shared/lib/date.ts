export default function formatPostDate(dateStr: string) {
  const normalized = dateStr.endsWith("Z") ? dateStr : dateStr + "Z";
  const date = new Date(normalized);
  const now = new Date();

  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);

  const isYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (isToday) {
    return (
      "Today, " +
      date.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    );
  }
  if (isYesterday)
    return (
      "Yesterday, " +
      date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
    );
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}
