import { getRemindAtIso } from "@/lib/push/parse-time";

export function buildReminderAt(
  date: string,
  reminderTime: string
): string | null {
  return getRemindAtIso(date, reminderTime);
}
