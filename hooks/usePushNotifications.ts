"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { getRemindAtIso } from "@/lib/push/parse-time";
import type { ReminderPayload } from "@/lib/push/types";
import { getOrCreateDeviceId, urlBase64ToUint8Array } from "@/lib/push/device-id";

type TodoLike = {
  id: string;
  text: string;
  date: string;
  time?: string;
  reminderEnabled?: boolean;
  reminderTime?: string;
  completed: boolean;
};

type PushStatus = "unsupported" | "default" | "granted" | "denied" | "loading";

export function usePushNotifications(todos: TodoLike[]) {
  const [status, setStatus] = useState<PushStatus>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const unsupported =
      !("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      !("Notification" in window);

    if (unsupported) {
      setStatus("unsupported");
      return;
    }

    setStatus(Notification.permission as PushStatus);

    navigator.serviceWorker.ready
      .then((registration) => registration.pushManager.getSubscription())
      .then((sub) => setIsSubscribed(Boolean(sub)))
      .catch(() => setIsSubscribed(false));
  }, []);

  const syncReminders = useCallback(async (nextTodos: TodoLike[]) => {
    if (Notification.permission !== "granted") return;

    const deviceId = getOrCreateDeviceId();
    const now = Date.now();
    const reminders: ReminderPayload[] = [];

    for (const todo of nextTodos) {
      if (todo.completed || !todo.reminderEnabled || !todo.reminderTime) continue;

      const remindAt = getRemindAtIso(todo.date, todo.reminderTime);
      if (!remindAt) continue;
      if (new Date(remindAt).getTime() < now - 60_000) continue;

      reminders.push({
        todoId: todo.id,
        text: todo.text,
        remindAt,
      });
    }

    await fetch("/api/todos/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deviceId, reminders }),
    });
  }, []);

  useEffect(() => {
    if (!isSubscribed) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncReminders(todos).catch(() => {
        /* offline / redis not configured */
      });
    }, 500);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [todos, isSubscribed, syncReminders]);

  const subscribe = useCallback(async () => {
    setError(null);
    setStatus("loading");

    const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      setError("Push ist noch nicht konfiguriert (VAPID-Key fehlt).");
      setStatus(Notification.permission as PushStatus);
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setStatus(permission as PushStatus);
      if (permission !== "granted") return false;

      const registration = await navigator.serviceWorker.ready;
      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        }));

      const json = subscription.toJSON();
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) {
        throw new Error("Ungültige Push-Subscription");
      }

      const deviceId = getOrCreateDeviceId();
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deviceId,
          subscription: {
            endpoint: json.endpoint,
            keys: {
              p256dh: json.keys.p256dh,
              auth: json.keys.auth,
            },
          },
        }),
      });

      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(data.error ?? "Subscription fehlgeschlagen");
      }

      setIsSubscribed(true);
      await syncReminders(todos);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setStatus(Notification.permission as PushStatus);
      return false;
    }
  }, [syncReminders, todos]);

  const unsubscribe = useCallback(async () => {
    setError(null);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) await subscription.unsubscribe();

      const deviceId = getOrCreateDeviceId();
      await fetch("/api/push/unsubscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });

      setIsSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Abmelden fehlgeschlagen");
    }
  }, []);

  return {
    status,
    isSubscribed,
    error,
    subscribe,
    unsubscribe,
    canUsePush: status !== "unsupported",
  };
}
