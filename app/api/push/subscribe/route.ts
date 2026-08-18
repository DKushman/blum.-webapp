import { NextResponse } from "next/server";

import { getRedis, REDIS_KEYS } from "@/lib/redis";
import type { PushSubscriptionPayload } from "@/lib/push/types";

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

  let body: { deviceId?: string; subscription?: PushSubscriptionPayload };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Ungültige Anfrage" }, { status: 400 });
  }

  const { deviceId, subscription } = body;
  if (!deviceId || !subscription?.endpoint || !subscription?.keys) {
    return NextResponse.json(
      { error: "deviceId und subscription sind erforderlich" },
      { status: 400 }
    );
  }

  await redis.sadd(REDIS_KEYS.devices, deviceId);
  await redis.set(REDIS_KEYS.subscription(deviceId), subscription);

  return NextResponse.json({ ok: true });
}
