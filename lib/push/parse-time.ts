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

export function getRemindAtIso(date: string, time?: string): string | null {
  const parsed = parseTodoTime(time);
  if (!parsed) return null;

  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return null;

  const remindAt = new Date(
    year,
    month - 1,
    day,
    parsed.hour,
    parsed.minute,
    0,
    0
  );

  return remindAt.toISOString();
}
