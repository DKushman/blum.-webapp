import { applyReminderOffset, type ReminderOffset } from "@/lib/push/reminder-offset";
import { getRemindAtIso } from "@/lib/push/parse-time";

export function buildReminderAt(
  date: string,
  reminderTime: string,
  offset: ReminderOffset = "30m"
): string | null {
  const base = getRemindAtIso(date, reminderTime);
  if (!base) return null;
  return applyReminderOffset(base, offset);
}
