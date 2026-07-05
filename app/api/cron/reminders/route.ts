import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";

import { getRedis, REDIS_KEYS } from "@/lib/redis";
import type { PushSubscriptionPayload, ReminderPayload } from "@/lib/push/types";
import { sendPushNotification } from "@/lib/push/web-push-server";

const LOOKBACK_MS = 2 * 60 * 1000;

function isCronAuthorized(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== "production";

  const auth = request.headers.get("authorization");
  return auth === `Bearer ${cronSecret}`;
}

async function verifyQStash(
  request: Request
): Promise<{ deviceId: string; reminder: ReminderPayload } | null> {
  const current = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const next = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!current || !next) return null;

  const signature = request.headers.get("upstash-signature");
  const body = await request.text();
  if (!signature) return null;

  try {
    const receiver = new Receiver({
      currentSigningKey: current,
      nextSigningKey: next,
    });
    await receiver.verify({ signature, body, url: request.url });
    const parsed = JSON.parse(body) as {
      deviceId?: string;
      reminder?: ReminderPayload;
    };
    if (!parsed.deviceId || !parsed.reminder) return null;
    return { deviceId: parsed.deviceId, reminder: parsed.reminder };
  } catch {
    return null;
  }
}

async function dispatchReminder(deviceId: string, reminder: ReminderPayload) {
  const redis = getRedis();
  if (!redis) return false;

  const sentKey = REDIS_KEYS.sent(deviceId, reminder.todoId, reminder.remindAt);
  const alreadySent = await redis.get(sentKey);
  if (alreadySent) return false;

  const subscription = await redis.get<PushSubscriptionPayload>(
    REDIS_KEYS.subscription(deviceId)
  );
  if (!subscription) return false;

  await sendPushNotification(subscription, {
    title: "Blumè.",
    body: reminder.text,
    url: "/",
  });
  await redis.set(sentKey, "1", { ex: 60 * 60 * 25 });
  return true;
}

export async function POST(request: Request) {
  const payload = await verifyQStash(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sent = await dispatchReminder(payload.deviceId, payload.reminder);
  return NextResponse.json({ ok: true, sent });
}

export async function GET(request: Request) {
  if (!isCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: "Redis nicht konfiguriert" }, { status: 503 });
  }

  const now = Date.now();
  const windowStart = now - LOOKBACK_MS;

  const deviceIds = (await redis.smembers(REDIS_KEYS.devices)) as string[];
  let sent = 0;
  let checked = 0;

  for (const deviceId of deviceIds) {
    const [subscription, reminders] = await Promise.all([
      redis.get<PushSubscriptionPayload>(REDIS_KEYS.subscription(deviceId)),
      redis.get<ReminderPayload[]>(REDIS_KEYS.reminders(deviceId)),
    ]);

    if (!subscription || !reminders?.length) continue;

    for (const reminder of reminders) {
      checked += 1;
      const remindAtMs = new Date(reminder.remindAt).getTime();
      if (Number.isNaN(remindAtMs)) continue;
      if (remindAtMs > now || remindAtMs < windowStart) continue;

      const didSend = await dispatchReminder(deviceId, reminder);
      if (didSend) sent += 1;
    }
  }

  return NextResponse.json({ ok: true, checked, sent, devices: deviceIds.length });
}
