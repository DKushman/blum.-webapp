import { getRemindAtIso } from "@/lib/push/parse-time";

/** Erinnerung = genau am To-Do-Tag zur gewählten Uhrzeit (Europe/Berlin). */
export function buildReminderAt(
  date: string,
  reminderTime: string
): string | null {
  return getRemindAtIso(date, reminderTime);
}
