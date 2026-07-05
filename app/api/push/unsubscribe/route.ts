import { NextResponse } from "next/server";

import { getRedis, REDIS_KEYS } from "@/lib/redis";

export async function POST(request: Request) {
  const redis = getRedis();
  if (!redis) {
    return NextResponse.json({ error: "Redis nicht konfiguriert" }, { status: 503 });
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

  await redis.del(REDIS_KEYS.subscription(deviceId));
  await redis.del(REDIS_KEYS.reminders(deviceId));
  await redis.srem(REDIS_KEYS.devices, deviceId);

  return NextResponse.json({ ok: true });
}
