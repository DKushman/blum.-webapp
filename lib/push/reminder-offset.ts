export type ReminderOffset = "30m" | "1h" | "1d";

export const REMINDER_OFFSET_LABELS: Record<ReminderOffset, string> = {
  "30m": "30 Minuten vorher",
  "1h": "1 Stunde vorher",
  "1d": "1 Tag vorher",
};

const OFFSET_MS: Record<ReminderOffset, number> = {
  "30m": 30 * 60 * 1000,
  "1h": 60 * 60 * 1000,
  "1d": 24 * 60 * 60 * 1000,
};

export function applyReminderOffset(
  remindAtIso: string,
  offset: ReminderOffset
): string {
  const base = new Date(remindAtIso).getTime();
  return new Date(base - OFFSET_MS[offset]).toISOString();
}

export function getReminderOffsetLabel(offset?: ReminderOffset): string {
  if (!offset) return REMINDER_OFFSET_LABELS["30m"];
  return REMINDER_OFFSET_LABELS[offset];
}
