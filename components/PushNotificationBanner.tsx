"use client";

type PushNotificationBannerProps = {
  status: "unsupported" | "default" | "granted" | "denied" | "loading";
  isSubscribed: boolean;
  error: string | null;
  syncStatus?: string | null;
  onSubscribe: () => void;
  onUnsubscribe: () => void;
  canUsePush: boolean;
};

export function PushNotificationBanner({
  status,
  isSubscribed,
  error,
  syncStatus,
  onSubscribe,
  onUnsubscribe,
  canUsePush,
}: PushNotificationBannerProps) {
  if (!canUsePush) return null;

  if (status === "denied") {
    return (
      <div
        role="status"
        className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
      >
        Benachrichtigungen sind blockiert. In den iPhone-Einstellungen unter
        „Mitteilungen“ für Blumè. erlauben.
      </div>
    );
  }

  if (isSubscribed) {
    return (
      <div
        role="status"
        className="mb-4 flex items-center justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
      >
        <span>
          Erinnerungen per Push sind aktiv.
          {syncStatus ? ` ${syncStatus}` : ''}
        </span>
        <button
          type="button"
          onClick={onUnsubscribe}
          className="shrink-0 rounded-lg px-2 py-1 text-xs font-medium text-emerald-800 underline-offset-2 hover:underline"
        >
          Aus
        </button>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-2xl border border-[#FFB6C1] bg-white px-4 py-3 shadow-sm">
      <p className="text-sm text-[#222222]">
        <strong className="font-semibold">Erinnerungen auf dem iPhone:</strong>{" "}
        App zum Home-Bildschirm hinzufügen, dann Benachrichtigungen aktivieren.
      </p>
      <button
        type="button"
        onClick={onSubscribe}
        disabled={status === "loading"}
        className="mt-3 w-full rounded-xl bg-[#222222] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "loading" ? "Wird aktiviert…" : "Benachrichtigungen aktivieren"}
      </button>
      {error ? (
        <p className="mt-2 text-xs text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
