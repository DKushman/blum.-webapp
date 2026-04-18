'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const LS_LOG_V2 = 'blume-fitness-log-v2';
const LS_LOG = 'blume-fitness-log-v3';
const LS_GOALS = 'blume-fitness-goals-v2';
type Kind = 'protein' | 'calories';

type LogRow = {
  id: string;
  at: string;
  source: 'wheel' | 'meal';
  protein: number;
  calories: number;
  title?: string;
  imageDataUrl?: string;
};

/** Legacy v2 */
type LogEntryV2 = { id: string; kind: Kind; amount: number; at: string };

type Goals = { protein: number; calories: number };

const defaultGoals: Goals = { protein: 120, calories: 2200 };

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function sameDay(iso: string, day: Date) {
  return iso.slice(0, 10) === dateKey(day);
}

/** Lokaler Zeitstempel (nicht UTC-ISO), damit „Heute“ / Kalendertag stimmen */
function formatLocalAt(d = new Date()) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function loadGoals(): Goals | null {
  try {
    const raw = localStorage.getItem(LS_GOALS);
    if (!raw) return null;
    const g = JSON.parse(raw) as Goals;
    const p = Number(g.protein);
    const c = Number(g.calories);
    if (!Number.isFinite(p) || !Number.isFinite(c) || p < 1 || c < 1) return null;
    return { protein: p, calories: c };
  } catch {
    return null;
  }
}

function migrateV2Log(): LogRow[] {
  try {
    const raw = localStorage.getItem(LS_LOG_V2);
    if (!raw) return [];
    const arr = JSON.parse(raw) as LogEntryV2[];
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((e) => e && e.id && e.at)
      .map((e) => ({
        id: e.id,
        at: e.at,
        source: 'wheel' as const,
        protein: e.kind === 'protein' ? e.amount : 0,
        calories: e.kind === 'calories' ? e.amount : 0,
      }));
  } catch {
    return [];
  }
}

function loadLog(): LogRow[] {
  try {
    const raw = localStorage.getItem(LS_LOG);
    if (raw) {
      const arr = JSON.parse(raw) as unknown;
      if (Array.isArray(arr)) {
        if (arr.length === 0) return [];
        if (arr[0] && typeof arr[0] === 'object' && 'protein' in (arr[0] as object)) {
          return arr.filter((x): x is LogRow => x && typeof (x as LogRow).id === 'string');
        }
      }
    }
    const migrated = migrateV2Log();
    if (migrated.length) {
      localStorage.setItem(LS_LOG, JSON.stringify(migrated));
      localStorage.removeItem(LS_LOG_V2);
    }
    return migrated;
  } catch {
    return [];
  }
}

function sumForDay(log: LogRow[], day: Date, field: 'protein' | 'calories') {
  return log.filter((e) => sameDay(e.at, day)).reduce((s, e) => s + (field === 'protein' ? e.protein : e.calories), 0);
}

function compressImageFile(file: File, maxW = 360, quality = 0.62): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxW / img.width);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const ctx = c.getContext('2d');
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      try {
        resolve(c.toDataURL('image/jpeg', quality));
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };
    img.src = url;
  });
}

/** Exakte Pixel — muss mit Zeilenhöhe im Wheel übereinstimmen */
const WHEEL_ITEM_PX = 44;
const WHEEL_VIEW_PX = 220;

const proteinPickValues = Array.from({ length: 40 }, (_, i) => (i + 1) * 5);
const caloriePickValues = Array.from({ length: 60 }, (_, i) => (i + 1) * 50);

function wheelIndexFromScroll(el: HTMLDivElement, valuesLength: number) {
  const H = el.clientHeight;
  const ITEM = WHEEL_ITEM_PX;
  const pad = (H - ITEM) / 2;
  const centerY = el.scrollTop + H / 2;
  const idx = Math.round((centerY - pad - ITEM / 2) / ITEM);
  return Math.max(0, Math.min(valuesLength - 1, idx));
}

function wheelScrollToIndex(el: HTMLDivElement, index: number) {
  const H = el.clientHeight;
  const ITEM = WHEEL_ITEM_PX;
  const pad = (H - ITEM) / 2;
  el.scrollTop = pad + index * ITEM + ITEM / 2 - H / 2;
}

type MinimalRingProps = {
  total: number;
  goal: number;
  label: string;
  unit: string;
  size?: number;
};

function MinimalRing({ total, goal, label, unit, size = 148 }: MinimalRingProps) {
  const stroke = 2.25;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const p = goal > 0 ? Math.min(1, total / goal) : 0;
  const shown = Math.round(total);

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ececec" strokeWidth={stroke} />
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#1a1a1a"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * p} ${c}`}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-1">
        <div className="flex flex-col items-center justify-center">
          <span className="text-center text-[clamp(1.85rem,7.5vw,2.65rem)] font-semibold leading-none tabular-nums tracking-tight text-neutral-900">
            {shown}
            {unit === 'g' ? <span className="align-top text-[0.42em] font-medium text-neutral-400">g</span> : null}
          </span>
          <span className="mt-2 text-center text-[11px] font-medium tracking-wide text-neutral-400">{label}</span>
        </div>
      </div>
    </div>
  );
}

type WheelModalProps = {
  open: boolean;
  kind: Kind;
  values: number[];
  unitLabel: string;
  onClose: () => void;
  onAdd: (amount: number) => void;
};

function WheelModal({ open, kind, values, unitLabel, onClose, onAdd }: WheelModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState(values[0] ?? 0);

  const syncFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || values.length === 0) return;
    const i = wheelIndexFromScroll(el, values.length);
    setSelected(values[i]!);
  }, [values]);

  const readValueForAdd = useCallback(() => {
    const el = scrollRef.current;
    if (!el || values.length === 0) return values[0] ?? 0;
    const i = wheelIndexFromScroll(el, values.length);
    return values[i]!;
  }, [values]);

  useEffect(() => {
    if (!open || values.length === 0) return;
    const el = scrollRef.current;
    if (!el) return;
    const mid = Math.floor(values.length / 2);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        wheelScrollToIndex(el, mid);
        setSelected(values[mid]!);
      });
    });
  }, [open, kind, values]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/25 backdrop-blur-[2px] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wheel-modal-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-t-[1.25rem] border border-neutral-200/80 bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="wheel-modal-title" className="text-center text-sm font-semibold text-neutral-800">
          {kind === 'protein' ? 'Protein' : 'Kalorien'} hinzufügen
        </h2>
        <p className="mt-1 text-center text-xs text-neutral-400">In der Mitte wählen · Hinzufügen übernimmt den Wert</p>
        <div className="relative mx-auto mt-5 w-full max-w-[200px]">
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-11 -translate-y-1/2 rounded-lg border border-neutral-200/90 bg-neutral-50/40"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-[calc(50%-22px)] bg-gradient-to-b from-white via-white/90 to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-[calc(50%-22px)] bg-gradient-to-t from-white via-white/90 to-transparent"
            aria-hidden
          />
          <div
            ref={scrollRef}
            onScroll={syncFromScroll}
            className="relative z-0 h-[220px] overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            style={{
              scrollSnapType: 'y mandatory',
              paddingTop: (WHEEL_VIEW_PX - WHEEL_ITEM_PX) / 2,
              paddingBottom: (WHEEL_VIEW_PX - WHEEL_ITEM_PX) / 2,
            }}
          >
            {values.map((v) => (
              <div
                key={v}
                style={{ height: WHEEL_ITEM_PX, minHeight: WHEEL_ITEM_PX }}
                className={`flex shrink-0 snap-center items-center justify-center text-[17px] tabular-nums ${
                  v === selected ? 'font-bold text-neutral-900' : 'font-normal text-neutral-500'
                }`}
              >
                {v}
                {unitLabel}
              </div>
            ))}
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-full border border-neutral-200 py-3 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            Abbrechen
          </button>
          <button
            type="button"
            onClick={() => {
              onAdd(readValueForAdd());
              onClose();
            }}
            className="flex-1 rounded-full bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800"
          >
            Hinzufügen
          </button>
        </div>
      </div>
    </div>
  );
}

function buildMonthCells(year: number, month: number): ({ day: number } | null)[] {
  const first = new Date(year, month, 1);
  const monStart = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: ({ day: number } | null)[] = [];
  for (let i = 0; i < monStart; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d });
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  return cells;
}

type DotCalendarProps = {
  open: boolean;
  initialMonth: Date;
  selectedDay: Date;
  onClose: () => void;
  onSelectDay: (d: Date) => void;
};

function DotCalendar({ open, initialMonth, selectedDay, onClose, onSelectDay }: DotCalendarProps) {
  const [view, setView] = useState(() => new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));

  useEffect(() => {
    if (open) setView(new Date(initialMonth.getFullYear(), initialMonth.getMonth(), 1));
  }, [open, initialMonth]);

  if (!open) return null;

  const y = view.getFullYear();
  const m = view.getMonth();
  const cells = buildMonthCells(y, m);
  const today = startOfDay(new Date());
  const sel = startOfDay(selectedDay);

  const pick = (day: number) => {
    const d = new Date(y, m, day);
    d.setHours(12, 0, 0, 0);
    onSelectDay(startOfDay(d));
    onClose();
  };

  const monthTitle = view.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label="Kalender"
      onClick={onClose}
    >
      <div className="flex justify-end p-4" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          onClick={onClose}
          className="rounded-full p-2 text-white/60 transition hover:bg-white/10 hover:text-white"
          aria-label="Schließen"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="flex flex-1 flex-col items-center px-6 pb-10 pt-2" onClick={(e) => e.stopPropagation()}>
        <div className="mb-8 flex w-full max-w-[320px] items-center justify-between gap-2">
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-white/50 transition hover:bg-white/10 hover:text-white/90"
            aria-label="Vorheriger Monat"
            onClick={() => setView(new Date(y, m - 1, 1))}
          >
            ‹
          </button>
          <h2 className="min-w-0 flex-1 text-center text-base font-medium capitalize tracking-wide text-white/95 sm:text-lg">
            {monthTitle}
          </h2>
          <button
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-xl text-white/50 transition hover:bg-white/10 hover:text-white/90"
            aria-label="Nächster Monat"
            onClick={() => setView(new Date(y, m + 1, 1))}
          >
            ›
          </button>
        </div>

        <div className="flex w-full flex-1 flex-col items-center justify-center">
          <div className="grid w-full max-w-[300px] grid-cols-7 gap-x-2 gap-y-4 sm:max-w-[340px] sm:gap-x-3 sm:gap-y-5">
          {cells.map((cell, idx) => {
            if (!cell) {
              return (
                <div key={`e-${idx}`} className="flex flex-col items-center gap-1.5" aria-hidden>
                  <div className="flex h-9 w-9 items-center justify-center">
                    <span className="block h-2.5 w-2.5 rounded-full opacity-0 sm:h-3 sm:w-3" />
                  </div>
                  <span className="h-3 text-[10px] tabular-nums opacity-0">0</span>
                </div>
              );
            }
            const cellDate = startOfDay(new Date(y, m, cell.day));
            const isToday = cellDate.getTime() === today.getTime();
            const isSel = cellDate.getTime() === sel.getTime();
            const dotClass = isToday
              ? 'bg-[#555555]'
              : isSel && !isToday
                ? 'bg-white ring-2 ring-white/40 ring-offset-2 ring-offset-black'
                : 'bg-white';
            const labelClass =
              isToday || isSel ? 'text-white/90' : 'text-white/45';
            return (
              <div key={cell.day} className="flex flex-col items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => pick(cell.day)}
                  className="flex h-9 w-9 items-center justify-center rounded-full transition-opacity hover:opacity-90"
                  aria-label={`${cell.day}. ${monthTitle}`}
                >
                  <span className={`block h-2.5 w-2.5 rounded-full sm:h-3 sm:w-3 ${dotClass}`} />
                </button>
                <span className={`text-[10px] font-medium tabular-nums leading-none sm:text-[11px] ${labelClass}`}>
                  {cell.day}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
}

type MealModalProps = {
  open: boolean;
  onClose: () => void;
  onSave: (row: Omit<LogRow, 'id' | 'at'>) => void;
};

function MealModal({ open, onClose, onSave }: MealModalProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState('');
  const [protein, setProtein] = useState('');
  const [calories, setCalories] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTitle('');
      setProtein('');
      setCalories('');
      setPreview(null);
    }
  }, [open]);

  if (!open) return null;

  const pickImage = () => fileRef.current?.click();

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f || !f.type.startsWith('image/')) return;
    const data = await compressImageFile(f);
    setPreview(data);
  };

  const submit = () => {
    const p = Math.max(0, Number(protein) || 0);
    const c = Math.max(0, Number(calories) || 0);
    if (p === 0 && c === 0) return;
    onSave({
      source: 'meal',
      protein: p,
      calories: c,
      title: title.trim() || undefined,
      imageDataUrl: preview ?? undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-black/30 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="meal-title"
      onClick={onClose}
    >
      <div
        className="max-h-[92vh] w-full max-w-sm overflow-y-auto rounded-t-2xl bg-white p-5 shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="meal-title" className="text-center text-sm font-semibold text-neutral-900">
          Essen erfassen
        </h2>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onFile} />
        <button
          type="button"
          onClick={pickImage}
          className="mt-4 flex w-full flex-col items-center justify-center rounded-2xl border border-dashed border-neutral-300 bg-neutral-50 py-8 text-neutral-500 transition hover:border-neutral-400 hover:bg-neutral-100"
        >
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt="" className="max-h-40 w-auto rounded-lg object-contain" />
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-50" aria-hidden>
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <span className="mt-2 text-xs font-medium">Foto wählen</span>
            </>
          )}
        </button>
        <label className="mt-4 block text-xs font-medium text-neutral-500">Titel</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="z. B. Haferbrei"
          className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm outline-none focus:border-neutral-900"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-neutral-500">Protein (g)</label>
            <input
              type="number"
              min={0}
              value={protein}
              onChange={(e) => setProtein(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm tabular-nums outline-none focus:border-neutral-900"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-neutral-500">Kalorien</label>
            <input
              type="number"
              min={0}
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="mt-1 w-full rounded-xl border border-neutral-200 px-3 py-2.5 text-sm tabular-nums outline-none focus:border-neutral-900"
            />
          </div>
        </div>
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-full border border-neutral-200 py-3 text-sm font-medium text-neutral-600">
            Abbrechen
          </button>
          <button
            type="button"
            onClick={submit}
            className="flex-1 rounded-full bg-neutral-900 py-3 text-sm font-semibold text-white disabled:opacity-40"
            disabled={!Number(protein) && !Number(calories)}
          >
            Speichern
          </button>
        </div>
      </div>
    </div>
  );
}

type SetupProps = {
  onDone: (goals: Goals) => void;
  onBack: () => void;
};

function SetupGoalsScreen({ onDone, onBack }: SetupProps) {
  const [p, setP] = useState('120');
  const [c, setC] = useState('2200');

  return (
    <main className="flex min-h-screen flex-col bg-[#fafafa] px-6 pb-10 pt-6 text-neutral-900">
      <button type="button" onClick={onBack} className="mb-8 self-start text-sm text-neutral-500 hover:text-neutral-800">
        ← Zurück
      </button>
      <h1 className="text-2xl font-semibold tracking-tight">Deine Ziele</h1>
      <p className="mt-2 text-sm text-neutral-500">Damit sich die Ringe nach deinem Alltag füllen.</p>
      <div className="mt-10 space-y-6">
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Protein (g / Tag)</label>
          <input
            value={p}
            onChange={(e) => setP(e.target.value)}
            type="number"
            min={1}
            className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-lg font-semibold tabular-nums outline-none focus:border-neutral-900"
          />
        </div>
        <div>
          <label className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Kalorien (kcal / Tag)</label>
          <input
            value={c}
            onChange={(e) => setC(e.target.value)}
            type="number"
            min={1}
            className="mt-2 w-full rounded-xl border border-neutral-200 bg-white px-4 py-3 text-lg font-semibold tabular-nums outline-none focus:border-neutral-900"
          />
        </div>
      </div>
      <button
        type="button"
        onClick={() => {
          const gp = Math.max(1, Math.round(Number(p)) || 1);
          const gc = Math.max(1, Math.round(Number(c)) || 1);
          onDone({ protein: gp, calories: gc });
        }}
        className="mt-auto w-full rounded-full bg-neutral-900 py-4 text-sm font-semibold text-white"
      >
        Weiter
      </button>
    </main>
  );
}

type FitnessDashboardProps = {
  onBackToPicker: () => void;
};

export function FitnessDashboard({ onBackToPicker }: FitnessDashboardProps) {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [goals, setGoals] = useState<Goals>(defaultGoals);
  const [log, setLog] = useState<LogRow[]>([]);
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfDay(new Date()));
  const [wheel, setWheel] = useState<{ kind: Kind } | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [mealOpen, setMealOpen] = useState(false);

  useEffect(() => {
    const d = startOfDay(new Date());
    setSelectedDay(d);
  }, []);

  useEffect(() => {
    const g = loadGoals();
    setNeedsSetup(g === null);
    if (g) setGoals(g);
    setLog(loadLog());
  }, []);

  const appendRow = useCallback((row: LogRow) => {
    setLog((prev) => {
      const next = [...prev, row];
      try {
        localStorage.setItem(LS_LOG, JSON.stringify(next));
      } catch {
        return prev;
      }
      return next;
    });
  }, []);

  const removeEntry = useCallback((id: string) => {
    setLog((prev) => {
      const next = prev.filter((e) => e.id !== id);
      try {
        localStorage.setItem(LS_LOG, JSON.stringify(next));
      } catch {
        return prev;
      }
      return next;
    });
  }, []);

  const finishSetup = (g: Goals) => {
    localStorage.setItem(LS_GOALS, JSON.stringify(g));
    setGoals(g);
    setNeedsSetup(false);
  };

  const proteinTotal = useMemo(() => sumForDay(log, selectedDay, 'protein'), [log, selectedDay]);
  const calTotal = useMemo(() => sumForDay(log, selectedDay, 'calories'), [log, selectedDay]);

  const dayEntries = useMemo(() => {
    return [...log].filter((e) => sameDay(e.at, selectedDay)).sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [log, selectedDay]);

  const addWheel = (kind: Kind, amount: number) => {
    appendRow({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      at: formatLocalAt(new Date()),
      source: 'wheel',
      protein: kind === 'protein' ? amount : 0,
      calories: kind === 'calories' ? amount : 0,
    });
  };

  const addMeal = (partial: Omit<LogRow, 'id' | 'at'>) => {
    appendRow({
      ...partial,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      at: formatLocalAt(new Date()),
    });
  };

  const timeStr = (localAt: string) => {
    const [datePart, timePart] = localAt.split('T');
    if (!timePart) return '';
    const [hh, mm] = timePart.split(':');
    return `${hh}:${mm}`;
  };

  const sectionTitle = useMemo(() => {
    const t = startOfDay(new Date());
    if (selectedDay.getTime() === t.getTime()) return 'Heute';
    return selectedDay.toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' });
  }, [selectedDay]);

  if (needsSetup === null) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#fafafa] text-sm text-neutral-500">
        Wird geladen…
      </main>
    );
  }

  if (needsSetup) {
    return <SetupGoalsScreen onDone={finishSetup} onBack={onBackToPicker} />;
  }

  return (
    <main className="flex min-h-screen flex-col bg-[#fafafa] text-neutral-900">
      <header className="flex items-center justify-between px-4 pb-2 pt-4 sm:px-6">
        <button
          type="button"
          onClick={onBackToPicker}
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
          aria-label="Zurück"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setCalendarOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
          aria-label="Kalender"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M16 3v4M8 3v4M3 11h18" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setMealOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-600 transition hover:bg-neutral-200/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
          aria-label="Foto erfassen"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
            <circle cx="12" cy="13" r="4" />
          </svg>
        </button>
      </header>

      <div className="flex flex-1 flex-col px-4 pb-10 pt-4 sm:mx-auto sm:max-w-md sm:px-6">
        <div className="flex justify-center gap-10 sm:gap-16">
          <div className="flex flex-col items-center gap-4">
            <MinimalRing total={proteinTotal} goal={goals.protein} label="Protein" unit="g" />
            <button
              type="button"
              onClick={() => setWheel({ kind: 'protein' })}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg font-light leading-none text-neutral-400 shadow-sm transition hover:border-neutral-300 hover:text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              aria-label="Protein hinzufügen"
            >
              +
            </button>
          </div>
          <div className="flex flex-col items-center gap-4">
            <MinimalRing total={calTotal} goal={goals.calories} label="Kalorien" unit="kcal" />
            <button
              type="button"
              onClick={() => setWheel({ kind: 'calories' })}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-lg font-light leading-none text-neutral-400 shadow-sm transition hover:border-neutral-300 hover:text-neutral-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-900"
              aria-label="Kalorien hinzufügen"
            >
              +
            </button>
          </div>
        </div>

        <section className="mt-14">
          <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-400">{sectionTitle}</h2>
          {dayEntries.length === 0 ? (
            <p className="text-sm text-neutral-400">Noch keine Einträge.</p>
          ) : (
            <ul className="flex flex-col gap-2.5">
              {dayEntries.map((e) => {
                const isWheel = e.source === 'wheel';
                const headline =
                  e.source === 'meal' && e.title?.trim()
                    ? e.title.trim()
                    : isWheel
                      ? e.protein > 0
                        ? 'Protein'
                        : 'Kalorien'
                      : e.source === 'meal'
                        ? 'Mahlzeit'
                        : '';
                return (
                  <li
                    key={e.id}
                    className="flex gap-3 rounded-xl border border-neutral-200/90 bg-white p-3 shadow-sm"
                  >
                    {e.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={e.imageDataUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div
                        className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-neutral-100 text-neutral-400"
                        aria-hidden
                      >
                        {isWheel ? (
                          <span className="text-xl font-light leading-none">+</span>
                        ) : (
                          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="opacity-60" aria-hidden>
                            <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                            <circle cx="12" cy="13" r="4" />
                          </svg>
                        )}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      {headline ? (
                        <p className="truncate text-[15px] font-semibold text-neutral-900">{headline}</p>
                      ) : null}
                      <p className={`text-[14px] leading-snug text-neutral-600 ${headline ? 'mt-0.5' : ''}`}>
                        {e.protein > 0 && (
                          <span>
                            <span className="font-semibold tabular-nums text-neutral-900">{e.protein}</span> g Protein
                            {e.calories > 0 ? <span className="text-neutral-300"> · </span> : null}
                          </span>
                        )}
                        {e.calories > 0 && (
                          <span>
                            <span className="font-semibold tabular-nums text-neutral-900">{e.calories}</span> kcal
                          </span>
                        )}
                      </p>
                      {isWheel ? (
                        <p className="mt-1 text-[11px] text-neutral-400">Über + am Ring</p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1 self-start">
                      <time className="text-xs tabular-nums text-neutral-400" dateTime={e.at}>
                        {timeStr(e.at)}
                      </time>
                      <button
                        type="button"
                        onClick={() => removeEntry(e.id)}
                        className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-red-50 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                        aria-label="Eintrag löschen"
                      >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                          <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M10 11v6M14 11v6" />
                        </svg>
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {wheel && (
        <WheelModal
          open
          kind={wheel.kind}
          values={wheel.kind === 'protein' ? proteinPickValues : caloriePickValues}
          unitLabel={wheel.kind === 'protein' ? ' g' : ' kcal'}
          onClose={() => setWheel(null)}
          onAdd={(amount) => addWheel(wheel.kind, amount)}
        />
      )}

      <DotCalendar
        open={calendarOpen}
        initialMonth={selectedDay}
        selectedDay={selectedDay}
        onClose={() => setCalendarOpen(false)}
        onSelectDay={setSelectedDay}
      />

      <MealModal open={mealOpen} onClose={() => setMealOpen(false)} onSave={addMeal} />
    </main>
  );
}
