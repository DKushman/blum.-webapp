'use client';

import { useRef, useState } from 'react';

type SwipeableTodoRowProps = {
  /** Sichtbarer Text der Aufgabe */
  text: string;
  completed: boolean;
  /** Kategoriefarbe für den Kreis (undefined = neutral) */
  categoryColor?: string;
  /** Optionaler Zusatz (z. B. Uhrzeit) rechts vom Text */
  meta?: string;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
};

const AXIS_LOCK_PX = 8;
const TRIGGER_PX = 72;
const MAX_DRAG_PX = 96;
const TAP_SLOP_PX = 6;

export function SwipeableTodoRow({
  text,
  completed,
  categoryColor,
  meta,
  onToggle,
  onEdit,
  onDelete,
}: SwipeableTodoRowProps) {
  const [dragX, setDragX] = useState(0);
  const [snapping, setSnapping] = useState(false);
  const state = useRef({
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    axis: null as null | 'x' | 'y',
    moved: 0,
  });

  const reset = () => {
    setSnapping(true);
    setDragX(0);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    state.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      axis: null,
      moved: 0,
    };
    setSnapping(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (s.pointerId !== e.pointerId) return;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    s.moved = Math.max(s.moved, Math.abs(dx), Math.abs(dy));

    if (s.axis === null) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return;
      s.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (s.axis === 'x') {
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }
    }

    if (s.axis === 'x') {
      const clamped = Math.max(-MAX_DRAG_PX, Math.min(MAX_DRAG_PX, dx));
      setDragX(clamped);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = state.current;
    if (s.pointerId !== e.pointerId) return;
    s.pointerId = null;

    // Reiner Tap (kaum Bewegung) → abhaken
    if (s.axis !== 'x' && s.moved < TAP_SLOP_PX) {
      onToggle();
      reset();
      return;
    }

    if (dragX >= TRIGGER_PX) {
      reset();
      onEdit();
    } else if (dragX <= -TRIGGER_PX) {
      reset();
      onDelete();
    } else {
      reset();
    }
  };

  const handlePointerCancel = () => {
    state.current.pointerId = null;
    reset();
  };

  const circleStyle = completed
    ? { backgroundColor: categoryColor ?? '#222222', borderColor: categoryColor ?? '#222222' }
    : categoryColor
      ? { borderColor: categoryColor, backgroundColor: 'transparent' }
      : undefined;

  return (
    <div className="swipe-row notepad-line-item" data-todo-row>
      {/* Aktionen dahinter */}
      <span
        className="swipe-action swipe-action-edit"
        style={{ opacity: dragX > 8 ? Math.min(1, dragX / TRIGGER_PX) : 0 }}
        aria-hidden
      >
        Bearbeiten
      </span>
      <span
        className="swipe-action swipe-action-delete"
        style={{ opacity: dragX < -8 ? Math.min(1, -dragX / TRIGGER_PX) : 0 }}
        aria-hidden
      >
        Löschen
      </span>

      <div
        className={`swipe-row-content flex items-center gap-2.5 ${snapping ? 'snapping' : ''}`}
        style={{ transform: `translateX(${dragX}px)` }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          style={circleStyle}
          className={`h-[14px] w-[14px] shrink-0 rounded-full border-[1.5px] transition-all duration-200 ${
            completed
              ? 'border-[#222222] bg-[#222222]'
              : 'border-[#222222]/35 bg-transparent'
          }`}
          aria-label={completed ? 'Als offen markieren' : 'Als erledigt markieren'}
        />
        <span
          className={`min-w-0 flex-1 text-left text-[15px] text-[#222222] transition-all duration-200 ${
            completed ? 'line-through opacity-40' : ''
          }`}
        >
          {text}
          {meta && (
            <span className="ml-1.5 text-[11px] text-[#9A9A9A] no-underline">{meta}</span>
          )}
        </span>
      </div>
    </div>
  );
}
