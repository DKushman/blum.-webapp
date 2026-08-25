/** App-Zeitzone für Erinnerungen (Wanduhr-Zeit → UTC). */
export const APP_TIMEZONE = "Europe/Berlin";

export function parseTodoTime(
  time?: string
): { hour: number; minute: number } | null {
  if (!time) return null;

  const colonMatch = time.match(/^(\d{1,2}):(\d{2})/);
  if (colonMatch) {
    return {
      hour: Number(colonMatch[1]),
      minute: Number(colonMatch[2]),
    };
  }

  const uhrMatch = time.match(/(\d{1,2})\s*Uhr/i);
  if (uhrMatch) {
    return { hour: Number(uhrMatch[1]), minute: 0 };
  }

  return null;
}

/**
 * Wanduhr-Zeit in Europe/Berlin → UTC-ISO.
 * So kommt die Push exakt um die gewählte Uhrzeit am gewählten Tag
 * (unabhängig von Server-Zeitzone / UTC auf Vercel).
 */
export function getRemindAtIso(date: string, time?: string): string | null {
  const parsed = parseTodoTime(time);
  if (!parsed) return null;

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;
  if (parsed.hour < 0 || parsed.hour > 23 || parsed.minute < 0 || parsed.minute > 59) {
    return null;
  }

  const pad = (n: number) => String(n).padStart(2, "0");
  const wall = `${year}-${pad(month)}-${pad(day)}T${pad(parsed.hour)}:${pad(parsed.minute)}:00`;

  // Start: Wall-Zeit als UTC interpretieren, dann auf Berlin korrigieren
  let guess = Date.parse(`${wall}Z`);
  if (Number.isNaN(guess)) return null;

  const targetAsUtcParts = Date.UTC(
    year,
    month - 1,
    day,
    parsed.hour,
    parsed.minute,
    0
  );

  for (let i = 0; i < 4; i++) {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: APP_TIMEZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));

    const get = (type: string) =>
      Number(parts.find((p) => p.type === type)?.value ?? "0");

    let hour = get("hour");
    if (hour === 24) hour = 0;

    const berlinAsUtcParts = Date.UTC(
      get("year"),
      get("month") - 1,
      get("day"),
      hour,
      get("minute"),
      get("second")
    );

    const diff = targetAsUtcParts - berlinAsUtcParts;
    if (diff === 0) break;
    guess += diff;
  }

  return new Date(guess).toISOString();
}
