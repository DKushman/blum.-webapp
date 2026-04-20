'use client';

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export const BLUME_ENTRY_AREA_KEY = 'blume-entry-area';

export type BlumeEntryArea = 'todo' | 'fitness' | 'notes' | 'workflows';

const ENTRIES: readonly {
  id: BlumeEntryArea;
  num: string;
  title: string;
}[] = [
  { id: 'todo', num: '01', title: 'To-Do' },
  { id: 'fitness', num: '02', title: 'Fitness' },
  { id: 'notes', num: '03', title: 'Notizen' },
  { id: 'workflows', num: '04', title: 'Workflows' },
] as const;

const N = ENTRIES.length;
/** Gleichmäßiger Winkelabstand auf dem Bogen (symmetrisch um 0°) */
const STEP_DEG = 30;
const BASE_ANGLES_DEG = ENTRIES.map((_, i) => (-STEP_DEG * (N - 1)) / 2 + i * STEP_DEG);

type Geom = {
  cx: number;
  cy: number;
  R: number;
  activeX: number;
  w: number;
  h: number;
};

function displayAngleDeg(entryIndex: number, activeIndex: number) {
  return BASE_ANGLES_DEG[entryIndex] - BASE_ANGLES_DEG[activeIndex];
}

function pointOnArc(cx: number, cy: number, R: number, phiDeg: number) {
  const φ = (phiDeg * Math.PI) / 180;
  return { x: cx + R * Math.cos(φ), y: cy + R * Math.sin(φ) };
}

function tangentRotateDeg(phiDeg: number) {
  return phiDeg + 90;
}

type EntryModePickerProps = {
  onSelect: (area: BlumeEntryArea) => void;
};

export function EntryModePicker({ onSelect }: EntryModePickerProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const [geom, setGeom] = useState<Geom | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const wheelAccum = useRef(0);
  const wheelAccumX = useRef(0);

  const go = useCallback((delta: number) => {
    setActiveIndex((i) => (i + delta + ENTRIES.length) % ENTRIES.length);
  }, []);

  const setActiveFromArc = useCallback((index: number) => {
    setActiveIndex(index);
  }, []);

  useLayoutEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const w = r.width;
      const h = r.height;
      if (w < 8 || h < 8) return;
      const R = Math.min(h * 0.5, w * 0.88);
      const cx = w * 0.03 - R * 0.1;
      const cy = h / 2;
      const activeX = w * 0.46;
      setGeom({ cx, cy, R, activeX, w, h });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') go(1);
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') go(-1);
      if (e.key === 'Enter') onSelect(ENTRIES[activeIndex].id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, go, onSelect]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const ax = Math.abs(e.deltaX);
      const ay = Math.abs(e.deltaY);
      if (ax > ay) {
        if (ax < 0.5) return;
        e.preventDefault();
        wheelAccumX.current += e.deltaX;
        const TH = 48;
        while (wheelAccumX.current >= TH) {
          wheelAccumX.current -= TH;
          go(1);
        }
        while (wheelAccumX.current <= -TH) {
          wheelAccumX.current += TH;
          go(-1);
        }
        return;
      }
      if (ay < 0.5) return;
      e.preventDefault();
      wheelAccum.current += e.deltaY;
      const TH = 40;
      while (wheelAccum.current >= TH) {
        wheelAccum.current -= TH;
        go(1);
      }
      while (wheelAccum.current <= -TH) {
        wheelAccum.current += TH;
        go(-1);
      }
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [go]);

  /** Punkte auf dem Bogen (gleiches Raster; 0° = Lesepunkt separat) */
  const dotAngles: number[] = [];
  if (geom) {
    const lo = Math.min(...BASE_ANGLES_DEG) - 18;
    const hi = Math.max(...BASE_ANGLES_DEG) + 18;
    for (let d = lo; d <= hi; d += 9) {
      if (Math.abs(d) > 2) dotAngles.push(d);
    }
  }

  const arcMoveClass =
    'duration-[520ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:duration-150 motion-reduce:ease-linear motion-reduce:transition-transform';
  const arcColorClass = 'transition-[color,opacity] duration-200 ease-out motion-reduce:transition-none';

  return (
    <main
      id="entry-mode-picker"
      className="relative min-h-screen overflow-x-hidden overflow-y-auto bg-[#F2F2F2] text-[#333333] [overflow-anchor:none] md:overflow-y-hidden"
      aria-label="Bereich wählen"
    >
      <p className="sr-only" aria-live="polite">
        Aktuell: {ENTRIES[activeIndex].title}. Erneut tippen oder Enter zum Öffnen.
      </p>

      <div
        ref={stageRef}
        className="relative mx-auto min-h-[min(125dvh,920px)] w-full max-w-none touch-pan-y overflow-x-hidden overflow-y-visible pb-[max(4rem,15dvh)] md:min-h-screen md:overflow-hidden md:pb-0"
        onTouchStart={(e) => {
          if (e.touches.length === 1) {
            touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
          }
        }}
        onTouchEnd={(e) => {
          const start = touchStartRef.current;
          touchStartRef.current = null;
          if (!start || e.changedTouches.length === 0) return;
          const end = e.changedTouches[0];
          const dx = end.clientX - start.x;
          const dy = end.clientY - start.y;
          const adx = Math.abs(dx);
          const ady = Math.abs(dy);
          if (Math.max(adx, ady) < 22) return;
          if (adx > ady) {
            if (dx < -38) go(1);
            else if (dx > 38) go(-1);
          } else {
            if (dy > 30) go(1);
            else if (dy < -30) go(-1);
          }
        }}
        onTouchCancel={() => {
          touchStartRef.current = null;
        }}
      >
        {geom && (
          <div className="pointer-events-none absolute inset-0 select-none" aria-hidden>
            <div
              className="absolute rounded-full border border-[#cccccc] bg-transparent"
              style={{
                width: geom.R * 2,
                height: geom.R * 2,
                left: geom.cx - geom.R,
                top: geom.cy - geom.R,
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.45)',
              }}
            />
            <svg className="absolute" width={geom.w} height={geom.h} aria-hidden>
              {dotAngles.map((deg) => {
                const p = pointOnArc(geom.cx, geom.cy, geom.R, deg);
                return <circle key={deg} cx={p.x} cy={p.y} r={2.8} fill="#cccccc" />;
              })}
              {(() => {
                const p0 = pointOnArc(geom.cx, geom.cy, geom.R, 0);
                return <circle cx={p0.x} cy={p0.y} r={4} fill="#333333" />;
              })()}
            </svg>
          </div>
        )}

        {geom &&
          ENTRIES.map((entry, i) => {
            const isActive = i === activeIndex;
            const phi = displayAngleDeg(i, activeIndex);
            const p = isActive
              ? { x: geom.activeX, y: geom.cy }
              : pointOnArc(geom.cx, geom.cy, geom.R, phi);
            const rotate = isActive ? 0 : tangentRotateDeg(phi);
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  if (isActive) onSelect(entry.id);
                  else setActiveFromArc(i);
                }}
                className={`absolute left-0 top-0 flex flex-col items-center outline-none will-change-transform transition-transform ${arcMoveClass} focus-visible:ring-2 focus-visible:ring-[#333]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F2F2F2] ${
                  isActive ? 'z-20' : 'z-10'
                }`}
                style={{
                  transform: `translate3d(${p.x}px, ${p.y}px, 0) translate(-50%, -56%) rotate(${rotate}deg)`,
                  transformOrigin: 'center 44%',
                  backfaceVisibility: 'hidden',
                }}
                aria-current={isActive ? 'true' : undefined}
                aria-label={
                  isActive ? `${entry.title} ausgewählt — tippen zum Öffnen` : `${entry.title} auswählen`
                }
              >
                <span
                  className={`block font-bold tracking-[0.02em] tabular-nums ${arcColorClass}`}
                  style={{
                    fontVariantNumeric: 'slashed-zero',
                    fontSize: isActive
                      ? 'clamp(3.35rem, min(15vw, 17vh), 6rem)'
                      : 'clamp(1.05rem, min(3.8vw, 3.8vh), 1.65rem)',
                    color: isActive ? '#333333' : '#cccccc',
                    lineHeight: 0.92,
                    fontFamily: 'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
                  }}
                >
                  {entry.num}
                </span>
                <span
                  className={`mt-1 max-w-[9rem] text-center font-medium leading-tight tracking-wide whitespace-nowrap ${arcColorClass}`}
                  style={{
                    fontSize: isActive
                      ? 'clamp(0.68rem, min(2.2vw, 2vh), 0.85rem)'
                      : 'clamp(0.55rem, min(1.85vw, 1.7vh), 0.7rem)',
                    color: isActive ? '#666666' : '#bbbbbb',
                  }}
                >
                  {entry.title}
                </span>
              </button>
            );
          })}
      </div>
    </main>
  );
}

type AreaComingSoonProps = {
  title: string;
  tag: string;
  body: string;
  onSwitchToTodo: () => void;
  onBackToPicker: () => void;
};

export function AreaComingSoon({ title, tag, body, onSwitchToTodo, onBackToPicker }: AreaComingSoonProps) {
  return (
    <main className="flex min-h-screen flex-col bg-[#F2F2F2] px-6 py-10 text-[#333333]">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center text-center">
        <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-bold tracking-tight">{title}</h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.35em] text-[#999999]">{tag}</p>
        <p className="mt-8 text-[clamp(1rem,2.8vw,1.12rem)] leading-relaxed text-[#555555]">{body}</p>
        <div className="mt-10 flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onSwitchToTodo}
            className="rounded-full bg-[#333333] px-6 py-3 text-sm font-semibold text-[#F2F2F2] transition-colors hover:bg-[#1a1a1a] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#333333] focus-visible:ring-offset-2"
          >
            Zu To-Do
          </button>
          <button
            type="button"
            onClick={onBackToPicker}
            className="rounded-full border border-[#cccccc] bg-white px-6 py-3 text-sm font-semibold text-[#333333] transition-colors hover:border-[#999999] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#333333] focus-visible:ring-offset-2"
          >
            Start-Rad
          </button>
        </div>
      </div>
    </main>
  );
}
