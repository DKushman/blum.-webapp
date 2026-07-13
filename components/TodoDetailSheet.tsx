'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  REMINDER_OFFSET_OPTIONS,
  REMINDER_OFFSET_SHORT,
  type ReminderOffset,
} from '@/lib/push/reminder-offset';

type Category = { id: string; name: string; color: string };

type TodoDetailSheetProps = {
  isOpen: boolean;
  /** true = neue Aufgabe anlegen (statt bestehende bearbeiten) */
  isNew?: boolean;
  text: string;
  completed: boolean;
  reminderEnabled: boolean;
  reminderTime: string;
  reminderOffset: ReminderOffset;
  categoryId?: string;
  categories: Category[];
  onCategoryChange: (value: string | undefined) => void;
  onTextChange: (value: string) => void;
  onCompletedChange: (value: boolean) => void;
  onReminderEnabledChange: (value: boolean) => void;
  onReminderTimeChange: (value: string) => void;
  onReminderOffsetChange: (value: ReminderOffset) => void;
  onSave: () => void;
  onDelete: () => void;
  onClose: () => void;
};

const DISMISS_THRESHOLD = 100;

export function TodoDetailSheet({
  isOpen,
  isNew = false,
  text,
  completed,
  reminderEnabled,
  reminderTime,
  reminderOffset,
  categoryId,
  categories,
  onCategoryChange,
  onTextChange,
  onCompletedChange,
  onReminderEnabledChange,
  onReminderTimeChange,
  onReminderOffsetChange,
  onSave,
  onDelete,
  onClose,
}: TodoDetailSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startY: number; currentY: number; dragging: boolean }>({
    startY: 0,
    currentY: 0,
    dragging: false,
  });
  const [dragOffset, setDragOffset] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [render, setRender] = useState(false);
  const [shown, setShown] = useState(false);

  // Ein-/Ausblenden getrennt vom Mount steuern, damit auch das Schließen
  // (Weg-Tippen) sauber nach unten animiert, bevor das Sheet entfernt wird.
  useEffect(() => {
    if (isOpen) {
      setRender(true);
      setDragOffset(0);
      document.body.style.overflow = 'hidden';
      // Zwei Frames warten, damit die Startposition (100%) sicher gerendert ist,
      // bevor nach oben animiert wird.
      let raf2 = 0;
      const raf1 = requestAnimationFrame(() => {
        raf2 = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(raf1);
        cancelAnimationFrame(raf2);
      };
    }
    setShown(false);
    document.body.style.overflow = '';
    const timer = setTimeout(() => setRender(false), 460);
    return () => clearTimeout(timer);
  }, [isOpen]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('textarea, input, button, label')) return;
    dragRef.current = { startY: e.clientY, currentY: e.clientY, dragging: true };
    setDragging(true);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.dragging) return;
    const delta = Math.max(0, e.clientY - dragRef.current.startY);
    dragRef.current.currentY = e.clientY;
    setDragOffset(delta);
  };

  const handlePointerUp = () => {
    if (!dragRef.current.dragging) return;
    dragRef.current.dragging = false;
    setDragging(false);
    if (dragOffset > DISMISS_THRESHOLD) {
      handleClose();
    } else {
      setDragOffset(0);
    }
  };

  if (!render) return null;

  return (
    <div
      className={`fixed inset-0 z-[70] transition-opacity duration-[460ms] ease-[cubic-bezier(0.32,0.72,0,1)] ${
        shown ? 'opacity-100' : 'opacity-0 pointer-events-none'
      }`}
      aria-hidden={!shown}
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/25 backdrop-blur-[2px]"
        onClick={handleClose}
        aria-label="Schließen"
      />

      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-label="Aufgabe bearbeiten"
        className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-md rounded-t-[28px] liquid-glass-sheet px-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] pt-2 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          dragging ? '' : 'transition-transform duration-[460ms]'
        }`}
        style={{
          transform: `translateY(calc(${shown ? '0%' : '100%'} + ${shown ? dragOffset : 0}px))`,
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#222222]/20" />

        <textarea
          value={text}
          onChange={(e) => {
            onTextChange(e.target.value);
            const ta = e.target;
            ta.style.height = 'auto';
            ta.style.height = `${ta.scrollHeight}px`;
          }}
          placeholder="Was möchtest du erledigen?"
          rows={2}
          className="w-full resize-none overflow-hidden bg-transparent text-[15px] leading-relaxed text-[#222222] outline-none placeholder:text-[#A8A8A8]"
        />

        <div className="mt-4 space-y-3 border-t border-[#222222]/8 pt-4">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#222222]">Erledigt</span>
            <button
              type="button"
              role="switch"
              aria-checked={completed}
              onClick={() => onCompletedChange(!completed)}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                completed ? 'bg-[#222222]' : 'bg-[#222222]/15'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  completed ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between gap-3">
            <span className="text-[13px] font-medium text-[#222222]">Kategorie</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onCategoryChange(undefined)}
                className={`h-6 w-6 rounded-full border-[1.5px] border-dashed border-[#222222]/30 ${
                  !categoryId ? 'ring-2 ring-[#222222]/25' : ''
                }`}
                aria-label="Keine Kategorie"
              />
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => onCategoryChange(cat.id)}
                  style={{ backgroundColor: cat.color }}
                  className={`h-6 w-6 rounded-full transition-transform active:scale-90 ${
                    categoryId === cat.id ? 'ring-2 ring-offset-1 ring-[#222222]/40' : ''
                  }`}
                  aria-label={cat.name}
                  title={cat.name}
                />
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[13px] font-medium text-[#222222]">Erinnerung</span>
            <button
              type="button"
              role="switch"
              aria-checked={reminderEnabled}
              onClick={() => onReminderEnabledChange(!reminderEnabled)}
              className={`relative h-7 w-12 rounded-full transition-colors ${
                reminderEnabled ? 'bg-[#222222]' : 'bg-[#222222]/15'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 h-6 w-6 rounded-full bg-white shadow-sm transition-transform ${
                  reminderEnabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {reminderEnabled && (
            <div className="space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[#7D7D7D]">
                  Uhrzeit
                </label>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => onReminderTimeChange(e.target.value)}
                  className="w-full rounded-xl border border-[#222222]/10 bg-white/60 px-3 py-2.5 text-[14px] text-[#222222] outline-none focus:border-[#222222]/25"
                />
              </div>
              {reminderTime && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wide text-[#7D7D7D]">
                    Vorher erinnern
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {REMINDER_OFFSET_OPTIONS.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => onReminderOffsetChange(opt)}
                        className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                          reminderOffset === opt
                            ? 'bg-[#222222] text-white'
                            : 'bg-[#222222]/6 text-[#7D7D7D] hover:bg-[#222222]/10'
                        }`}
                      >
                        {REMINDER_OFFSET_SHORT[opt]}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex gap-2">
          <button
            type="button"
            onClick={onDelete}
            className={`flex-1 rounded-xl border border-[#222222]/10 py-3 text-[13px] font-medium transition-colors ${
              isNew ? 'text-[#7D7D7D] hover:bg-[#222222]/5' : 'text-red-500 hover:bg-red-50'
            }`}
          >
            {isNew ? 'Abbrechen' : 'Löschen'}
          </button>
          <button
            type="button"
            onClick={onSave}
            disabled={!text.trim() || (reminderEnabled && !reminderTime)}
            className="flex-[2] rounded-xl bg-[#222222] py-3 text-[13px] font-medium text-white transition-colors hover:bg-[#333333] disabled:opacity-40"
          >
            {isNew ? 'Hinzufügen' : 'Speichern'}
          </button>
        </div>
      </div>
    </div>
  );
}
