import { Client } from "@upstash/qstash";

import type { ReminderPayload } from "@/lib/push/types";

export function getQStashClient(): Client | null {
  const token = process.env.QSTASH_TOKEN;
  if (!token) return null;
  return new Client({ token });
}

export function getAppUrl() {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "https://blum-one.vercel.app";
}

export async function scheduleReminders(
  deviceId: string,
  reminders: ReminderPayload[]
) {
  const client = getQStashClient();
  if (!client) return 0;

  const dispatchUrl = `${getAppUrl()}/api/cron/reminders`;
  let scheduled = 0;

  for (const reminder of reminders) {
    const remindAtMs = new Date(reminder.remindAt).getTime();
    if (Number.isNaN(remindAtMs) || remindAtMs <= Date.now()) continue;

    await client.publishJSON({
      url: dispatchUrl,
      body: { deviceId, reminder },
      notBefore: Math.floor(remindAtMs / 1000),
    });
    scheduled += 1;
  }

  return scheduled;
}
