"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { buildReminderAt } from "@/lib/push/build-reminder";
import type { ReminderPayload } from "@/lib/push/types";
import { getOrCreateDeviceId, urlBase64ToUint8Array } from "@/lib/push/device-id";

type TodoLike = {
  id: string;
  text: string;
  date: string;
  reminderEnabled?: boolean;
  reminderTime?: string;
  completed: boolean;
  completedOn?: string;
};

type PushStatus = "unsupported" | "default" | "granted" | "denied" | "loading";

const POLL_INTERVAL_MS = 30_000;
/** Lokale Fallback-Benachrichtigung: max. 1 Min vor Fälligkeit prüfen. */
const LOCAL_CHECK_MS = 15_000;

async function waitForServiceWorker() {
  if (!("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration("/sw.js");
  if (registration) return registration;
  await navigator.serviceWorker.register("/sw.js");
  return navigator.serviceWorker.ready;
}

function formatReminderBody(todo: TodoLike) {
  const [h, m] = (todo.reminderTime ?? "").split(":");
  const timeSuffix =
    h && m
      ? m === "00"
        ? `${Number(h)} Uhr`
        : `${h}:${m} Uhr`
      : null;
  return timeSuffix ? `${todo.text} · ${timeSuffix}` : todo.text;
}

function buildUpcomingReminders(nextTodos: TodoLike[], now = Date.now()) {
  const reminders: ReminderPayload[] = [];

  for (const todo of nextTodos) {
    if (todo.completed || !todo.reminderEnabled || !todo.reminderTime) continue;

    const remindAt = buildReminderAt(todo.date, todo.reminderTime);
    if (!remindAt) continue;

    // Vergangenheit > 2 Min: überspringen. Sonst (inkl. „gleich fällig“) syncen.
    if (new Date(remindAt).getTime() < now - 120_000) continue;

    reminders.push({
      todoId: todo.id,
      text: formatReminderBody(todo),
      remindAt,
    });
  }

  return reminders;
}

export function usePushNotifications(todos: TodoLike[]) {
  const [status, setStatus] = useState<PushStatus>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localFiredRef = useRef<Set<string>>(new Set());
  const todosRef = useRef(todos);
  todosRef.current = todos;

  const pollDueReminders = useCallback(async () => {
    if (Notification.permission !== "granted") return;

    const deviceId = getOrCreateDeviceId();
    try {
      await fetch("/api/reminders/poll", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
    } catch {
      /* offline */
    }
  }, []);

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

    waitForServiceWorker()
      .then((registration) =>
        registration?.pushManager.getSubscription()
      )
      .then((sub) => setIsSubscribed(Boolean(sub)))
      .catch(() => setIsSubscribed(false));
  }, []);

  const syncReminders = useCallback(async (nextTodos: TodoLike[]) => {
    if (Notification.permission !== "granted") return;

    const deviceId = getOrCreateDeviceId();
    const reminders = buildUpcomingReminders(nextTodos);

    const response = await fetch("/api/todos/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        deviceId,
        reminders,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as {
      error?: string;
      scheduled?: number;
      count?: number;
    };

    if (!response.ok) {
      setSyncStatus(data.error ?? "Erinnerungen konnten nicht synchronisiert werden.");
      return;
    }

    setSyncStatus(
      reminders.length > 0
        ? `${reminders.length} Erinnerung(en) geplant${
            typeof data.scheduled === "number" ? ` · ${data.scheduled} per Push` : ""
          }`
        : null
    );
  }, []);

  useEffect(() => {
    if (!isSubscribed) return;

    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      syncReminders(todos).catch(() => {
        setSyncStatus("Sync fehlgeschlagen — bitte Verbindung prüfen.");
      });
    }, 400);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [todos, isSubscribed, syncReminders]);

  useEffect(() => {
    if (!isSubscribed) return;

    void pollDueReminders();
    pollIntervalRef.current = setInterval(() => {
      void pollDueReminders();
    }, POLL_INTERVAL_MS);

    const onVisible = () => {
      if (document.visibilityState === "visible") void pollDueReminders();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [isSubscribed, pollDueReminders]);

  // Lokaler Fallback: wenn die App offen ist, zur exakten Uhrzeit benachrichtigen
  // (ergänzt QStash, falls Push verzögert oder iOS die Push drosselt).
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (Notification.permission !== "granted") return;

    const tick = async () => {
      const now = Date.now();
      for (const todo of todosRef.current) {
        if (todo.completed || !todo.reminderEnabled || !todo.reminderTime) continue;
        const remindAt = buildReminderAt(todo.date, todo.reminderTime);
        if (!remindAt) continue;
        const at = new Date(remindAt).getTime();
        const key = `${todo.id}:${remindAt}`;
        if (localFiredRef.current.has(key)) continue;
        // Fenster: 0–90 Sekunden nach Fälligkeit
        if (now < at || now - at > 90_000) continue;

        localFiredRef.current.add(key);
        try {
          const registration = await waitForServiceWorker();
          const body = formatReminderBody(todo);
          if (registration?.showNotification) {
            await registration.showNotification("David von Blume", {
              body,
              icon: "/icons/icon-192.png",
              badge: "/icons/icon-192.png",
              tag: key,
              data: { url: "/" },
            });
          } else {
            new Notification("David von Blume", { body, tag: key });
          }
        } catch {
          /* ignore */
        }
      }
    };

    void tick();
    const id = setInterval(() => {
      void tick();
    }, LOCAL_CHECK_MS);
    return () => clearInterval(id);
  }, [todos, isSubscribed, status]);

  const subscribe = useCallback(async () => {
    setError(null);
    setSyncStatus(null);
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

      const registration = await waitForServiceWorker();
      if (!registration) throw new Error("Service Worker nicht verfügbar");

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
      await pollDueReminders();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unbekannter Fehler");
      setStatus(Notification.permission as PushStatus);
      return false;
    }
  }, [syncReminders, todos, pollDueReminders]);

  const unsubscribe = useCallback(async () => {
    setError(null);
    setSyncStatus(null);
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
    syncStatus,
    subscribe,
    unsubscribe,
    canUsePush: status !== "unsupported",
  };
}
