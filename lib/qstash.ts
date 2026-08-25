import { Client } from "@upstash/qstash";

import type { ReminderPayload } from "@/lib/push/types";

const PRODUCTION_APP_URL = "https://blum-one.vercel.app";
/** QStash Hobby: max. 7 Tage in die Zukunft planbar */
const MAX_QSTASH_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

export function getAppUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  return PRODUCTION_APP_URL;
}

export function getQStashClient(): Client | null {
  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;
  return new Client({ token });
}

export async function scheduleReminders(
  deviceId: string,
  reminders: ReminderPayload[]
) {
  const client = getQStashClient();
  if (!client) {
    console.warn("QStash nicht konfiguriert — Erinnerungen nur per Poll/Lokal.");
    return 0;
  }

  const dispatchUrl = `${getAppUrl()}/api/cron/reminders`;
  const now = Date.now();
  const maxScheduleAt = now + MAX_QSTASH_DELAY_MS;
  let scheduled = 0;

  for (const reminder of reminders) {
    const remindAtMs = new Date(reminder.remindAt).getTime();
    if (Number.isNaN(remindAtMs)) continue;
    // Schon vorbei: nicht mehr planen (Poll/Lokal übernimmt nahe Fälligkeit)
    if (remindAtMs <= now - 5_000) continue;
    // QStash Hobby: max. 7 Tage voraus
    if (remindAtMs > maxScheduleAt) continue;

    // notBefore: mind. „jetzt“, damit QStash sehr nahe Erinnerungen sofort akzeptiert
    const notBefore = Math.max(Math.floor(now / 1000), Math.floor(remindAtMs / 1000));

    try {
      await client.publishJSON({
        url: dispatchUrl,
        body: { deviceId, reminder },
        notBefore,
        // Verhindert doppelte Einplanungen für dieselbe Aufgabe+Uhrzeit
        deduplicationId: `${deviceId}:${reminder.todoId}:${reminder.remindAt}`,
      });
      scheduled += 1;
    } catch (error) {
      console.error("QStash publish failed:", reminder.todoId, error);
    }
  }

  return scheduled;
}
