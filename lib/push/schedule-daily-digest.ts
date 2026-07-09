import { Client } from "@upstash/qstash";

import { getQStashClient, getAppUrl } from "@/lib/qstash";
import { getRedis, REDIS_KEYS } from "@/lib/redis";

export async function ensureDailyDigestSchedule(deviceId: string) {
  const redis = getRedis();
  const client = getQStashClient();
  if (!redis || !client) return false;

  const existing = await redis.get<string>(REDIS_KEYS.dailyDigestSchedule(deviceId));
  if (existing) return true;

  try {
    const schedule = await client.schedules.create({
      destination: `${getAppUrl()}/api/daily-digest`,
      cron: "0 9 * * *",
      body: JSON.stringify({ deviceId }),
      headers: { "Content-Type": "application/json" },
      cronTz: "Europe/Berlin",
    } as Parameters<Client["schedules"]["create"]>[0]);

    await redis.set(REDIS_KEYS.dailyDigestSchedule(deviceId), schedule.scheduleId);
    return true;
  } catch (error) {
    console.error("Daily digest schedule failed:", deviceId, error);
    return false;
  }
}
