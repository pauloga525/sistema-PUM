const ECT = "America/Guayaquil";

export function formatDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("es-EC", {
    timeZone: ECT,
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

export function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-EC", {
    timeZone: ECT,
    day: "2-digit", month: "2-digit", year: "numeric",
  });
}
