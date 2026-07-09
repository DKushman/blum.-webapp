import { NextResponse } from "next/server";

import { getRedis } from "@/lib/redis";
import { processDueRemindersForDevice } from "@/lib/push/dispatch";

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

  const result = await processDueRemindersForDevice(deviceId);
  return NextResponse.json({ ok: true, ...result });
}
