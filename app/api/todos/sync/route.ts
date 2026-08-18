import { NextResponse } from "next/server";

import { getRedis, REDIS_KEYS } from "@/lib/redis";
import type { ReminderPayload } from "@/lib/push/types";
import { scheduleReminders } from "@/lib/qstash";

export async function POST(request: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      {
        error:
          "Redis ist nicht konfiguriert. Bitte Upstash Redis in Vercel verbinden.",
      },
      { status: 503 }
    );
  }

  let body: {
    deviceId?: string;
    reminders?: ReminderPayload[];
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { deviceId, reminders } = body;
  if (!deviceId || !Array.isArray(reminders)) {
    return NextResponse.json(
      { error: "deviceId und reminders sind erforderlich" },
      { status: 400 }
    );
  }

  await redis.sadd(REDIS_KEYS.devices, deviceId);
  await redis.set(REDIS_KEYS.reminders(deviceId), reminders);

  let scheduled = 0;
  try {
    scheduled = await scheduleReminders(deviceId, reminders);
  } catch (error) {
    console.error("QStash scheduling failed:", error);
  }

  return NextResponse.json({ ok: true, count: reminders.length, scheduled });
}
