import { NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";

import { getRedis, REDIS_KEYS } from "@/lib/redis";
import type { ReminderPayload } from "@/lib/push/types";
import {
  dispatchReminder,
  processDueRemindersForDevice,
} from "@/lib/push/dispatch";
import { getAppUrl } from "@/lib/qstash";

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

  const receiver = new Receiver({
    currentSigningKey: current,
    nextSigningKey: next,
  });

  // Mehrere URL-Varianten: Redirects / Custom Domain / Production-URL
  // dürfen die Signatur-Prüfung nicht killen.
  const appUrl = getAppUrl();
  const urlCandidates = Array.from(
    new Set(
      [
        `${appUrl}/api/cron/reminders`,
        request.url,
        process.env.VERCEL_URL
          ? `https://${process.env.VERCEL_URL}/api/cron/reminders`
          : null,
        "https://blum-one.vercel.app/api/cron/reminders",
      ].filter(Boolean) as string[]
    )
  );

  let verified = false;
  for (const url of urlCandidates) {
    try {
      await receiver.verify({ signature, body, url });
      verified = true;
      break;
    } catch {
      /* try next */
    }
  }

  // Letzter Fallback: ohne URL prüfen (manche QStash-Setups)
  if (!verified) {
    try {
      await receiver.verify({ signature, body });
      verified = true;
    } catch {
      return null;
    }
  }

  try {
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
  const deviceIds = (await redis.smembers(REDIS_KEYS.devices)) as string[];
  let sent = 0;
  let checked = 0;

  for (const deviceId of deviceIds) {
    const result = await processDueRemindersForDevice(deviceId, now);
    checked += result.checked;
    sent += result.sent;
  }

  return NextResponse.json({ ok: true, checked, sent, devices: deviceIds.length });
}
