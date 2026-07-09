import { Redis } from "@upstash/redis";

let redis: Redis | null | undefined;

export function getRedis(): Redis | null {
  if (redis !== undefined) return redis;

  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    redis = null;
    return redis;
  }

  redis = new Redis({ url, token });
  return redis;
}

export const REDIS_KEYS = {
  devices: "blume:devices",
  subscription: (deviceId: string) => `blume:sub:${deviceId}`,
  reminders: (deviceId: string) => `blume:reminders:${deviceId}`,
  sent: (deviceId: string, todoId: string, remindAt: string) =>
    `blume:sent:${deviceId}:${todoId}:${remindAt}`,
  dailyDigestSchedule: (deviceId: string) => `blume:digest-schedule:${deviceId}`,
  dailyDigestTodos: (deviceId: string) => `blume:digest-todos:${deviceId}`,
  dailyDigestSent: (deviceId: string, date: string) =>
    `blume:digest-sent:${deviceId}:${date}`,
} as const;
