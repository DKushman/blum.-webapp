import { NextResponse } from "next/server";

import { getRedis, REDIS_KEYS } from "@/lib/redis";
import type { PushSubscriptionPayload } from "@/lib/push/types";
import { sendPushNotification } from "@/lib/push/web-push-server";

/** Sofort-Test: sendet eine Push an das Gerät (ohne Reminder-Logik). */
export async function POST(request: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json(
      { error: "Redis ist nicht konfiguriert." },
      { status: 503 }
    );
  }

  let body: { deviceId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { deviceId } = body;
  if (!deviceId) {
    return NextResponse.json({ error: "deviceId fehlt" }, { status: 400 });
  }

  const subscription = await redis.get<PushSubscriptionPayload>(
    REDIS_KEYS.subscription(deviceId)
  );
  if (!subscription) {
    return NextResponse.json(
      {
        error:
          "Keine Push-Subscription gespeichert. Bitte Benachrichtigungen erneut aktivieren.",
      },
      { status: 404 }
    );
  }

  try {
    await sendPushNotification(subscription, {
      title: "David von Blume",
      body: "Test OK — Push funktioniert auf diesem Gerät.",
      url: "/",
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Push konnte nicht gesendet werden";
    console.error("Test push failed:", message);
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
