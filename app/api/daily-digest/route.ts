import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";

import { getRedis, REDIS_KEYS } from "@/lib/redis";
import type { PushSubscriptionPayload } from "@/lib/push/types";
import {
  buildDailyDigestMessage,
  countOpenTodosForDate,
  type TodoDigestSnapshot,
} from "@/lib/push/daily-digest";
import { sendPushNotification } from "@/lib/push/web-push-server";
import { getAppUrl } from "@/lib/qstash";

function todayBerlin(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
  }).format(new Date());
}

async function verifyQStashDaily(
  request: Request
): Promise<{ deviceId: string } | null> {
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
    await receiver.verify({
      signature,
      body,
      url: `${getAppUrl()}/api/daily-digest`,
    });
    const parsed = JSON.parse(body) as { deviceId?: string };
    if (!parsed.deviceId) return null;
    return { deviceId: parsed.deviceId };
  } catch {
    return null;
  }
}

export async function POST(request: Request) {
  const payload = await verifyQStashDaily(request);
  if (!payload) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: "Redis nicht konfiguriert" }, { status: 503 });
  }

  const { deviceId } = payload;
  const dateStr = todayBerlin();
  const sentKey = REDIS_KEYS.dailyDigestSent(deviceId, dateStr);
  const alreadySent = await redis.get(sentKey);
  if (alreadySent) {
    return NextResponse.json({ ok: true, sent: false, reason: "already_sent" });
  }

  const subscription = await redis.get<PushSubscriptionPayload>(
    REDIS_KEYS.subscription(deviceId)
  );
  if (!subscription) {
    return NextResponse.json({ ok: true, sent: false, reason: "no_subscription" });
  }

  const todos =
    (await redis.get<TodoDigestSnapshot[]>(
      REDIS_KEYS.dailyDigestTodos(deviceId)
    )) ?? [];
  const count = countOpenTodosForDate(todos, dateStr);

  await sendPushNotification(subscription, {
    title: "Blumè.",
    body: buildDailyDigestMessage(count),
    url: "/",
  });

  await redis.set(sentKey, "1", { ex: 60 * 60 * 30 });

  return NextResponse.json({ ok: true, sent: true, count });
}
