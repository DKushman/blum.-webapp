export type ReminderOffset = "15m" | "30m" | "1h" | "1d";

export const REMINDER_OFFSET_OPTIONS: ReminderOffset[] = [
  "15m",
  "30m",
  "1h",
  "1d",
];

export const REMINDER_OFFSET_LABELS: Record<ReminderOffset, string> = {
  "15m": "15 Minuten vorher",
  "30m": "30 Minuten vorher",
  "1h": "1 Stunde vorher",
  "1d": "1 Tag vorher",
};

export const REMINDER_OFFSET_SHORT: Record<ReminderOffset, string> = {
  "15m": "15 Min",
  "30m": "30 Min",
  "1h": "1 Std",
  "1d": "1 Tag",
};

const OFFSET_MS: Record<ReminderOffset, number> = {
  "15m": 15 * 60 * 1000,
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

export function normalizeReminderOffset(
  offset?: string
): ReminderOffset {
  if (offset === "15m" || offset === "30m" || offset === "1h" || offset === "1d") {
    return offset;
  }
  return "30m";
}
