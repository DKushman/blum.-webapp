'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  BLUME_ENTRY_AREA_KEY,
  EntryModePicker,
  AreaComingSoon,
  type BlumeEntryArea,
} from '@/components/EntryModePicker';
import { FitnessDashboard } from '@/components/FitnessDashboard';
import { PushNotificationBanner } from '@/components/PushNotificationBanner';
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
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [inlineNewTodoText, setInlineNewTodoText] = useState('');
  const [editingInlineTodoId, setEditingInlineTodoId] = useState<string | null>(null);
  const [editingInlineText, setEditingInlineText] = useState('');
  const [showAddFolderFromTodoModal, setShowAddFolderFromTodoModal] = useState(false);
  const [addTodoStep, setAddTodoStep] = useState<1 | 2 | 3 | 4>(1);
  const [showAddTodoModal, setShowAddTodoModal] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#FFB6C1');
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoFolder, setNewTodoFolder] = useState('');
  const [newTodoTime, setNewTodoTime] = useState('');
  const [newTodoReminderEnabled, setNewTodoReminderEnabled] = useState(false);
  const [newTodoReminderOffset, setNewTodoReminderOffset] = useState<ReminderOffset>('30m');
  const [newTodoRepeating, setNewTodoRepeating] = useState<'' | Repeating>('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
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

    // Sort: incomplete first (grouped by folder), then completed at bottom (also grouped by folder)
    return [...filtered].sort((a, b) => {
      // First sort by completed status (incomplete first)
      const completedDiff = (a.completed ? 1 : 0) - (b.completed ? 1 : 0);
      if (completedDiff !== 0) return completedDiff;
      
      // Within same completion status, group by folderId
      const folderA = a.folderId || '';
      const folderB = b.folderId || '';
      return folderA.localeCompare(folderB);
    });
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

  const getFolderColor = (folderId?: string) => {
    if (!folderId) return '#D3D3D3';
    return foldersById.get(folderId)?.color ?? '#D3D3D3';
  };

  const getFolderName = (folderId?: string) => {
    if (!folderId) return '—';
    return foldersById.get(folderId)?.name ?? '—';
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

  const addFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: Folder = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        color: newFolderColor,
      };
      setFolders([...folders, newFolder]);
      setNewFolderName('');
      setNewFolderColor('#FFB6C1');
    }
  };

  const deleteFolder = (folderId: string) => {
    setFolders(folders.filter(f => f.id !== folderId));
    setTodos(todos.map(t => t.folderId === folderId ? { ...t, folderId: undefined } : t));
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

  const deleteTodo = (todoId: string) => {
    setTodos(todos.filter(todo => todo.id !== todoId));
    setShowDeleteTodoModal(false);
    setTodoToDelete(null);
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

  const startEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setNewTodoText(todo.text);
    setNewTodoFolder(todo.folderId ?? '');
    setNewTodoTime(parseHhMmFromTodo(todo));
    setNewTodoReminderEnabled(todo.reminderEnabled ?? false);
    setNewTodoReminderOffset(normalizeReminderOffset(todo.reminderOffset));
    setAddTodoStep(4);
    setShowAddTodoModal(true);
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

  const getDatesForRepeating = (startDate: Date, repeating: Repeating): Date[] => {
    const dates: Date[] = [];
    const d = new Date(startDate);
    d.setHours(0, 0, 0, 0);
    if (repeating === 'daily') {
      for (let i = 0; i < 365; i++) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }
    } else if (repeating === 'weekly') {
      for (let i = 0; i < 52; i++) {
        dates.push(new Date(d));
        d.setDate(d.getDate() + 7);
      }
    } else if (repeating === 'monthly') {
      for (let i = 0; i < 12; i++) {
        dates.push(new Date(d));
        d.setMonth(d.getMonth() + 1);
      }
    } else if (repeating === 'yearly') {
      for (let i = 0; i < 5; i++) {
        dates.push(new Date(d));
        d.setFullYear(d.getFullYear() + 1);
      }
    }
    return dates;
  };

  const addTodo = () => {
    if (!newTodoText.trim()) return;

    const timeDisplay = newTodoTime ? formatTodoTimeDisplay(newTodoTime) : undefined;
    const reminderEnabled = newTodoReminderEnabled && Boolean(newTodoTime);
    const reminderTime = reminderEnabled ? newTodoTime : undefined;
    const reminderOffset = reminderEnabled ? newTodoReminderOffset : undefined;
    const folderId = newTodoFolder || undefined;

    if (editingTodo) {
      const updatedTodo: Todo = {
        ...editingTodo,
        text: newTodoText.trim(),
        folderId,
        time: timeDisplay,
        reminderEnabled,
        reminderTime,
        reminderOffset,
      };
      setTodos(todos.map(todo => todo.id === editingTodo.id ? updatedTodo : todo));
      setEditingTodo(null);
    } else {
      const dateToUse = currentView === 'chosen-day' ? chosenDayFromCalendar : selectedDay;
      const repeating = newTodoRepeating || undefined;
      const seriesId = repeating ? `series-${Date.now()}` : undefined;

      if (repeating) {
        const dates = getDatesForRepeating(dateToUse, repeating);
        const newTodos: Todo[] = dates.map((d, i) => ({
          id: `${seriesId}-${i}`,
          text: newTodoText.trim(),
          folderId,
          time: timeDisplay,
          reminderEnabled,
          reminderTime,
          reminderOffset,
          date: formatDateString(d),
          completed: false,
          seriesId,
          repeating,
        }));
        setTodos([...todos, ...newTodos]);
      } else {
        const newTodo: Todo = {
          id: Date.now().toString(),
          text: newTodoText.trim(),
          folderId,
          time: timeDisplay,
          reminderEnabled,
          reminderTime,
          reminderOffset,
          date: formatDateString(dateToUse),
          completed: false,
        };
        setTodos([...todos, newTodo]);
      }
    }

    setNewTodoText('');
    setNewTodoFolder('');
    setNewTodoTime('');
    setNewTodoReminderEnabled(false);
    setNewTodoReminderOffset('30m');
    setNewTodoRepeating('');
    setAddTodoStep(1);
    setShowAddTodoModal(false);
  };

  const addInlineTodo = () => {
    if (!inlineNewTodoText.trim()) return;

    const dateToUse = currentView === 'chosen-day' ? chosenDayFromCalendar : selectedDay;
    const newTodo: Todo = {
      id: Date.now().toString(),
      text: inlineNewTodoText.trim(),
      date: formatDateString(dateToUse),
      completed: false,
    };
    setTodos([...todos, newTodo]);
    setInlineNewTodoText('');
    requestAnimationFrame(() => notepadInputRef.current?.focus());
  };

  const saveInlineEdit = (todoId: string) => {
    const trimmed = editingInlineText.trim();
    if (!trimmed) {
      deleteTodo(todoId);
    } else {
      setTodos(todos.map(todo => todo.id === todoId ? { ...todo, text: trimmed } : todo));
    }
    setEditingInlineTodoId(null);
    setEditingInlineText('');
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
    if (!editingTodo) return;
    setDatePickForTodoId(editingTodo.id);
    setCurrentMonth(new Date(editingTodo.date + 'T00:00:00'));
    setShowAddTodoModal(false);
    setCurrentView('monthly');
    setEditingTodo(null); // Modal ist zu, State aufräumen
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
  const displayWeekRange = useMemo(() => formatWeekRangeLine(displayDay), [displayDayKey]);

  const isDisplayToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = new Date(displayDay);
    day.setHours(0, 0, 0, 0);
    return day.getTime() === today.getTime();
  }, [displayDayKey]);

  const currentTodos = useMemo(
    () => getTodosForDay(displayDay),
    [todos, displayDayKey]
  );

  const monthTodos = useMemo(
    () => getTodosForMonth(currentMonth),
    [todos, currentMonth.getFullYear(), currentMonth.getMonth()]
  );

  const daysInMonth = useMemo(
    () => getDaysInMonth(currentMonth),
    [currentMonth.getFullYear(), currentMonth.getMonth()]
  );

  let todoListAnimIndex = 0;
  const renderTodoRow = (todo: Todo, animIndex?: number) => {
    const index = animIndex !== undefined ? animIndex : todoListAnimIndex++;
    const folderColor = getFolderColor(todo.folderId);
    const isOverdueTask = isOverdue(todo) && !todo.completed;
    const isEditing = editingInlineTodoId === todo.id;

    return (
      <div
        key={`${formatDateString(displayDay)}-${todo.id}`}
        id={`todo-item-wrapper-${todo.id}`}
        data-todo-row
        className="group relative flex items-start gap-3 px-1 py-1.5 min-h-[32px]"
        style={{
          animation: `slideUpFromBottom 0.35s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.04}s both`,
        }}
      >
        <button
          type="button"
          id={`todo-circle-${todo.id}`}
          onClick={() => toggleTodoComplete(todo.id)}
          className={`mt-0.5 w-[22px] h-[22px] rounded-full border-[1.5px] flex-shrink-0 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222]/30 ${
            todo.completed ? 'border-transparent' : ''
          }`}
          style={{
            borderColor: isOverdueTask ? '#EF4444' : folderColor,
            backgroundColor: todo.completed ? (isOverdueTask ? '#EF4444' : folderColor) : 'transparent',
          }}
          aria-label={todo.completed ? 'Als offen markieren' : 'Als erledigt markieren'}
        />

        <div id={`todo-content-${todo.id}`} className="flex-1 min-w-0 pt-0.5">
          {todo.time && !isEditing && (
            <span id={`todo-time-${todo.id}`} className={`text-xs text-[#7D7D7D] block ${todo.completed ? 'opacity-50' : ''}`}>
              {todo.time}
            </span>
          )}
          {isEditing ? (
            <textarea
              value={editingInlineText}
              onChange={(e) => {
                setEditingInlineText(e.target.value);
                const ta = e.target;
                ta.style.height = 'auto';
                ta.style.height = `${ta.scrollHeight}px`;
              }}
              onBlur={() => saveInlineEdit(todo.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  saveInlineEdit(todo.id);
                }
                if (e.key === 'Escape') {
                  setEditingInlineTodoId(null);
                  setEditingInlineText('');
                }
              }}
              className="w-full bg-transparent text-[#222222] text-[17px] leading-[1.45] resize-none overflow-hidden outline-none border-none p-0"
              rows={1}
              autoFocus
            />
          ) : (
            <button
              type="button"
              id={`todo-text-${todo.id}`}
              onClick={() => {
                setEditingInlineTodoId(todo.id);
                setEditingInlineText(todo.text);
              }}
              className={`block w-full text-left text-[17px] leading-[1.45] text-[#222222] bg-transparent ${
                todo.completed ? 'line-through opacity-45' : ''
              } ${isOverdueTask ? 'text-red-600' : ''}`}
            >
              {todo.text}
            </button>
          )}
          {isOverdueTask && !isEditing && (
            <span
              id={`todo-overdue-date-${todo.id}`}
              className="block text-xs text-red-500 mt-0.5 text-left tabular-nums"
            >
              {getOverdueOriginalDate(todo)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            id={`edit-todo-${todo.id}`}
            onClick={() => startEditTodo(todo)}
            className="mt-0.5 p-1 rounded-md text-[#7D7D7D] opacity-50 sm:opacity-0 sm:group-hover:opacity-100 hover:text-[#222222] transition-opacity"
            aria-label="Details bearbeiten"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
          <button
            type="button"
            id={`delete-todo-${todo.id}`}
            onClick={() => requestDeleteTodo(todo)}
            className="mt-0.5 p-1 rounded-md text-[#7D7D7D] opacity-50 sm:opacity-0 sm:group-hover:opacity-100 hover:text-red-500 transition-opacity"
            aria-label="Löschen"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    );
  };

  const todoListNodes = currentTodos.map((todo) => renderTodoRow(todo));

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
    <main id="main-container" className="min-h-screen bg-[#F0F0F0] py-6 pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]">
      <div id="app-wrapper" className="max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-5xl mx-auto px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
        <PushNotificationBanner
          status={push.status}
          isSubscribed={push.isSubscribed}
          error={push.error}
          syncStatus={push.syncStatus}
          onSubscribe={() => {
            void push.subscribe();
          }}
          onUnsubscribe={() => {
            void push.unsubscribe();
          }}
          canUsePush={push.canUsePush}
        />
        {/* Header */}
        <div id="header-section" className="text-center mb-[clamp(1.5rem,4vw,4.5rem)]">
          {currentView === 'dashboard' || currentView === 'chosen-day' ? (
            <div className="relative mb-2 flex items-center justify-center pb-6 md:pb-7">
              <button
                type="button"
                id="entry-area-switch-btn"
                onClick={() => {
                  if (typeof window !== 'undefined') localStorage.removeItem(BLUME_ENTRY_AREA_KEY);
                  setEntryArea('picker');
                }}
                className="absolute left-0 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-xl text-[#222222] transition-colors hover:bg-gray-200/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222]"
                aria-label="Zur Bereichsauswahl"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </button>
              <h1 id="brand-logo" className="text-[clamp(1.5rem,4vw,4.5rem)] font-bold text-[#222222]">
                Blumè.
              </h1>
              <p
                id="week-range-label"
                className="absolute -bottom-5 left-0 right-0 text-center text-[clamp(0.75rem,1.6vw,0.875rem)] font-medium tracking-tight text-[#7D7D7D] md:-bottom-6"
              >
                {displayWeekRange}
              </p>
            </div>
          ) : (
            <div id="month-header" className="flex items-center justify-between mb-2 relative">
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
          )}
        </div>

        {/* Dashboard View and Chosen Day View */}
        {(currentView === 'dashboard' || currentView === 'chosen-day') && (
          <div
            id="dashboard-view"
            className="space-y-4 touch-pan-y"
            onPointerDown={handleDaySwipePointerDown}
            onPointerUp={handleDaySwipePointerUp}
            onPointerCancel={handleDaySwipePointerCancel}
          >
            {/* Liquid Glass Top Bar — Datum & + */}
            <div
              id="top-glass-bar"
              className="liquid-glass-top-bar flex items-center justify-between rounded-[28px] px-5 py-3.5"
            >
              <div
                id="date-display"
                className={`flex flex-col day-view-content ${isDisplayToday ? 'text-[#222222]' : 'text-[#222222]'}`}
                key={displayDayKey}
              >
                <span id="day-number" className="text-[clamp(1.75rem,5vw,2.5rem)] font-bold leading-none tracking-tight">
                  {displayDay.getDate()}.
                </span>
                <span id="month-name" className="text-[clamp(0.8rem,2vw,0.95rem)] text-[#7D7D7D] font-medium mt-0.5">
                  {getWeekdayName(displayDay)}, {months[displayDay.getMonth()]}
                </span>
              </div>

              <button
                id="quick-add-btn"
                onClick={() => {
                  setAddTodoStep(1);
                  setNewTodoText('');
                  setNewTodoFolder('');
                  setNewTodoTime('');
                  setNewTodoReminderEnabled(false);
                  setNewTodoReminderOffset('30m');
                  setNewTodoRepeating('');
                  setEditingTodo(null);
                  setShowAddTodoModal(true);
                }}
                className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#222222]/8 text-[#222222] transition-all hover:bg-[#222222]/14 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222]/30"
                aria-label="Neues To-Do mit Details"
              >
                <span id="plus-icon" className="text-[1.75rem] font-light leading-none">+</span>
              </button>
            </div>

            {/* Folder Modal (add/manage folders + delete) */}
            {showFolderModal && (
              <div id="folder-modal-overlay" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={() => setShowFolderModal(false)}>
                <div id="folder-modal" className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <h2 id="folder-modal-title" className="text-xl font-bold text-[#222222] mb-4">Ordner</h2>
                  <div id="add-folder-section" className="mb-4">
                    <h3 id="add-folder-title" className="text-sm font-semibold text-[#222222] mb-2">Neuer Ordner</h3>
                    <input
                      id="new-folder-name-input"
                      type="text"
                      value={newFolderName}
                      onChange={(e) => setNewFolderName(e.target.value)}
                      placeholder="Ordnername"
                      className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-[#222222]"
                    />
                    <div id="color-picker-section" className="mb-2">
                      <label id="color-picker-label" className="block text-sm font-medium text-[#222222] mb-2">Farbe</label>
                      <div id="color-picker-wrapper" className="flex items-center gap-3">
                        <input
                          id="custom-color-picker"
                          type="color"
                          value={newFolderColor}
                          onChange={(e) => setNewFolderColor(e.target.value)}
                          className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                        />
                      </div>
                    </div>
                    <button
                      id="add-folder-btn"
                      onClick={addFolder}
                      className="w-full px-4 py-2 bg-[#222222] text-white rounded hover:bg-[#333333] transition-colors"
                    >
                      Hinzufügen
                    </button>
                  </div>
                  <h3 className="text-sm font-semibold text-[#222222] mb-2">Deine Ordner</h3>
                  <div id="folder-list" className="space-y-2 max-h-40 overflow-y-auto">
                    {folders.map(folder => (
                      <div key={folder.id} id={`folder-item-${folder.id}`} className="flex items-center justify-between gap-2 px-3 py-2 rounded hover:bg-gray-50">
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
                          <span className="text-[#222222] truncate">{folder.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteFolder(folder.id)}
                          className="p-1.5 rounded text-[#7D7D7D] hover:text-red-500 hover:bg-red-50 flex-shrink-0"
                          title="Ordner löschen"
                          aria-label="Ordner löschen"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                            <line x1="10" y1="11" x2="10" y2="17" />
                            <line x1="14" y1="11" x2="14" y2="17" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Add Folder Modal (standalone – e.g. when opened from add-todo) */}
            {showAddFolderFromTodoModal && (
              <div id="add-folder-from-todo-overlay" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]" onClick={() => setShowAddFolderFromTodoModal(false)}>
                <div id="add-folder-from-todo-modal" className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-xl font-bold text-[#222222] mb-4">Ordner hinzufügen</h2>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e) => setNewFolderName(e.target.value)}
                    placeholder="Ordnername"
                    className="w-full px-3 py-2 border border-gray-300 rounded mb-2 text-[#222222]"
                  />
                  <div className="mb-2">
                    <label className="block text-sm font-medium text-[#222222] mb-2">Farbe</label>
                    <input
                      type="color"
                      value={newFolderColor}
                      onChange={(e) => setNewFolderColor(e.target.value)}
                      className="w-16 h-16 rounded-lg border-2 border-gray-300 cursor-pointer"
                    />
                  </div>
                  <button
                    onClick={() => {
                      addFolder();
                      setShowAddFolderFromTodoModal(false);
                    }}
                    className="w-full px-4 py-2 bg-[#222222] text-white rounded hover:bg-[#333333] transition-colors"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            )}

            {/* Add Todo Modal (steps: 1 To-Do → 2 Ordner → 3 Wiederholen → 4 Zeit + Set) */}
            {showAddTodoModal && (
              <div id="add-todo-modal-overlay" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setShowAddTodoModal(false); setAddTodoStep(1); setNewTodoRepeating(''); }}>
                <div id="add-todo-modal" className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  {/* Step 1: Dein To-Do */}
                  {addTodoStep === 1 && !editingTodo && (
                    <>
                      <h2 id="add-todo-modal-title" className="text-xl font-bold text-[#222222] text-center mb-6">Dein To-Do</h2>
                      <div id="add-todo-form" className="space-y-6">
                        <textarea
                          id="todo-text-input"
                          value={newTodoText}
                          onChange={(e) => {
                            setNewTodoText(e.target.value);
                            const ta = e.target;
                            ta.style.height = 'auto';
                            ta.style.height = ta.scrollHeight + 'px';
                          }}
                          placeholder="Was möchtest du erledigen?"
                          rows={1}
                          className="w-full min-h-[3rem] max-h-48 px-4 py-3 text-lg border-2 border-gray-200 rounded-xl text-[#222222] focus:border-[#222222] focus:outline-none transition-colors resize-none overflow-y-auto box-border"
                          autoFocus
                        />
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={() => newTodoText.trim() && setAddTodoStep(2)}
                            disabled={!newTodoText.trim()}
                            className="w-14 h-14 rounded-full border-2 border-[#222222] flex items-center justify-center text-[#222222] hover:bg-[#222222] hover:text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-[#222222]"
                            aria-label="Weiter"
                          >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 12h14M12 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Step 2: Ordner */}
                  {addTodoStep === 2 && !editingTodo && (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <button
                          type="button"
                          onClick={() => setAddTodoStep(1)}
                          className="text-sm text-[#7D7D7D] hover:text-[#222222] flex items-center gap-1"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                          </svg>
                          Zurück
                        </button>
                        <button
                          id="add-folder-from-todo-btn"
                          type="button"
                          onClick={(e) => { e.stopPropagation(); setShowFolderModal(true); }}
                          className="p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-[#222222] text-sm"
                          title="Ordner hinzufügen"
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                          </svg>
                          Ordner hinzufügen
                        </button>
                      </div>
                      <h2 id="add-todo-modal-title" className="text-xl font-bold text-[#222222] text-center mb-6">Ordner</h2>
                      <div id="folder-options" className="grid grid-cols-2 gap-2 mb-6">
                        <button
                          id="folder-option-none"
                          onClick={() => setNewTodoFolder('')}
                          className={`min-h-[3.25rem] px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                            !newTodoFolder ? 'border-[#222222] bg-gray-50 text-[#222222]' : 'border-gray-200 text-[#222222] hover:border-gray-300'
                          }`}
                        >
                          /
                        </button>
                        {folders.map(folder => (
                          <button
                            key={folder.id}
                            id={`folder-option-${folder.id}`}
                            onClick={() => setNewTodoFolder(folder.id)}
                            className={`min-h-[3.25rem] px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                              newTodoFolder === folder.id ? 'border-[#222222] bg-gray-50 text-[#222222]' : 'border-gray-200 text-[#222222] hover:border-gray-300'
                            }`}
                          >
                            <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
                            <span className="truncate">{folder.name}</span>
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setAddTodoStep(3)}
                          className="w-14 h-14 rounded-full border-2 border-[#222222] flex items-center justify-center text-[#222222] hover:bg-[#222222] hover:text-white transition-colors"
                          aria-label="Weiter"
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step 3: Wiederholen? */}
                  {addTodoStep === 3 && !editingTodo && (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        <button
                          type="button"
                          onClick={() => setAddTodoStep(2)}
                          className="text-sm text-[#7D7D7D] hover:text-[#222222] flex items-center gap-1"
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                          </svg>
                          Zurück
                        </button>
                        <span />
                      </div>
                      <h2 id="add-todo-modal-title" className="text-xl font-bold text-[#222222] text-center mb-6">Wiederholen?</h2>
                      <div className="grid grid-cols-2 gap-2 mb-6">
                        {(['', 'daily', 'weekly', 'monthly', 'yearly'] as const).map((value) => (
                          <button
                            key={value || 'none'}
                            type="button"
                            onClick={() => setNewTodoRepeating(value)}
                            className={`min-h-[3.25rem] px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all ${
                              newTodoRepeating === value
                                ? 'border-[#222222] bg-gray-50 text-[#222222]'
                                : 'border-gray-200 text-[#7D7D7D] hover:border-gray-300'
                            }`}
                          >
                            {value === '' ? 'Kein' : value === 'daily' ? 'Täglich' : value === 'weekly' ? 'Wöchentlich' : value === 'monthly' ? 'Monatlich' : 'Jährlich'}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-center">
                        <button
                          type="button"
                          onClick={() => setAddTodoStep(4)}
                          className="w-14 h-14 rounded-full border-2 border-[#222222] flex items-center justify-center text-[#222222] hover:bg-[#222222] hover:text-white transition-colors"
                          aria-label="Weiter"
                        >
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </>
                  )}

                  {/* Step 4: Zeit + Set (or Edit view) */}
                  {(addTodoStep === 4 || editingTodo) && (
                    <>
                      <div className="flex items-center justify-between mb-6">
                        {editingTodo ? (
                          <span />
                        ) : (
                          <button
                            type="button"
                            onClick={() => setAddTodoStep(3)}
                            className="text-sm text-[#7D7D7D] hover:text-[#222222] flex items-center gap-1"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M19 12H5M12 19l-7-7 7-7" />
                            </svg>
                            Zurück
                          </button>
                        )}
                        {editingTodo && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setShowFolderModal(true); }}
                            className="p-2 rounded-lg hover:bg-gray-100 flex items-center gap-2 text-[#222222] text-sm"
                            title="Ordner hinzufügen"
                          >
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                            </svg>
                            Ordner hinzufügen
                          </button>
                        )}
                      </div>
                      <h2 id="add-todo-modal-title" className="text-xl font-bold text-[#222222] text-center mb-6">
                        {editingTodo ? 'Aufgabe bearbeiten' : 'Zeit & Erinnerung'}
                      </h2>
                      <div className="space-y-5">
                        {editingTodo && (
                          <>
                            <div id="todo-text-edit-field">
                              <label id="todo-text-edit-label" className="block text-sm font-medium text-[#7D7D7D] mb-2">Text</label>
                              <textarea
                                id="todo-text-edit-input"
                                value={newTodoText}
                                onChange={(e) => {
                                  setNewTodoText(e.target.value);
                                  const ta = e.target;
                                  ta.style.height = 'auto';
                                  ta.style.height = ta.scrollHeight + 'px';
                                }}
                                placeholder="To-Do Text"
                                rows={2}
                                className="w-full min-h-[3rem] max-h-48 px-4 py-3 border-2 border-gray-200 rounded-xl text-[#222222] focus:border-[#222222] focus:outline-none transition-colors resize-none overflow-y-auto box-border"
                              />
                            </div>
                            <div id="todo-date-move-field">
                              <label className="block text-sm font-medium text-[#7D7D7D] mb-2">Tag</label>
                              <div className="flex items-center gap-2">
                                <span className="text-[#222222]">
                                  {editingTodo.date && (() => {
                                    const d = new Date(editingTodo.date + 'T00:00:00');
                                    return `${d.getDate()}. ${months[d.getMonth()]}`;
                                  })()}
                                </span>
                                <button
                                  type="button"
                                  onClick={startPickDateForTodo}
                                  className="px-3 py-2 border-2 border-gray-200 rounded-xl text-sm text-[#222222] hover:border-[#222222] hover:bg-gray-50 transition-colors font-medium flex items-center gap-2"
                                >
                                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                                    <line x1="16" y1="2" x2="16" y2="6" />
                                    <line x1="8" y1="2" x2="8" y2="6" />
                                    <line x1="3" y1="10" x2="21" y2="10" />
                                  </svg>
                                  Tag ändern
                                </button>
                              </div>
                              <p className="text-xs text-[#7D7D7D] mt-1">Öffnet die Monatsansicht zum Auswählen eines neuen Tags.</p>
                            </div>
                            <div id="todo-folder-field">
                              <label id="todo-folder-label" className="block text-sm font-medium text-[#7D7D7D] mb-2">Ordner</label>
                            <div id="folder-options" className="grid grid-cols-2 gap-2">
                              <button
                                id="folder-option-none"
                                onClick={() => setNewTodoFolder('')}
                                className={`min-h-[3.25rem] px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                                  !newTodoFolder ? 'border-[#222222] bg-gray-50 text-[#222222]' : 'border-gray-200 text-[#222222] hover:border-gray-300'
                                }`}
                              >
                                /
                              </button>
                              {folders.map(folder => (
                                <button
                                  key={folder.id}
                                  id={`folder-option-${folder.id}`}
                                  onClick={() => setNewTodoFolder(folder.id)}
                                  className={`min-h-[3.25rem] px-4 py-3 rounded-xl border-2 transition-all flex items-center justify-center gap-2 text-sm font-medium ${
                                    newTodoFolder === folder.id ? 'border-[#222222] bg-gray-50 text-[#222222]' : 'border-gray-200 text-[#222222] hover:border-gray-300'
                                  }`}
                                >
                                  <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: folder.color }} />
                                  <span className="truncate">{folder.name}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                          </>
                        )}
                        <div id="todo-time-field" className="w-full min-w-0 max-w-full">
                          <label id="todo-time-label" className="block text-sm font-medium text-[#7D7D7D] mb-2">
                            Zeit
                          </label>
                          <div className="flex w-full min-w-0 justify-center sm:justify-start">
                            <input
                              id="todo-time-input"
                              type="time"
                              value={newTodoTime || ''}
                              onChange={(e) => {
                                const value = e.target.value || '';
                                setNewTodoTime(value);
                                if (!value) setNewTodoReminderEnabled(false);
                              }}
                              className="box-border min-w-0 w-full max-w-[min(100%,10.5rem)] sm:max-w-none text-base px-3 py-3 sm:px-4 border-2 border-gray-200 rounded-xl text-[#222222] focus:border-[#222222] focus:outline-none transition-colors"
                            />
                          </div>
                        </div>
                        <div id="todo-reminder-field" className="w-full min-w-0 max-w-full rounded-2xl border border-gray-200 bg-[#FAFAFA] p-4">
                          <div className="flex items-center justify-between gap-4">
                            <div>
                              <p id="todo-reminder-label" className="text-sm font-medium text-[#222222]">
                                Erinnerung
                              </p>
                              <p className="text-xs text-[#7D7D7D] mt-0.5">
                                Push-Benachrichtigung vor dem Termin
                              </p>
                            </div>
                            <button
                              type="button"
                              id="reminder-toggle"
                              role="switch"
                              aria-checked={newTodoReminderEnabled}
                              disabled={!newTodoTime}
                              onClick={() => {
                                if (!newTodoTime) return;
                                setNewTodoReminderEnabled((v) => !v);
                              }}
                              className={`relative h-8 w-14 shrink-0 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222]/30 disabled:opacity-40 ${
                                newTodoReminderEnabled ? 'bg-[#222222]' : 'bg-[#D3D3D3]'
                              }`}
                            >
                              <span
                                className={`absolute top-1 left-1 h-6 w-6 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                  newTodoReminderEnabled ? 'translate-x-6' : 'translate-x-0'
                                }`}
                              />
                            </button>
                          </div>
                          {newTodoReminderEnabled && newTodoTime && (
                            <div className="mt-4">
                              <p className="text-xs font-medium text-[#7D7D7D] mb-2.5">Wann erinnern?</p>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                {REMINDER_OFFSET_OPTIONS.map((offset) => (
                                  <button
                                    key={offset}
                                    type="button"
                                    onClick={() => setNewTodoReminderOffset(offset)}
                                    className={`min-h-[2.75rem] rounded-xl border-2 px-2 py-2 text-xs font-semibold transition-colors sm:text-sm ${
                                      newTodoReminderOffset === offset
                                        ? 'border-[#222222] bg-[#222222] text-white'
                                        : 'border-gray-200 bg-white text-[#7D7D7D] hover:border-gray-300 hover:text-[#222222]'
                                    }`}
                                  >
                                    {REMINDER_OFFSET_SHORT[offset]}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                          {!newTodoTime && (
                            <p className="mt-3 text-xs text-[#7D7D7D]">
                              Bitte zuerst eine Zeit angeben, um eine Erinnerung zu aktivieren.
                            </p>
                          )}
                        </div>
                        <div id="add-todo-actions" className="flex gap-3 pt-2">
                          <button
                            id="cancel-todo-btn"
                            onClick={() => {
                              setShowAddTodoModal(false);
                              setNewTodoText('');
                              setNewTodoFolder('');
                              setNewTodoTime('');
                              setNewTodoReminderEnabled(false);
                              setNewTodoReminderOffset('30m');
                              setNewTodoRepeating('');
                              setEditingTodo(null);
                              setAddTodoStep(1);
                            }}
                            className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-[#222222] hover:bg-gray-50 transition-colors font-medium"
                          >
                            Abbrechen
                          </button>
                          <button
                            id="save-todo-btn"
                            onClick={addTodo}
                            disabled={
                              !newTodoText.trim() ||
                              (newTodoReminderEnabled && !newTodoTime)
                            }
                            className="flex-1 px-4 py-3 bg-[#222222] text-white rounded-xl hover:bg-[#333333] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {editingTodo ? 'Speichern' : 'Set'}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Delete Todo Confirmation (repeating: only this vs all) */}
            {showDeleteTodoModal && todoToDelete && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => { setShowDeleteTodoModal(false); setTodoToDelete(null); }}>
                <div className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <h2 className="text-xl font-bold text-[#222222] mb-2">Wiederholendes To-Do löschen</h2>
                  <p className="text-[#7D7D7D] text-sm mb-6">Möchtest du nur dieses To-Do oder die gesamte Wiederholung löschen?</p>
                  <div className="space-y-2">
                    <button
                      onClick={() => deleteTodo(todoToDelete.id)}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-[#222222] hover:bg-gray-50 font-medium"
                    >
                      Nur dieses To-Do löschen
                    </button>
                    <button
                      onClick={() => todoToDelete.seriesId && deleteTodoSeries(todoToDelete.seriesId)}
                      className="w-full px-4 py-3 bg-[#222222] text-white rounded-xl hover:bg-[#333333] font-medium"
                    >
                      Alle wiederholenden löschen
                    </button>
                    <button
                      onClick={() => { setShowDeleteTodoModal(false); setTodoToDelete(null); }}
                      className="w-full px-4 py-2 text-[#7D7D7D] hover:text-[#222222] text-sm"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Notepad — Apple Reminders Style */}
            <div
              id="notes-list-container"
              className="notepad-paper overflow-hidden relative cursor-text"
              onClick={(e) => {
                if ((e.target as HTMLElement).closest('[data-todo-row]')) return;
                notepadInputRef.current?.focus();
              }}
            >
              <div id="notes-list-inner" key={displayDayKey} className="day-view-content px-4 pt-12 pb-6">
                {todoListNodes}

                <div className="flex items-start gap-3 px-1 py-1.5 min-h-[32px]">
                  <div className="mt-0.5 w-[22px] h-[22px] rounded-full border-[1.5px] border-[#C8C8C8] flex-shrink-0" aria-hidden />
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
                    placeholder="Tippe hier…"
                    rows={1}
                    className="flex-1 bg-transparent text-[#222222] text-[17px] leading-[1.45] placeholder:text-[#B0B0B0] resize-none overflow-hidden outline-none border-none p-0 pt-0.5 min-h-[24px]"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Monthly Overview */}
        {currentView === 'monthly' && (
          <div id="monthly-view" className="space-y-4" key="monthly">
            {datePickForTodoId && (
              <div className="bg-[#222222] text-white rounded-lg p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <p className="text-sm font-medium text-center sm:text-left">
                  Wähle einen Tag, um das To-Do dorthin zu verschieben.
                </p>
                <button
                  type="button"
                  onClick={() => setDatePickForTodoId(null)}
                  className="px-4 py-2 bg-white text-[#222222] rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors shrink-0"
                >
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
                
                // Get todos for this specific day (include completed so they show with a check)
                const dayDateStr = formatDateString(day);
                const dayTodos = todos.filter((todo) => {
                  if (todo.completed) {
                    return (todo.completedOn ?? todo.date) === dayDateStr;
                  }
                  return todo.date === dayDateStr;
                });
                
                // Get overdue todos that should appear on this day (if viewing today)
                const overdueTodosForDay: Todo[] = [];
                if (dayDate.getTime() === today.getTime()) {
                  overdueTodosForDay.push(...todos.filter(todo => {
                    const todoDate = new Date(todo.date + 'T00:00:00');
                    todoDate.setHours(0, 0, 0, 0);
                    return todoDate < today && !todo.completed;
                  }));
                }
                
                // Combine day todos and overdue todos (all shown; completed with check)
                const allTodosForDay = [...dayTodos, ...overdueTodosForDay];
                
                const overdueTodos = allTodosForDay.filter(todo => {
                  const todoDate = new Date(todo.date + 'T00:00:00');
                  todoDate.setHours(0, 0, 0, 0);
                  return todoDate < today && !todo.completed;
                });
                
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
                    className={`bg-white rounded-lg p-4 text-left transition-all hover:bg-gray-50 ${
                      isSelected ? 'ring-2 ring-gray-300' : ''
                    } ${isToday ? 'ring-2 ring-[#222222]' : ''}`}
                  >
                    <div id={`day-weekday-${index}`} className="text-xs text-[#7D7D7D] mb-1">
                      {weekdayName}
                    </div>
                    <div id={`day-number-${index}`} className="text-5xl font-bold text-[#222222] mb-0 leading-none">
                      {formatDate(day)}
                    </div>
                    <div id={`day-month-${index}`} className="text-sm text-[#7D7D7D] mb-2">
                      {months[day.getMonth()]}
                    </div>
                    <div id={`day-todos-${index}`} className="flex flex-wrap gap-1 items-center">
                      {allTodosForDay.slice(0, 5).map((todo, todoIndex) => {
                        const isOverdue = overdueTodos.some(ot => ot.id === todo.id);
                        const folderColor = getFolderColor(todo.folderId);
                        return (
                          <div
                            key={todo.id}
                            id={`day-todo-indicator-${index}-${todoIndex}`}
                            className={`w-3 h-3 rounded relative flex items-center justify-center ${
                              isOverdue ? 'border-2 border-red-500' : ''
                            }`}
                            style={{ 
                              backgroundColor: isOverdue ? 'transparent' : folderColor,
                              borderColor: isOverdue ? '#EF4444' : 'transparent'
                            }}
                          >
                            {todo.completed && (
                              <span className="text-[8px] text-white font-bold leading-none" style={{ textShadow: '0 0 1px rgba(0,0,0,0.5)' }}>
                                ✓
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {allTodosForDay.length > 5 && (
                        <span id={`day-more-indicator-${index}`} className="text-xs text-[#7D7D7D]">
                          (+{allTodosForDay.length - 5})
                        </span>
                      )}
                    </div>
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
        <div className="liquid-glass-nav flex w-full max-w-md items-center justify-between rounded-[28px] px-10 py-3">
          <button
            type="button"
            id="bottom-nav-todo"
            onClick={() => {
              setCurrentView('dashboard');
              setSelectedDay(new Date());
            }}
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222]/30 ${
              currentView === 'dashboard' || currentView === 'chosen-day'
                ? 'bg-[#222222]/10 text-[#222222] scale-105'
                : 'text-[#7D7D7D] hover:text-[#222222] active:scale-95'
            }`}
            aria-label="To-Do"
            aria-current={currentView === 'dashboard' || currentView === 'chosen-day' ? 'page' : undefined}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
            className={`flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#222222]/30 ${
              currentView === 'monthly'
                ? 'bg-[#222222]/10 text-[#222222] scale-105'
                : 'text-[#7D7D7D] hover:text-[#222222] active:scale-95'
            }`}
            aria-label="Kalender"
            aria-current={currentView === 'monthly' ? 'page' : undefined}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
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
