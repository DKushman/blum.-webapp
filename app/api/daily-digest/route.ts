import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";

import { getAppUrl } from "@/lib/qstash";

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

  // Tägliche To-Do-Zusammenfassung ist deaktiviert — nur noch individuelle Erinnerungen.
  return NextResponse.json({ ok: true, sent: false, reason: "disabled" });
}
