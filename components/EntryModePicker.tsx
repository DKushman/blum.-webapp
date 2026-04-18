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
  const touchY0 = useRef<number | null>(null);
  const wheelAccum = useRef(0);

  const go = useCallback((delta: number) => {
    setActiveIndex((i) => (i + delta + ENTRIES.length) % ENTRIES.length);
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
      if (Math.abs(e.deltaY) < Math.abs(e.deltaX)) return;
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

  return (
    <main
      id="entry-mode-picker"
      className="relative min-h-screen overflow-hidden bg-[#F2F2F2] text-[#333333]"
      aria-label="Bereich wählen"
    >
      <p className="sr-only" aria-live="polite">
        Aktuell: {ENTRIES[activeIndex].title}. Erneut tippen oder Enter zum Öffnen.
      </p>

      <div
        ref={stageRef}
        className="relative mx-auto min-h-screen w-full max-w-none overflow-hidden"
        onTouchStart={(e) => {
          if (e.touches.length === 1) touchY0.current = e.touches[0].clientY;
        }}
        onTouchEnd={(e) => {
          const y0 = touchY0.current;
          touchY0.current = null;
          if (y0 == null || e.changedTouches.length === 0) return;
          const dy = e.changedTouches[0].clientY - y0;
          if (Math.abs(dy) < 28) return;
          go(dy > 0 ? 1 : -1);
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
            const motion =
              'duration-[480ms] ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none';
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => {
                  if (isActive) onSelect(entry.id);
                  else setActiveIndex(i);
                }}
                className={`absolute flex flex-col items-center outline-none transition-[left,top,transform,color] ${motion} focus-visible:ring-2 focus-visible:ring-[#333]/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#F2F2F2] ${
                  isActive ? 'z-20' : 'z-10'
                }`}
                style={{
                  left: p.x,
                  top: p.y,
                  transform: `translate(-50%, -56%) rotate(${rotate}deg)`,
                  transformOrigin: 'center 44%',
                }}
                aria-current={isActive ? 'true' : undefined}
                aria-label={
                  isActive ? `${entry.title} ausgewählt — tippen zum Öffnen` : `${entry.title} auswählen`
                }
              >
                <span
                  className={`block font-bold tracking-[0.02em] tabular-nums transition-[font-size,color] ${motion}`}
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
                  className={`mt-1 max-w-[9rem] text-center font-medium leading-tight tracking-wide whitespace-nowrap transition-[font-size,color,opacity] ${motion}`}
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
