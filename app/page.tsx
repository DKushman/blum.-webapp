'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BLUME_ENTRY_AREA_KEY,
  EntryModePicker,
  AreaComingSoon,
  type BlumeEntryArea,
} from '@/components/EntryModePicker';
import { FitnessDashboard } from '@/components/FitnessDashboard';
import { TodoDetailSheet } from '@/components/TodoDetailSheet';
import { SwipeableTodoRow } from '@/components/SwipeableTodoRow';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import {
  REMINDER_OFFSET_OPTIONS,
  REMINDER_OFFSET_SHORT,
  normalizeReminderOffset,
  type ReminderOffset,
} from '@/lib/push/reminder-offset';

type Folder = {
  id: string;
  name: string;
  color: string;
};

type Repeating = 'daily' | 'weekly' | 'monthly' | 'yearly';

type Todo = {
  id: string;
  text: string;
  folderId?: string;
  time?: string;
  /** Push-Erinnerung aktiv */
  reminderEnabled?: boolean;
  /** Erinnerungszeit als HH:MM */
  reminderTime?: string;
  /** Wie lange vor dem Termin erinnert wird */
  reminderOffset?: ReminderOffset;
  date: string; // YYYY-MM-DD format — geplanter Tag
  completed: boolean;
  /** Wenn erledigt: Tag, an dem abgehakt (für Anzeige); fehlt bei alten Daten → Fallback `date` */
  completedOn?: string;
  seriesId?: string; // links repeating instances
  repeating?: Repeating;
};

type View = 'dashboard' | 'chosen-day' | 'monthly';

type EntryRoute = 'hydrating' | 'picker' | BlumeEntryArea;

/** Feste Kategorie-Presets (werden bei Bedarf als Folder angelegt) */
const CATEGORY_PRESETS: Folder[] = [
  { id: 'cat-blue', name: 'Persönlich', color: '#3B82F6' },
  { id: 'cat-orange', name: 'Arbeit', color: '#FF9F0A' },
  { id: 'cat-green', name: 'Einkauf', color: '#34C759' },
  { id: 'cat-red', name: 'Wichtig', color: '#FF3B30' },
  { id: 'cat-purple', name: 'Privat', color: '#AF52DE' },
];

const weekdays = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const months = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'
];

export default function Home() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());
  const [chosenDayFromCalendar, setChosenDayFromCalendar] = useState<Date>(new Date()); // Last day chosen from monthly overview
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [inlineNewTodoText, setInlineNewTodoText] = useState('');
  const [inlineCategoryId, setInlineCategoryId] = useState<string | undefined>(undefined);
  const [showInlineCategoryPicker, setShowInlineCategoryPicker] = useState(false);
  const [sheetTodo, setSheetTodo] = useState<Todo | null>(null);
  const [sheetIsNew, setSheetIsNew] = useState(false);
  const [sheetText, setSheetText] = useState('');
  const [sheetCompleted, setSheetCompleted] = useState(false);
  const [sheetReminderEnabled, setSheetReminderEnabled] = useState(false);
  const [sheetReminderTime, setSheetReminderTime] = useState('');
  const [sheetReminderOffset, setSheetReminderOffset] = useState<ReminderOffset>('30m');
  const [sheetCategoryId, setSheetCategoryId] = useState<string | undefined>(undefined);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [showDeleteTodoModal, setShowDeleteTodoModal] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
  const [datePickForTodoId, setDatePickForTodoId] = useState<string | null>(null);

  const DAY_SWIPE_THRESHOLD_PX = 48;
  const daySwipeRef = useRef<{
    pointerId: number | null;
    startX: number;
    startY: number;
    tracking: boolean;
  }>({ pointerId: null, startX: 0, startY: 0, tracking: false });
  const notepadInputRef = useRef<HTMLTextAreaElement>(null);
  const notepadScrollRef = useRef<HTMLDivElement>(null);

  const [entryArea, setEntryArea] = useState<EntryRoute>('hydrating');

  // Load folders from localStorage on mount
  const [folders, setFolders] = useState<Folder[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('blume-folders');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Load todos from localStorage on mount
  const [todos, setTodos] = useState<Todo[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('blume-todos');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Save folders to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('blume-folders', JSON.stringify(folders));
    }
  }, [folders]);

  // Save todos to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('blume-todos', JSON.stringify(todos));
    }
  }, [todos]);

  const push = usePushNotifications(todos);

  const foldersById = useMemo(() => {
    const map = new Map<string, Folder>();
    for (const folder of folders) map.set(folder.id, folder);
    return map;
  }, [folders]);

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatTodoTimeDisplay = (hhmm: string) => {
    const [h, m] = hhmm.split(':');
    if (!m || m === '00') return `${Number(h)} Uhr`;
    return `${h}:${m} Uhr`;
  };

  const parseHhMmFromTodo = (todo: Todo) => {
    if (todo.reminderTime) return todo.reminderTime;
    if (!todo.time) return '';
    const colon = todo.time.match(/^(\d{1,2}):(\d{2})/);
    if (colon) return `${colon[1].padStart(2, '0')}:${colon[2]}`;
    const match = todo.time.match(/(\d+)/);
    return match ? `${String(match[1]).padStart(2, '0')}:00` : '';
  };

  /** Kalenderwoche Montag–Sonntag (deutsch) */
  const getMondaySundayOfWeek = (anchor: Date) => {
    const d = new Date(anchor);
    d.setHours(0, 0, 0, 0);
    const jsDay = d.getDay();
    const offsetToMonday = jsDay === 0 ? -6 : 1 - jsDay;
    const monday = new Date(d);
    monday.setDate(d.getDate() + offsetToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { monday, sunday };
  };

  const formatWeekRangeLine = (anchor: Date) => {
    const { monday, sunday } = getMondaySundayOfWeek(anchor);
    const sameMonth = monday.getMonth() === sunday.getMonth() && monday.getFullYear() === sunday.getFullYear();
    if (sameMonth) {
      return `${monday.getDate()}.–${sunday.getDate()}. ${months[monday.getMonth()]}`;
    }
    const sameYear = monday.getFullYear() === sunday.getFullYear();
    if (sameYear) {
      return `${monday.getDate()}. ${months[monday.getMonth()]} – ${sunday.getDate()}. ${months[sunday.getMonth()]}`;
    }
    return `${monday.getDate()}. ${months[monday.getMonth()]} – ${sunday.getDate()}. ${months[sunday.getMonth()]}`;
  };

  const getTodosForDay = (date: Date) => {
    const dateStr = formatDateString(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const isToday = selectedDate.getTime() === today.getTime();
    
    const filtered = todos.filter(todo => {
      const todoDate = new Date(todo.date + 'T00:00:00');
      todoDate.setHours(0, 0, 0, 0);

      if (todo.completed) {
        const doneDay = todo.completedOn ?? todo.date;
        return doneDay === dateStr;
      }

      // Unvollständig: geplanter Tag oder überfällig auf „heute“
      if (isToday && todoDate < today) return true;
      return todo.date === dateStr;
    });

    // Nur Erledigte nach unten schieben — sonst Reihenfolge beibehalten
    // (neue To-Dos bleiben dort, wo sie geschrieben wurden, statt nach oben zu springen).
    return [...filtered].sort((a, b) => (a.completed ? 1 : 0) - (b.completed ? 1 : 0));
  };

  const getTodosForMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    
    return todos.filter(todo => {
      const todoDate = new Date(todo.date);
      return todoDate.getFullYear() === year && 
             todoDate.getMonth() === month && 
             !todo.completed;
    });
  };

  const formatDate = (date: Date) => {
    return `${date.getDate()}.`;
  };

  const getCategoryColor = (folderId?: string): string | undefined => {
    if (!folderId) return undefined;
    const fromFolders = foldersById.get(folderId)?.color;
    if (fromFolders) return fromFolders;
    return CATEGORY_PRESETS.find((c) => c.id === folderId)?.color;
  };

  /** Sorgt dafür, dass ein Preset-Ordner in `folders` existiert (für Farbe/Name). */
  const ensureCategoryFolder = (folderId?: string) => {
    if (!folderId) return;
    if (foldersById.has(folderId)) return;
    const preset = CATEGORY_PRESETS.find((c) => c.id === folderId);
    if (preset) setFolders((prev) => [...prev, preset]);
  };

  const getFolderName = (folderId?: string) => {
    if (!folderId) return '—';
    return foldersById.get(folderId)?.name ?? '—';
  };

  /** 6-stelliges Hex → rgba mit Alpha (für Textmarker-Hintergrund) */
  const hexToRgba = (hex: string, alpha: number): string | undefined => {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
    if (!m) return undefined;
    const int = parseInt(m[1], 16);
    const r = (int >> 16) & 255;
    const g = (int >> 8) & 255;
    const b = int & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const getCategoryName = (folderId?: string): string | undefined => {
    if (!folderId) return undefined;
    return (
      foldersById.get(folderId)?.name ??
      CATEGORY_PRESETS.find((c) => c.id === folderId)?.name
    );
  };

  const isOverdue = (todo: Todo) => {
    if (todo.completed) return false;
    const todoDate = new Date(todo.date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    todoDate.setHours(0, 0, 0, 0);
    return todoDate < today;
  };

  const getOverdueOriginalDate = (todo: Todo) => {
    const date = new Date(todo.date);
    const weekdays = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];
    return `${date.getDate()}.${months[date.getMonth()]}, ${weekdays[date.getDay()]}`;
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: Date[] = [];
    
    // Only include days from the exact month
    const current = new Date(firstDay);
    while (current <= lastDay) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    
    return days;
  };

  const deleteFolder = (folderId: string) => {
    setFolders(folders.filter(f => f.id !== folderId));
    setTodos(todos.map(t => t.folderId === folderId ? { ...t, folderId: undefined } : t));
  };

  const deleteTodo = (todoId: string) => {
    setTodos(todos.filter(todo => todo.id !== todoId));
    setShowDeleteTodoModal(false);
    setTodoToDelete(null);
  };

  const toggleTodoComplete = (todoId: string) => {
    const todo = todos.find((item) => item.id === todoId);
    if (!todo) return;

    if (todo.completed) {
      setTodos(
        todos.map((item) =>
          item.id === todoId
            ? { ...item, completed: false, completedOn: undefined }
            : item
        )
      );
      return;
    }

    const completedDay =
      currentView === 'chosen-day' ? chosenDayFromCalendar : selectedDay;
    const completedDayStr = formatDateString(completedDay);

    setTodos((prev) =>
      prev.map((item) =>
        item.id === todoId
          ? { ...item, completed: true, completedOn: completedDayStr }
          : item
      )
    );
  };

  const deleteTodoSeries = (seriesId: string) => {
    setTodos(todos.filter(todo => todo.seriesId !== seriesId));
    setShowDeleteTodoModal(false);
    setTodoToDelete(null);
  };

  const requestDeleteTodo = (todo: Todo) => {
    const inSeries = todo.seriesId && todos.filter(t => t.seriesId === todo.seriesId).length > 1;
    if (inSeries) {
      setTodoToDelete(todo);
      setShowDeleteTodoModal(true);
    } else {
      deleteTodo(todo.id);
    }
  };

  const openTodoSheet = (todo: Todo) => {
    setSheetIsNew(false);
    setSheetTodo(todo);
    setSheetText(todo.text);
    setSheetCompleted(todo.completed);
    setSheetReminderEnabled(todo.reminderEnabled ?? false);
    setSheetReminderTime(parseHhMmFromTodo(todo));
    setSheetReminderOffset(normalizeReminderOffset(todo.reminderOffset));
    setSheetCategoryId(todo.folderId);
  };

  const openNewTodoSheet = (prefillText = '', prefillCategory?: string) => {
    const dateToUse = currentView === 'chosen-day' ? chosenDayFromCalendar : selectedDay;
    setSheetIsNew(true);
    setSheetTodo({
      id: Date.now().toString(),
      text: prefillText,
      date: formatDateString(dateToUse),
      completed: false,
      folderId: prefillCategory,
    });
    setSheetText(prefillText);
    setSheetCompleted(false);
    setSheetReminderEnabled(false);
    setSheetReminderTime('');
    setSheetReminderOffset('30m');
    setSheetCategoryId(prefillCategory);
  };

  const closeTodoSheet = () => {
    setSheetTodo(null);
    setSheetIsNew(false);
    setSheetText('');
    setSheetCompleted(false);
    setSheetReminderEnabled(false);
    setSheetReminderTime('');
    setSheetReminderOffset('30m');
    setSheetCategoryId(undefined);
  };

  const saveTodoSheet = () => {
    if (!sheetTodo || !sheetText.trim()) return;

    const timeDisplay = sheetReminderTime ? formatTodoTimeDisplay(sheetReminderTime) : undefined;
    const reminderEnabled = sheetReminderEnabled && Boolean(sheetReminderTime);

    ensureCategoryFolder(sheetCategoryId);
    const updatedTodo: Todo = {
      ...sheetTodo,
      text: sheetText.trim(),
      folderId: sheetCategoryId,
      completed: sheetCompleted,
      completedOn: sheetCompleted
        ? (sheetTodo.completedOn ?? formatDateString(currentView === 'chosen-day' ? chosenDayFromCalendar : selectedDay))
        : undefined,
      time: timeDisplay,
      reminderEnabled,
      reminderTime: reminderEnabled ? sheetReminderTime : undefined,
      reminderOffset: reminderEnabled ? sheetReminderOffset : undefined,
    };

    if (sheetIsNew) {
      setTodos([...todos, updatedTodo]);
    } else {
      setTodos(todos.map((todo) => (todo.id === sheetTodo.id ? updatedTodo : todo)));
    }
    closeTodoSheet();
  };

  const deleteFromSheet = () => {
    if (!sheetTodo) return;
    // Im Neu-Modus ist „Abbrechen“ = einfach schließen (nichts wurde angelegt).
    if (sheetIsNew) {
      closeTodoSheet();
      return;
    }
    requestDeleteTodo(sheetTodo);
    closeTodoSheet();
  };

  const formatDatePill = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime()) return `Heute, ${getWeekdayName(date).slice(0, 2)}`;
    return `${getWeekdayName(date).slice(0, 2)}, ${date.getDate()}. ${months[date.getMonth()].slice(0, 3)}`;
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const v = localStorage.getItem(BLUME_ENTRY_AREA_KEY);
    if (v === 'todo' || v === 'fitness' || v === 'notes' || v === 'workflows') {
      setEntryArea(v);
    } else {
      setEntryArea('picker');
    }
  }, []);

  const addInlineTodo = () => {
    if (!inlineNewTodoText.trim()) return;

    const scrollTop = notepadScrollRef.current?.scrollTop ?? 0;
    const dateToUse = currentView === 'chosen-day' ? chosenDayFromCalendar : selectedDay;
    ensureCategoryFolder(inlineCategoryId);
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: inlineNewTodoText.trim(),
      date: formatDateString(dateToUse),
      completed: false,
      folderId: inlineCategoryId,
    };
    setTodos([...todos, newTodo]);
    setInlineNewTodoText('');
    requestAnimationFrame(() => {
      if (notepadScrollRef.current) {
        notepadScrollRef.current.scrollTop = scrollTop;
      }
    });
  };

  const getWeekdayName = (date: Date) => {
    const dayOfWeek = date.getDay();
    const weekdayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    return weekdays[weekdayIndex];
  };

  const handleDayClick = (day: Date) => {
    // Wenn wir im "Tag verschieben"-Modus sind: To-Do auf diesen Tag verschieben
    if (datePickForTodoId) {
      const newDateStr = formatDateString(day);
      setTodos(todos.map(todo =>
        todo.id === datePickForTodoId ? { ...todo, date: newDateStr } : todo
      ));
      setDatePickForTodoId(null);
      setSelectedDay(day);
      setChosenDayFromCalendar(day);
      setCurrentView('chosen-day');
      return;
    }
    setSelectedDay(day);
    setChosenDayFromCalendar(day); // Store the day chosen from monthly overview
    setCurrentView('chosen-day');
  };

  const startPickDateForTodo = () => {
    if (!sheetTodo) return;
    setDatePickForTodoId(sheetTodo.id);
    setCurrentMonth(new Date(sheetTodo.date + 'T00:00:00'));
    closeTodoSheet();
    setCurrentView('monthly');
  };

  const navigateDisplayDay = useCallback((deltaDays: number) => {
    const shift = (d: Date) => {
      const next = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      next.setDate(next.getDate() + deltaDays);
      return next;
    };
    if (currentView === 'chosen-day') {
      setChosenDayFromCalendar(shift);
      setSelectedDay(shift);
    } else {
      setSelectedDay(shift);
    }
  }, [currentView]);

  const isDaySwipeIgnoredTarget = (target: EventTarget | null) => {
    if (!(target instanceof Element)) return true;
    return Boolean(
      target.closest('[data-todo-row], [data-no-day-swipe], button, a, input, textarea, select, label')
    );
  };

  const handleDaySwipePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (isDaySwipeIgnoredTarget(e.target)) return;
    daySwipeRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      tracking: true,
    };
  };

  const handleDaySwipePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = daySwipeRef.current;
    if (!swipe.tracking || swipe.pointerId !== e.pointerId) return;
    swipe.tracking = false;
    swipe.pointerId = null;
    const dx = e.clientX - swipe.startX;
    const dy = e.clientY - swipe.startY;
    if (Math.abs(dx) < DAY_SWIPE_THRESHOLD_PX || Math.abs(dx) <= Math.abs(dy)) return;
    navigateDisplayDay(dx < 0 ? 1 : -1);
  };

  const handleDaySwipePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    const swipe = daySwipeRef.current;
    if (swipe.pointerId !== e.pointerId) return;
    swipe.tracking = false;
    swipe.pointerId = null;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(newMonth.getMonth() - 1);
    } else {
      newMonth.setMonth(newMonth.getMonth() + 1);
    }
    setCurrentMonth(newMonth);
  };

  // Use chosenDayFromCalendar for view 3, selectedDay for dashboard
  const displayDay = currentView === 'chosen-day' ? chosenDayFromCalendar : selectedDay;
  const displayDayKey = formatDateString(displayDay);

  const currentTodos = useMemo(
    () => getTodosForDay(displayDay),
    [todos, displayDayKey]
  );

  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonth),
    [currentMonth.getFullYear(), currentMonth.getMonth()]
  );

  const renderTodoRow = (todo: Todo, highlightColor?: string) => (
    <SwipeableTodoRow
      key={`${formatDateString(displayDay)}-${todo.id}`}
      text={todo.text}
      completed={todo.completed}
      categoryColor={getCategoryColor(todo.folderId)}
      highlightColor={highlightColor}
      meta={todo.reminderEnabled || todo.time ? (todo.time ?? '') : undefined}
      onToggle={() => toggleTodoComplete(todo.id)}
      onEdit={() => openTodoSheet(todo)}
      onDelete={() => requestDeleteTodo(todo)}
    />
  );

  // Nach Kategorie gruppieren: gleiche Kategorie steht untereinander.
  // Reihenfolge: erst ohne Kategorie, dann in Preset-Reihenfolge.
  const groupedTodos = useMemo(() => {
    const groups = new Map<string, Todo[]>();
    for (const todo of currentTodos) {
      const key = todo.folderId ?? '';
      const bucket = groups.get(key);
      if (bucket) bucket.push(todo);
      else groups.set(key, [todo]);
    }
    const order: string[] = [];
    if (groups.has('')) order.push('');
    for (const cat of CATEGORY_PRESETS) if (groups.has(cat.id)) order.push(cat.id);
    for (const key of groups.keys()) if (!order.includes(key)) order.push(key);
    return order.map((key) => ({ key, todos: groups.get(key)! }));
  }, [currentTodos]);

  const todoGroupNodes = groupedTodos.map((group) => {
    const name = getCategoryName(group.key || undefined);
    const color = getCategoryColor(group.key || undefined);
    // Textmarker-Hintergrund nur, wenn mehrere Aufgaben in dieser Kategorie liegen
    const highlight =
      color && group.todos.length > 1 ? hexToRgba(color, 0.16) : undefined;
    return (
      <div key={group.key || 'ungrouped'}>
        {name && (
          <div className="notepad-line-item flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-[#222222]/45">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: color }}
              aria-hidden
            />
            {name}
          </div>
        )}
        {group.todos.map((todo) => renderTodoRow(todo, highlight))}
      </div>
    );
  });

  if (entryArea === 'hydrating') {
    return (
      <main id="entry-hydrating" className="flex min-h-screen flex-col items-center justify-center bg-[#F0F0F0] px-4">
        <h1 className="text-[clamp(1.75rem,5vw,3rem)] font-bold text-[#222222]">Blumè.</h1>
        <p className="mt-3 text-sm text-[#7D7D7D]">Wird geladen…</p>
      </main>
    );
  }

  if (entryArea === 'picker') {
    return (
      <EntryModePicker
        onSelect={(area) => {
          if (typeof window !== 'undefined') localStorage.setItem(BLUME_ENTRY_AREA_KEY, area);
          setEntryArea(area);
        }}
      />
    );
  }

  if (entryArea === 'fitness') {
    return (
      <FitnessDashboard
        onBackToPicker={() => {
          if (typeof window !== 'undefined') localStorage.removeItem(BLUME_ENTRY_AREA_KEY);
          setEntryArea('picker');
        }}
      />
    );
  }

  const comingSoon =
    entryArea === 'notes'
        ? {
            title: 'Notizen',
            tag: 'Demnächst',
            body: 'Kurz notieren, strukturieren und mit Aufgaben verknüpfen — folgt in einem Update.',
          }
        : entryArea === 'workflows'
          ? {
              title: 'Workflows',
              tag: 'Demnächst',
              body: 'Wiederkehrende Abläufe und Schnellaktionen — hier entsteht die Steuerzentrale.',
            }
          : null;

  if (comingSoon) {
    return (
      <AreaComingSoon
        title={comingSoon.title}
        tag={comingSoon.tag}
        body={comingSoon.body}
        onSwitchToTodo={() => {
          if (typeof window !== 'undefined') localStorage.setItem(BLUME_ENTRY_AREA_KEY, 'todo');
          setEntryArea('todo');
        }}
        onBackToPicker={() => {
          if (typeof window !== 'undefined') localStorage.removeItem(BLUME_ENTRY_AREA_KEY);
          setEntryArea('picker');
        }}
      />
    );
  }

  return (
    <main id="main-container" className="notepad-app pb-[calc(5rem+env(safe-area-inset-bottom,0px))]">
      <div id="app-wrapper" className="max-w-md mx-auto">

        {/* Dashboard View and Chosen Day View */}
        {(currentView === 'dashboard' || currentView === 'chosen-day') && (
          <>
            <header
              id="top-glass-header"
              className="sticky top-0 z-40 flex items-center justify-between gap-2 px-4 pb-2 pt-[max(0.6rem,env(safe-area-inset-top,0px))]"
            >
              <button
                type="button"
                id="entry-area-switch-btn"
                onClick={() => {
                  if (typeof window !== 'undefined') localStorage.removeItem(BLUME_ENTRY_AREA_KEY);
                  setEntryArea('picker');
                }}
                className="liquid-glass-pill shrink-0 px-3 py-1.5 text-[11px] font-semibold tracking-tight text-[#222222]/70 transition-opacity hover:opacity-100"
                aria-label="Zur Bereichsauswahl"
              >
                Blumè
              </button>

              {/* Datum mittig im Bildschirm */}
              <div
                id="date-display"
                key={displayDayKey}
                className="liquid-glass-pill day-view-content pointer-events-none absolute left-1/2 -translate-x-1/2 px-4 py-1.5 text-[12px] font-medium text-[#222222]"
              >
                {formatDatePill(displayDay)}
              </div>

              <button
                id="quick-add-btn"
                type="button"
                onClick={() => openNewTodoSheet()}
                className="liquid-glass-pill flex h-8 w-8 shrink-0 items-center justify-center text-[#222222] transition-transform active:scale-95"
                aria-label="Neues To-Do"
              >
                <span id="plus-icon" className="text-[19px] font-light leading-none">+</span>
              </button>
            </header>

            <div
              id="dashboard-view"
              className="notepad-surface touch-pan-y pl-9 pr-4"
              onPointerDown={handleDaySwipePointerDown}
              onPointerUp={handleDaySwipePointerUp}
              onPointerCancel={handleDaySwipePointerCancel}
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-todo-row]')) return;
                notepadInputRef.current?.focus();
              }}
            >
              <div id="notes-list-inner" key={displayDayKey} className="day-view-content cursor-text pt-3 pb-10">
                {currentTodos.length === 0 && !inlineNewTodoText && (
                  <p className="notepad-line-item text-[13px] text-[#B8B4A8]">Tippe, um zu schreiben…</p>
                )}
                {todoGroupNodes}
                <div
                  className="notepad-line-item relative flex items-center gap-2.5"
                  data-no-day-swipe
                  data-todo-row
                >
                  {/* Kategorie-Auswahl auf derselben Zeile */}
                  <button
                    type="button"
                    id="inline-category-btn"
                    onClick={() => setShowInlineCategoryPicker((v) => !v)}
                    style={
                      getCategoryColor(inlineCategoryId)
                        ? { borderColor: getCategoryColor(inlineCategoryId), backgroundColor: 'transparent' }
                        : undefined
                    }
                    className={`h-[14px] w-[14px] shrink-0 rounded-full border-[1.5px] border-dashed transition-all ${
                      inlineCategoryId ? 'border-solid' : 'border-[#222222]/25'
                    }`}
                    aria-label="Kategorie wählen"
                  />
                  <textarea
                    ref={notepadInputRef}
                    id="inline-todo-input"
                    value={inlineNewTodoText}
                    onChange={(e) => {
                      setInlineNewTodoText(e.target.value);
                      const ta = e.target;
                      ta.style.height = 'auto';
                      ta.style.height = `${ta.scrollHeight}px`;
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        addInlineTodo();
                      }
                    }}
                    placeholder=""
                    rows={1}
                    className="min-w-0 flex-1 resize-none overflow-hidden bg-transparent text-[15px] leading-[32px] text-[#222222] outline-none placeholder:text-[#B8B4A8]"
                  />

                  {/* 3-Punkte → volles Overlay öffnen (mehr Optionen für diese Aufgabe) */}
                  {inlineNewTodoText.trim() && (
                    <button
                      type="button"
                      id="inline-more-btn"
                      onClick={() => {
                        openNewTodoSheet(inlineNewTodoText.trim(), inlineCategoryId);
                        setInlineNewTodoText('');
                      }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#222222]/50 transition-colors hover:bg-[#222222]/8 active:scale-95"
                      aria-label="Weitere Optionen"
                    >
                      <span className="text-[17px] leading-none tracking-tight">⋯</span>
                    </button>
                  )}

                  {showInlineCategoryPicker && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowInlineCategoryPicker(false)}
                        aria-hidden
                      />
                      <div className="absolute left-0 top-8 z-50 flex items-center gap-2.5 rounded-full liquid-glass-pill px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            setInlineCategoryId(undefined);
                            setShowInlineCategoryPicker(false);
                            notepadInputRef.current?.focus();
                          }}
                          className={`h-5 w-5 rounded-full border-[1.5px] border-dashed border-[#222222]/30 ${
                            !inlineCategoryId ? 'ring-2 ring-[#222222]/25' : ''
                          }`}
                          aria-label="Keine Kategorie"
                        />
                        {CATEGORY_PRESETS.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => {
                              setInlineCategoryId(cat.id);
                              setShowInlineCategoryPicker(false);
                              notepadInputRef.current?.focus();
                            }}
                            style={{ backgroundColor: cat.color }}
                            className={`h-5 w-5 rounded-full transition-transform active:scale-90 ${
                              inlineCategoryId === cat.id ? 'ring-2 ring-offset-1 ring-[#222222]/40' : ''
                            }`}
                            aria-label={cat.name}
                            title={cat.name}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            <TodoDetailSheet
              isOpen={sheetTodo !== null}
              isNew={sheetIsNew}
              text={sheetText}
              completed={sheetCompleted}
              reminderEnabled={sheetReminderEnabled}
              reminderTime={sheetReminderTime}
              reminderOffset={sheetReminderOffset}
              categoryId={sheetCategoryId}
              categories={CATEGORY_PRESETS}
              onCategoryChange={setSheetCategoryId}
              onTextChange={setSheetText}
              onCompletedChange={setSheetCompleted}
              onReminderEnabledChange={setSheetReminderEnabled}
              onReminderTimeChange={setSheetReminderTime}
              onReminderOffsetChange={setSheetReminderOffset}
              onSave={saveTodoSheet}
              onDelete={deleteFromSheet}
              onClose={closeTodoSheet}
            />

            {showDeleteTodoModal && todoToDelete && (
              <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[80]" onClick={() => { setShowDeleteTodoModal(false); setTodoToDelete(null); }}>
                <div className="bg-white rounded-2xl p-5 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-base font-bold text-[#222222] mb-2">Wiederholendes To-Do löschen</h2>
                  <p className="text-[#7D7D7D] text-[13px] mb-5">Nur dieses oder alle wiederholenden löschen?</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => deleteTodo(todoToDelete.id)}
                      className="w-full px-4 py-2.5 border border-[#222222]/10 rounded-xl text-[13px] text-[#222222] hover:bg-gray-50 font-medium"
                    >
                      Nur dieses
                    </button>
                    <button
                      onClick={() => todoToDelete.seriesId && deleteTodoSeries(todoToDelete.seriesId)}
                      className="w-full px-4 py-2.5 bg-[#222222] text-white rounded-xl text-[13px] font-medium"
                    >
                      Alle löschen
                    </button>
                    <button
                      onClick={() => { setShowDeleteTodoModal(false); setTodoToDelete(null); }}
                      className="w-full px-4 py-2 text-[#7D7D7D] text-[12px]"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* Monthly Overview */}
        {currentView === 'monthly' && (
          <div className="px-4 pt-[max(0.6rem,env(safe-area-inset-top,0px))]">
            <div id="month-header" className="liquid-glass-header flex items-center justify-between mb-4 px-3 py-2 relative">
              <button
                id="prev-month-btn"
                onClick={() => navigateMonth('prev')}
                className="text-[#222222] text-[clamp(1.25rem,2.5vw,3.5rem)] px-4"
              >
                ←
              </button>
              <button
                id="month-selector"
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="text-[clamp(1.5rem,4vw,4.5rem)] font-bold text-[#222222] flex-1"
              >
                {months[currentMonth.getMonth()]}.
              </button>
              <button
                id="next-month-btn"
                onClick={() => navigateMonth('next')}
                className="text-[#222222] text-[clamp(1.25rem,2.5vw,3.5rem)] px-4"
              >
                →
              </button>
              
              {/* Month Picker Dropdown */}
              {showMonthPicker && (
                <>
                  <div
                    id="month-picker-overlay"
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMonthPicker(false)}
                    aria-hidden="true"
                  />
                  <div
                    id="month-picker-dropdown"
                    className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-lg shadow-lg p-4 z-50 grid grid-cols-3 gap-2 min-w-[200px]"
                    onClick={(e) => e.stopPropagation()}
                  >
                  {months.map((month, index) => {
                    const today = new Date();
                    const isCurrentMonth = today.getMonth() === index && today.getFullYear() === currentMonth.getFullYear();
                    const isSelected = currentMonth.getMonth() === index;
                    
                    return (
                      <button
                        key={month}
                        id={`month-option-${index}`}
                        onClick={() => {
                          const newDate = new Date(currentMonth);
                          newDate.setMonth(index);
                          setCurrentMonth(newDate);
                          setShowMonthPicker(false);
                        }}
                        className={`px-3 py-2 rounded text-sm ${
                          isSelected
                            ? 'bg-[#222222] text-white'
                            : isCurrentMonth
                            ? 'bg-gray-100 text-[#222222] hover:bg-gray-200 border-2 border-[#222222]'
                            : 'bg-gray-100 text-[#222222] hover:bg-gray-200'
                        }`}
                      >
                        {month.slice(0, 3)}
                      </button>
                    );
                  })}
                  </div>
                </>
              )}
            </div>

            {datePickForTodoId && (
              <div className="mb-3 rounded-xl bg-[#222222] text-white p-3 flex items-center justify-between gap-3 text-[12px]">
                <p>Wähle einen Tag zum Verschieben.</p>
                <button type="button" onClick={() => setDatePickForTodoId(null)} className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-[#222222] text-[11px] font-medium">
                  Abbrechen
                </button>
              </div>
            )}

            <div id="calendar-grid" className="grid grid-cols-3 gap-2">
              {daysInMonth.map((day, index) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dayDate = new Date(day);
                dayDate.setHours(0, 0, 0, 0);

                const dayDateStr = formatDateString(day);
                const dayTodos = todos.filter((todo) => {
                  if (todo.completed) {
                    return (todo.completedOn ?? todo.date) === dayDateStr;
                  }
                  return todo.date === dayDateStr;
                });

                const overdueTodosForDay: Todo[] = [];
                if (dayDate.getTime() === today.getTime()) {
                  overdueTodosForDay.push(...todos.filter(todo => {
                    const todoDate = new Date(todo.date + 'T00:00:00');
                    todoDate.setHours(0, 0, 0, 0);
                    return todoDate < today && !todo.completed;
                  }));
                }

                const allTodosForDay = [...dayTodos, ...overdueTodosForDay];
                const isSelected = day.toDateString() === chosenDayFromCalendar.toDateString();
                const isToday = dayDate.getTime() === today.getTime();
                const dayOfWeek = day.getDay();
                const weekdayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
                const weekdayName = weekdays[weekdayIndex];

                return (
                  <button
                    key={day.toISOString()}
                    id={`day-cell-${index}`}
                    onClick={() => handleDayClick(day)}
                    className={`rounded-xl bg-white/70 p-3 text-left transition-all hover:bg-white ${
                      isSelected ? 'ring-1 ring-[#222222]/30' : ''
                    } ${isToday ? 'ring-2 ring-[#222222]' : ''}`}
                  >
                    <div id={`day-weekday-${index}`} className="text-[10px] text-[#7D7D7D] mb-0.5">
                      {weekdayName.slice(0, 2)}
                    </div>
                    <div id={`day-number-${index}`} className="text-2xl font-bold text-[#222222] leading-none">
                      {day.getDate()}
                    </div>
                    <div id={`day-month-${index}`} className="text-[10px] text-[#7D7D7D] mt-0.5">
                      {months[day.getMonth()].slice(0, 3)}
                    </div>
                    {allTodosForDay.length > 0 && (
                      <div id={`day-todos-${index}`} className="mt-1.5 text-[10px] text-[#7D7D7D]">
                        {allTodosForDay.length} Einträge
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

      </div>

      {/* Sticky bottom navigation — liquid glass */}
      <nav
        id="bottom-glass-nav"
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4"
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
        aria-label="Hauptnavigation"
      >
        <div className="liquid-glass-nav flex w-full max-w-md items-center justify-between rounded-[22px] px-8 py-2">
          <button
            type="button"
            id="bottom-nav-todo"
            onClick={() => {
              setCurrentView('dashboard');
              setSelectedDay(new Date());
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222]/30 ${
              currentView === 'dashboard' || currentView === 'chosen-day'
                ? 'bg-[#222222]/10 text-[#222222] scale-105'
                : 'text-[#7D7D7D] hover:text-[#222222] active:scale-95'
            }`}
            aria-label="To-Do"
            aria-current={currentView === 'dashboard' || currentView === 'chosen-day' ? 'page' : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </button>
          <button
            type="button"
            id="bottom-nav-calendar"
            onClick={() => {
              setCurrentView('monthly');
            }}
            className={`flex h-9 w-9 items-center justify-center rounded-xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222]/30 ${
              currentView === 'monthly'
                ? 'bg-[#222222]/10 text-[#222222] scale-105'
                : 'text-[#7D7D7D] hover:text-[#222222] active:scale-95'
            }`}
            aria-label="Kalender"
            aria-current={currentView === 'monthly' ? 'page' : undefined}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </button>
        </div>
      </nav>

      <style jsx>{`
        @keyframes slideUpFromBottom {
          0% {
            opacity: 0;
            transform: translateY(80px);
            max-height: 0;
            overflow: hidden;
          }
          50% {
            opacity: 0.5;
            max-height: 100px;
            overflow: hidden;
          }
          100% {
            opacity: 1;
            transform: translateY(0);
            max-height: 200px;
            overflow: visible;
          }
        }
        
        @keyframes slideUp {
          0% {
            opacity: 1;
            transform: translateY(0);
          }
          100% {
            opacity: 0;
            transform: translateY(-100%);
          }
        }
        
        #notes-list-container {
          position: relative;
        }
        
        #notes-list-inner {
          position: relative;
        }
        
        #dashboard-view, #monthly-view {
          animation: fadeIn 0.3s ease-out;
        }
        
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

      `}</style>
    </main>
  );
}
