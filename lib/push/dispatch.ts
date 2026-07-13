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

  // Prüfen, ob diese Erinnerung noch aktuell ist. QStash kann für dieselbe
  // Aufgabe mehrere (auch veraltete) Jobs eingeplant haben — nur die, die noch
  // in der aktuellen Liste steht, darf feuern.
  const reminders = await redis.get<ReminderPayload[]>(
    REDIS_KEYS.reminders(deviceId)
  );
  const stillValid = reminders?.some(
    (r) => r.todoId === reminder.todoId && r.remindAt === reminder.remindAt
  );
  if (!stillValid) return false;

  // Atomar reservieren: nur der erste gleichzeitige Zusteller gewinnt und sendet.
  // Verhindert die 20 Doppel-Benachrichtigungen durch parallele QStash-/Poll-Zustellungen.
  const sentKey = REDIS_KEYS.sent(deviceId, reminder.todoId, reminder.remindAt);
  const reserved = await redis.set(sentKey, "1", { nx: true, ex: 60 * 60 * 25 });
  if (reserved !== "OK") return false;

  const subscription = await redis.get<PushSubscriptionPayload>(
    REDIS_KEYS.subscription(deviceId)
  );
  if (!subscription) {
    // Reservierung freigeben, damit ein späterer Versuch mit gültiger Subscription senden kann.
    await redis.del(sentKey);
    return false;
  }

  try {
    await sendPushNotification(subscription, {
      title: "David von Blume",
      body: reminder.text,
      url: "/",
    });
  } catch (error) {
    await redis.del(sentKey);
    throw error;
  }
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
