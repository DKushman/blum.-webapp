'use client';

import type { ReactNode } from 'react';

export const BLUME_ENTRY_AREA_KEY = 'blume-entry-area';

type EntryModePickerProps = {
  onPickTodo: () => void;
  onPickFitness: () => void;
};

function TodoGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="4" y="5" width="16" height="14" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <path d="M8 12l2.5 2.5L16 9" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FitnessGlyph({ className }: { className?: string }) {
  return (
    <svg className={className} width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 10.5h3l1.5-2 2 5 1.5-3h3.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="5" cy="10.5" r="1.6" fill="currentColor" />
      <circle cx="19" cy="10.5" r="1.6" fill="currentColor" />
    </svg>
  );
}

type ArcRowProps = {
  label: string;
  sub: string;
  rotationDeg: number;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
  borderSelected: string;
  onClick: () => void;
};

function ArcRow({ label, sub, rotationDeg, icon, iconBg, iconColor, borderSelected, onClick }: ArcRowProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full max-w-[min(100%,19rem)] touch-manipulation select-none items-center gap-3 rounded-2xl border-2 border-transparent bg-transparent py-3 pl-4 pr-3 text-left transition-all duration-300 ease-out hover:border-gray-200/80 hover:bg-white/40 focus:outline-none focus-visible:border-[#222222] focus-visible:ring-2 focus-visible:ring-[#222222]/30 active:scale-[0.98] motion-reduce:transition-none motion-reduce:active:scale-100"
      style={{
        transformOrigin: '135% 50%',
        transform: `rotate(${rotationDeg}deg)`,
      }}
    >
      <div className="min-w-0 flex-1">
        <span className="block text-[clamp(1.05rem,3.5vw,1.25rem)] font-semibold tracking-tight text-[#222222]">{label}</span>
        <span className="mt-0.5 block text-[clamp(0.75rem,2.2vw,0.85rem)] text-[#7D7D7D]">{sub}</span>
      </div>
      <div
        className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border-2 shadow-sm transition-transform duration-300 ease-out group-hover:scale-105 group-active:scale-95 ${borderSelected}`}
        style={{ backgroundColor: iconBg, color: iconColor }}
      >
        {icon}
      </div>
    </button>
  );
}

export function EntryModePicker({ onPickTodo, onPickFitness }: EntryModePickerProps) {
  return (
    <main
      id="entry-mode-picker"
      className="relative flex min-h-screen flex-col bg-[#F0F0F0] px-5 pb-10 pt-[clamp(1.5rem,6vh,3rem)]"
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -right-1/4 top-1/2 h-[min(120vw,640px)] w-[min(120vw,640px)] -translate-y-1/2 rounded-full border border-gray-200/40 bg-white/25" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center">
        <h1 className="text-center text-[clamp(1.75rem,5vw,3.25rem)] font-bold tracking-tight text-[#222222]">
          Blumè.
        </h1>
        <p className="mt-3 max-w-[20rem] text-center text-[clamp(0.9rem,2.4vw,1.05rem)] leading-snug text-[#7D7D7D]">
          Womit möchtest du starten? Tippe auf eine Karte — wie an einem Rad entlang.
        </p>

        <div className="relative mt-[clamp(1.5rem,5vh,2.5rem)] flex w-full flex-1 flex-col items-center justify-center">
          <div
            className="absolute right-[max(0.25rem,calc(50%-9.5rem))] top-1/2 z-20 h-12 w-1 -translate-y-1/2 rounded-full bg-[#222222] sm:h-14"
            aria-hidden
          />
          <div
            className="relative flex w-full max-w-md flex-col items-end justify-center gap-[clamp(2rem,7vh,3.25rem)] py-6 pl-4 pr-[max(1rem,8vw)] sm:pr-10"
            style={{ perspective: 1100 }}
          >
            <ArcRow
              label="To-Do"
              sub="Aufgaben, Kalender & Ordner"
              rotationDeg={-19}
              icon={<TodoGlyph className="shrink-0" />}
              iconBg="#FFE4EC"
              iconColor="#B83280"
              borderSelected="border-pink-200 group-hover:border-pink-300"
              onClick={onPickTodo}
            />
            <ArcRow
              label="Fitness"
              sub="Bald: Trainingsplan & mehr"
              rotationDeg={17}
              icon={<FitnessGlyph className="shrink-0" />}
              iconBg="#D6F5EE"
              iconColor="#0F766E"
              borderSelected="border-teal-200 group-hover:border-teal-300"
              onClick={onPickFitness}
            />
          </div>
        </div>

        <p className="mt-auto text-center text-xs text-[#7D7D7D]/90">
          Deine Auswahl merkt sich die App lokal auf diesem Gerät. Über &quot;Startauswahl&quot; im Fitness-Bereich
          kommst du zurück.
        </p>
      </div>
    </main>
  );
}

type FitnessComingSoonProps = {
  onSwitchToTodo: () => void;
  onBackToPicker: () => void;
};

export function FitnessComingSoon({ onSwitchToTodo, onBackToPicker }: FitnessComingSoonProps) {
  return (
    <main id="fitness-placeholder" className="flex min-h-screen flex-col bg-[#F0F0F0] px-6 py-10">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-bold text-[#222222]">Blumè.</h1>
        <p className="mt-2 text-sm font-medium uppercase tracking-[0.2em] text-[#7D7D7D]">Fitness</p>
        <p className="mt-8 text-[clamp(1rem,2.8vw,1.15rem)] leading-relaxed text-[#222222]">
          Dieser Bereich ist noch in Arbeit. Als Nächstes gestalten wir ihn gemeinsam.
        </p>
        <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onSwitchToTodo}
            className="rounded-xl bg-[#222222] px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#333333] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] focus-visible:ring-offset-2"
          >
            Zu To-Do wechseln
          </button>
          <button
            type="button"
            onClick={onBackToPicker}
            className="rounded-xl border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-[#222222] transition-colors hover:border-[#222222] hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222] focus-visible:ring-offset-2"
          >
            Startauswahl
          </button>
        </div>
      </div>
    </main>
  );
}
