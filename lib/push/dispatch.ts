import { NextResponse } from "next/server";

import { getRedis, REDIS_KEYS } from "@/lib/redis";
import type { PushSubscriptionPayload, ReminderPayload } from "@/lib/push/types";
import { sendPushNotification } from "@/lib/push/web-push-server";

const LOOKBACK_MS = 2 * 60 * 1000;

export async function dispatchReminder(
  deviceId: string,
  reminder: ReminderPayload
) {
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

export async function processDueRemindersForDevice(
  deviceId: string,
  now = Date.now()
) {
  const redis = getRedis();
  if (!redis) return { checked: 0, sent: 0 };

  const reminders = await redis.get<ReminderPayload[]>(
    REDIS_KEYS.reminders(deviceId)
  );
  if (!reminders?.length) return { checked: 0, sent: 0 };

  const windowStart = now - LOOKBACK_MS;
  let sent = 0;
  let checked = 0;

  for (const reminder of reminders) {
    checked += 1;
    const remindAtMs = new Date(reminder.remindAt).getTime();
    if (Number.isNaN(remindAtMs)) continue;
    if (remindAtMs > now || remindAtMs < windowStart) continue;

    const didSend = await dispatchReminder(deviceId, reminder);
    if (didSend) sent += 1;
  }

  return { checked, sent };
}
