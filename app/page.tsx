'use client';

import { useState, useEffect, useRef } from 'react';

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
  date: string; // YYYY-MM-DD format
  completed: boolean;
  seriesId?: string; // links repeating instances
  repeating?: Repeating;
};

type View = 'dashboard' | 'chosen-day' | 'monthly';

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
  const [selectedFolderFilters, setSelectedFolderFilters] = useState<string[]>([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [filterModalCheckedIds, setFilterModalCheckedIds] = useState<Set<string>>(new Set());
  const [showAddFolderFromTodoModal, setShowAddFolderFromTodoModal] = useState(false);
  const [addTodoStep, setAddTodoStep] = useState<1 | 2 | 3 | 4>(1);
  const [showAddTodoModal, setShowAddTodoModal] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#FFB6C1');
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoFolder, setNewTodoFolder] = useState('');
  const [newTodoTime, setNewTodoTime] = useState('');
  const [newTodoRepeating, setNewTodoRepeating] = useState<'' | Repeating>('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showDeleteTodoModal, setShowDeleteTodoModal] = useState(false);
  const [todoToDelete, setTodoToDelete] = useState<Todo | null>(null);
  const [todoSwipeOffsets, setTodoSwipeOffsets] = useState<Record<string, number>>({});
  const [swipeStartX, setSwipeStartX] = useState<number | null>(null);
  const [swipeStartY, setSwipeStartY] = useState<number | null>(null);
  const [swipeTodoId, setSwipeTodoId] = useState<string | null>(null);

  const SWIPE_ACTION_WIDTH = 140;

  // Ref for document-level mouse drag (so drag works when cursor leaves the row)
  const mouseDragRef = useRef<{ todoId: string; startX: number; offset: number } | null>(null);
  const didMouseDragRef = useRef(false);

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

  const getCurrentWeekdayIndex = () => {
    const dayToUse = currentView === 'chosen-day' ? chosenDayFromCalendar : selectedDay;
    const day = dayToUse.getDay();
    // Convert: Sunday (0) -> 6, Monday (1) -> 0, Tuesday (2) -> 1, etc.
    return day === 0 ? 6 : day - 1;
  };

  const formatDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getTodosForDay = (date: Date) => {
    const dateStr = formatDateString(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDate = new Date(date);
    selectedDate.setHours(0, 0, 0, 0);
    const isToday = selectedDate.getTime() === today.getTime();
    
    const filtered = todos.filter(todo => {
      if (selectedFolderFilters.length > 0) {
        const folderId = todo.folderId ?? '';
        if (!selectedFolderFilters.includes(folderId)) return false;
      }
      
      const todoDate = new Date(todo.date + 'T00:00:00');
      todoDate.setHours(0, 0, 0, 0);
      
      // Only show overdue tasks on "today" if they are not completed; completed ones stay on their original day
      if (isToday && todoDate < today && !todo.completed) return true;
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
    return folders.find(f => f.id === folderId)?.color || '#D3D3D3';
  };

  const getFolderName = (folderId?: string) => {
    if (!folderId) return '—';
    return folders.find(f => f.id === folderId)?.name || '—';
  };

  const isOverdue = (todo: Todo) => {
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
    setSelectedFolderFilters(prev => prev.filter(id => id !== folderId));
  };

  const toggleTodoComplete = (todoId: string) => {
    // Don't toggle if swipe actions are open
    if (getSwipeOffset(todoId) < 0) return;
    setTodos(todos.map(todo => 
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (todoId: string) => {
    setTodos(todos.filter(todo => todo.id !== todoId));
    setTodoSwipeOffsets(prev => ({ ...prev, [todoId]: 0 }));
    setShowDeleteTodoModal(false);
    setTodoToDelete(null);
  };

  const deleteTodoSeries = (seriesId: string) => {
    setTodos(todos.filter(todo => todo.seriesId !== seriesId));
    setTodoSwipeOffsets(prev => {
      const next = { ...prev };
      todos.filter(t => t.seriesId === seriesId).forEach(t => { next[t.id] = 0; });
      return next;
    });
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
    // Convert "18 Uhr" to "18:00" for time input
    if (todo.time) {
      const match = todo.time.match(/(\d+)/);
      setNewTodoTime(match ? `${String(match[1]).padStart(2, '0')}:00` : '');
    } else {
      setNewTodoTime('');
    }
    setAddTodoStep(4);
    setShowAddTodoModal(true);
    setTodoSwipeOffsets(prev => ({ ...prev, [todo.id]: 0 }));
  };

  const getSwipeOffset = (todoId: string) => todoSwipeOffsets[todoId] ?? 0;

  const handleSwipeStart = (todoId: string, clientX: number, clientY?: number) => {
    setSwipeStartX(clientX);
    setSwipeStartY(clientY ?? null);
    setSwipeTodoId(todoId);
    didMouseDragRef.current = false;
    mouseDragRef.current = { todoId, startX: clientX, offset: getSwipeOffset(todoId) };
  };

  const handleSwipeMove = (todoId: string, clientX: number, clientY?: number) => {
    const ref = mouseDragRef.current;
    const startX = ref?.todoId === todoId ? ref.startX : swipeStartX;
    if ((swipeTodoId !== todoId && ref?.todoId !== todoId) || startX === null) return;
    const current = ref?.todoId === todoId ? ref.offset : getSwipeOffset(todoId);
    const diff = clientX - startX; // negative when swiping left
    const newOffset = Math.min(0, Math.max(-SWIPE_ACTION_WIDTH, current + diff));
    setTodoSwipeOffsets(prev => ({ ...prev, [todoId]: newOffset }));
    setSwipeStartX(clientX);
    if (clientY !== undefined) setSwipeStartY(clientY);
    if (mouseDragRef.current?.todoId === todoId) {
      mouseDragRef.current.startX = clientX;
      mouseDragRef.current.offset = newOffset;
    }
  };

  const handleSwipeEnd = (todoId: string) => {
    const offset = getSwipeOffset(todoId);
    const snapOpen = offset < -SWIPE_ACTION_WIDTH / 2;
    setTodoSwipeOffsets(prev => ({ ...prev, [todoId]: snapOpen ? -SWIPE_ACTION_WIDTH : 0 }));
    setSwipeStartX(null);
    setSwipeStartY(null);
    setSwipeTodoId(null);
    mouseDragRef.current = null;
  };

  // Document-level mouse listeners so drag-to-swipe works when cursor leaves the row (e.g. on laptop)
  useEffect(() => {
    if (!swipeTodoId) return;

    const onDocMouseMove = (e: MouseEvent) => {
      const ref = mouseDragRef.current;
      if (!ref || ref.todoId !== swipeTodoId) return;
      didMouseDragRef.current = true;
      const diff = e.clientX - ref.startX;
      const newOffset = Math.min(0, Math.max(-SWIPE_ACTION_WIDTH, ref.offset + diff));
      setTodoSwipeOffsets(prev => ({ ...prev, [ref.todoId]: newOffset }));
      ref.startX = e.clientX;
      ref.offset = newOffset;
    };

    const onDocMouseUp = () => {
      const ref = mouseDragRef.current;
      if (!ref) return;
      const snapOpen = ref.offset < -SWIPE_ACTION_WIDTH / 2;
      setTodoSwipeOffsets(prev => ({ ...prev, [ref.todoId]: snapOpen ? -SWIPE_ACTION_WIDTH : 0 }));
      setSwipeStartX(null);
      setSwipeStartY(null);
      setSwipeTodoId(null);
      mouseDragRef.current = null;
    };

    document.addEventListener('mousemove', onDocMouseMove);
    document.addEventListener('mouseup', onDocMouseUp);
    return () => {
      document.removeEventListener('mousemove', onDocMouseMove);
      document.removeEventListener('mouseup', onDocMouseUp);
    };
  }, [swipeTodoId]);

  // On mobile: prevent default touch behavior when user is swiping horizontally (so page doesn't scroll)
  const handleTouchMove = (e: React.TouchEvent, todoId: string) => {
    if (swipeTodoId !== todoId || swipeStartX === null || swipeStartY === null) return;
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - swipeStartX);
    const deltaY = Math.abs(touch.clientY - swipeStartY);
    if (deltaX > deltaY && deltaX > 5) {
      e.preventDefault();
    }
    handleSwipeMove(todoId, touch.clientX, touch.clientY);
  };

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

    const timeDisplay = newTodoTime ? newTodoTime.split(':')[0] + ' Uhr' : undefined;
    const folderId = newTodoFolder || undefined;

    if (editingTodo) {
      const updatedTodo: Todo = {
        ...editingTodo,
        text: newTodoText.trim(),
        folderId,
        time: timeDisplay,
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
          date: formatDateString(dateToUse),
          completed: false,
        };
        setTodos([...todos, newTodo]);
      }
    }

    setNewTodoText('');
    setNewTodoFolder('');
    setNewTodoTime('');
    setNewTodoRepeating('');
    setAddTodoStep(1);
    setShowAddTodoModal(false);
  };


  const handleDayClick = (day: Date) => {
    setSelectedDay(day);
    setChosenDayFromCalendar(day); // Store the day chosen from monthly overview
    setCurrentView('chosen-day');
  };

  const handleWeekdayClick = (index: number) => {
    setIsTransitioning(true);
    const currentDate = new Date(selectedDay);
    const currentDayOfWeek = getCurrentWeekdayIndex();
    const diff = index - currentDayOfWeek;
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + diff);
    setSelectedDay(newDate);
    // Don't switch to chosen-day view when clicking weekday in dashboard
    setTimeout(() => setIsTransitioning(false), 400);
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
  const currentTodos = getTodosForDay(displayDay);
  const monthTodos = getTodosForMonth(currentMonth);
  const daysInMonth = getDaysInMonth(currentMonth);

  return (
    <main id="main-container" className="min-h-screen bg-[#F0F0F0] py-6">
      <div id="app-wrapper" className="max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl 2xl:max-w-5xl mx-auto px-4 md:px-6 lg:px-8 xl:px-12 2xl:px-16">
        {/* Header */}
        <div id="header-section" className="text-center mb-[clamp(1.5rem,4vw,4.5rem)]">
          {currentView === 'dashboard' || currentView === 'chosen-day' ? (
            <h1 id="brand-logo" className="text-[clamp(1.5rem,4vw,4.5rem)] font-bold text-[#222222] mb-2">
              Blumè.
            </h1>
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
          
          {/* View Navigation */}
          <div id="view-navigation" className="flex justify-center gap-12">
            <button
              id="dashboard-nav-btn"
              onClick={() => {
                setIsTransitioning(true);
                setCurrentView('dashboard');
                setSelectedDay(new Date()); // Always reset to current day for dashboard
                setTimeout(() => setIsTransitioning(false), 300);
              }}
              className={`text-[clamp(1.125rem,2vw,3rem)] ${currentView === 'dashboard' ? 'underline font-semibold' : ''} text-[#222222] transition-all`}
            >
              1
            </button>
            <button
              id="monthly-nav-btn"
              onClick={() => {
                setIsTransitioning(true);
                setCurrentView('monthly');
                setTimeout(() => setIsTransitioning(false), 300);
              }}
              className={`text-lg md:text-xl lg:text-2xl ${currentView === 'monthly' ? 'underline font-semibold' : ''} text-[#222222] transition-all`}
            >
              2
            </button>
            <button
              id="chosen-day-nav-btn"
              onClick={() => {
                setIsTransitioning(true);
                setSelectedDay(chosenDayFromCalendar); // Use the last day chosen from calendar
                setCurrentView('chosen-day');
                setTimeout(() => setIsTransitioning(false), 300);
              }}
              className={`text-lg md:text-xl lg:text-2xl ${currentView === 'chosen-day' ? 'underline font-semibold' : ''} text-[#222222] transition-all`}
            >
              3
            </button>
          </div>
        </div>

        {/* Dashboard View and Chosen Day View */}
        {(currentView === 'dashboard' || currentView === 'chosen-day') && (
          <div id="dashboard-view" className="space-y-[clamp(1rem,3vw,3rem)]" key={currentView}>
            {/* Weekday Navigation */}
            <div id="weekday-navigation-wrapper" className="relative">
              <div id="weekday-navigation" className="flex gap-[clamp(0.25rem,1vw,0.75rem)] w-full">
              {weekdays.map((day, index) => {
                const currentWeekdayIndex = getCurrentWeekdayIndex();
                const isSelected = index === currentWeekdayIndex;
                const distance = Math.abs(index - currentWeekdayIndex);
                
                // Check if this weekday is today
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const currentDate = new Date(displayDay);
                const currentDayOfWeek = getCurrentWeekdayIndex();
                const diff = index - currentDayOfWeek;
                currentDate.setDate(displayDay.getDate() + diff);
                currentDate.setHours(0, 0, 0, 0);
                const isToday = currentDate.getTime() === today.getTime();
                
                let bgColor = '';
                let textColor = '';
                
                if (isSelected) {
                  bgColor = 'bg-[#222222]';
                  textColor = 'text-white';
                } else if (distance === 1) {
                  bgColor = 'bg-[#D3D3D3]';
                  textColor = 'text-[#7D7D7D]';
                } else if (distance === 2) {
                  bgColor = 'bg-[#E8E8E8]';
                  textColor = 'text-[#7D7D7D]';
                } else if (distance === 3) {
                  bgColor = 'bg-[#F0F0F0]';
                  textColor = 'text-[#7D7D7D]';
                } else {
                  bgColor = 'bg-[#F5F5F5]';
                  textColor = 'text-[#7D7D7D]';
                }
                
                return (
                  <div key={day} id={`weekday-wrapper-${index}`} className="flex-1 relative min-w-0">
                    {isToday && (
                      <span id={`today-label-${index}`} className="absolute -top-4 md:-top-5 lg:-top-6 left-1/2 transform -translate-x-1/2 text-[10px] md:text-xs lg:text-sm text-[#7D7D7D] whitespace-nowrap">
                        Heute
                      </span>
                    )}
                    <button
                      id={`weekday-btn-${index}`}
                      onClick={() => handleWeekdayClick(index)}
                      className={`w-full py-[clamp(0.75rem,2vw,2.5rem)] px-[clamp(0.25rem,1vw,1rem)] rounded-lg transition-all duration-300 ${bgColor} ${textColor} min-w-0`}
                    >
                      <span id={`weekday-text-${index}`} className="text-[clamp(0.5rem,1vw,0.875rem)] font-medium truncate block">
                        {day}
                      </span>
                    </button>
                  </div>
                );
              })}
              </div>
            </div>

            {/* Action Grid */}
            <div id="action-grid" className="grid grid-cols-3 gap-2 md:gap-3 lg:gap-4 xl:gap-6 2xl:gap-8">
              <button
                id="folder-filter-btn"
                onClick={() => {
                  setFilterModalCheckedIds(new Set(selectedFolderFilters));
                  setShowFilterModal(true);
                }}
                className="bg-white rounded-lg p-[clamp(1rem,2vw,3rem)] flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <img
                  id="filter-icon"
                  src="/filter.png"
                  alt="Filter"
                  width={24}
                  height={24}
                  className="object-contain w-[clamp(1.5rem,3vw,4rem)] h-[clamp(1.5rem,3vw,4rem)]"
                />
              </button>
              
              <div id="date-display" className="bg-white rounded-lg p-[clamp(1rem,2vw,3rem)] flex flex-col items-center justify-center">
                <span id="day-number" className="text-[clamp(3rem,8vw,9rem)] font-bold text-[#222222] leading-none mb-0">
                  {formatDate(displayDay)}
                </span>
                <span id="month-name" className="text-[clamp(0.875rem,1.5vw,2.25rem)] text-[#7D7D7D]">
                  {months[displayDay.getMonth()]}
                </span>
              </div>
              
              <button
                id="quick-add-btn"
                onClick={() => {
                  setAddTodoStep(1);
                  setNewTodoText('');
                  setNewTodoFolder('');
                  setNewTodoTime('');
                  setNewTodoRepeating('');
                  setEditingTodo(null);
                  setShowAddTodoModal(true);
                }}
                className="bg-white rounded-lg p-[clamp(1rem,2vw,3rem)] flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <span id="plus-icon" className="text-[clamp(1.875rem,5vw,6rem)] font-light text-[#222222]">+</span>
              </button>
            </div>

            {/* Filter Capsule */}
            {selectedFolderFilters.length > 0 && (
              <div id="filter-capsule" className="flex flex-wrap items-center gap-2">
                {selectedFolderFilters.map(fid => (
                  <div
                    key={fid}
                    id={`filter-capsule-${fid}`}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white"
                    style={{ backgroundColor: getFolderColor(fid) + '20' }}
                  >
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: getFolderColor(fid) }}
                    />
                    <span className="text-sm text-[#222222]">{getFolderName(fid)}</span>
                    <button
                      onClick={() => setSelectedFolderFilters(prev => prev.filter(id => id !== fid))}
                      className="text-[#222222] hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
                <button
                  id="filter-capsule-close-all"
                  onClick={() => setSelectedFolderFilters([])}
                  className="text-sm text-[#7D7D7D] hover:text-[#222222]"
                >
                  Alle entfernen
                </button>
              </div>
            )}

            {/* Filter Modal (checkboxes + Filter anwenden) */}
            {showFilterModal && (
              <div id="filter-modal-overlay" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowFilterModal(false)}>
                <div id="filter-modal" className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <h2 id="filter-modal-title" className="text-xl font-bold text-[#222222] mb-4">Filter</h2>
                  <div id="filter-modal-list" className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {folders.map(folder => (
                      <div
                        key={folder.id}
                        id={`filter-row-${folder.id}`}
                        className="flex items-center gap-3 w-full px-3 py-2 rounded hover:bg-gray-50"
                      >
                        <label className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={filterModalCheckedIds.has(folder.id)}
                            onChange={() => {
                              setFilterModalCheckedIds(prev => {
                                const next = new Set(prev);
                                if (next.has(folder.id)) next.delete(folder.id);
                                else next.add(folder.id);
                                return next;
                              });
                            }}
                            className="w-4 h-4 rounded border-gray-300"
                          />
                          <div
                            className="w-4 h-4 rounded-full flex-shrink-0"
                            style={{ backgroundColor: folder.color }}
                          />
                          <span className="text-[#222222] truncate">{folder.name}</span>
                        </label>
                        <button
                          type="button"
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteFolder(folder.id); }}
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
                  <button
                    id="filter-apply-btn"
                    onClick={() => {
                      setSelectedFolderFilters(Array.from(filterModalCheckedIds));
                      setShowFilterModal(false);
                    }}
                    className="w-full px-4 py-3 bg-[#222222] text-white rounded-lg hover:bg-[#333333] transition-colors font-medium"
                  >
                    Filter anwenden
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowFolderModal(true)}
                    className="w-full mt-3 px-4 py-2 border-2 border-gray-200 rounded-lg text-[#222222] hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                    </svg>
                    Ordner hinzufügen
                  </button>
                </div>
              </div>
            )}

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
                        {editingTodo ? 'Aufgabe bearbeiten' : 'Zeit'}
                      </h2>
                      <div className="space-y-5">
                        {editingTodo && (
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
                        )}
                        <div id="todo-time-field">
                          <label id="todo-time-label" className="block text-sm font-medium text-[#7D7D7D] mb-2">Zeit (optional)</label>
                          <input
                            id="todo-time-input"
                            type="time"
                            value={newTodoTime || ''}
                            onChange={(e) => setNewTodoTime(e.target.value || '')}
                            className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-[#222222] focus:border-[#222222] focus:outline-none transition-colors"
                          />
                        </div>
                        <div id="add-todo-actions" className="flex gap-3 pt-2">
                          <button
                            id="cancel-todo-btn"
                            onClick={() => {
                              setShowAddTodoModal(false);
                              setNewTodoText('');
                              setNewTodoFolder('');
                              setNewTodoTime('');
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
                            disabled={!newTodoText.trim()}
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

            {/* Notes List */}
            <div 
              id="notes-list-container" 
              className="overflow-hidden relative"
            >
              <div id="notes-list-inner" className="space-y-2">
                {currentTodos.map((todo, index) => {
                  const folderColor = getFolderColor(todo.folderId);
                  const isOverdueTask = isOverdue(todo) && !todo.completed;
                  const swipeOffset = getSwipeOffset(todo.id);
                  const isSwipedOpen = swipeOffset < 0;
                  
                  return (
                    <div
                      key={`${displayDay.toISOString()}-${todo.id}`}
                      id={`todo-item-wrapper-${todo.id}`}
                      className="rounded-lg overflow-hidden relative"
                      style={{
                        animation: `slideUpFromBottom 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s both`,
                      }}
                    >
                      {/* Action buttons (revealed on swipe left) */}
                      <div
                        id={`todo-actions-${todo.id}`}
                        className="absolute right-0 top-0 bottom-0 w-[140px] flex z-0 rounded-r-lg overflow-hidden"
                      >
                        <button
                          id={`edit-todo-${todo.id}`}
                          onClick={() => startEditTodo(todo)}
                          className="flex-1 flex items-center justify-center bg-[#222222] text-white text-xs font-medium hover:bg-[#333333] transition-colors rounded-l-lg"
                        >
                          Bearbeiten
                        </button>
                        <button
                          id={`delete-todo-${todo.id}`}
                          onClick={() => requestDeleteTodo(todo)}
                          className="flex-1 flex items-center justify-center bg-red-500 text-white text-xs font-medium hover:bg-red-600 transition-colors rounded-r-lg"
                        >
                          Löschen
                        </button>
                      </div>

                      {/* Sliding content */}
                      <div
                        id={`todo-item-${todo.id}`}
                        className={`relative z-10 rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-transform duration-200 ease-out ${
                          isOverdueTask ? 'bg-red-50' : 'bg-white'
                        }`}
                        style={{
                          transform: `translateX(${swipeOffset}px)`,
                          touchAction: 'pan-y',
                        }}
                        onClick={() => {
                          if (didMouseDragRef.current) {
                            didMouseDragRef.current = false;
                            return;
                          }
                          if (!isSwipedOpen) toggleTodoComplete(todo.id);
                        }}
                        onTouchStart={(e) => handleSwipeStart(todo.id, e.touches[0].clientX, e.touches[0].clientY)}
                        onTouchMove={(e) => handleTouchMove(e, todo.id)}
                        onTouchEnd={() => handleSwipeEnd(todo.id)}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          handleSwipeStart(todo.id, e.clientX);
                        }}
                        onMouseMove={(e) => {
                          if (swipeTodoId === todo.id && e.buttons === 1) {
                            didMouseDragRef.current = true;
                            handleSwipeMove(todo.id, e.clientX);
                          }
                        }}
                        onMouseUp={() => handleSwipeEnd(todo.id)}
                        onMouseLeave={() => {
                          if (swipeTodoId === todo.id) handleSwipeEnd(todo.id);
                        }}
                      >
                        <div
                          id={`todo-circle-${todo.id}`}
                          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 transition-all ${
                            todo.completed ? '' : ''
                          }`}
                          style={{
                            borderColor: isOverdueTask ? '#EF4444' : folderColor,
                            backgroundColor: todo.completed ? (isOverdueTask ? '#EF4444' : folderColor) : 'transparent',
                          }}
                        />
                        
                        <div id={`todo-content-${todo.id}`} className="flex-1 min-w-0">
                          {todo.time && (
                            <span id={`todo-time-${todo.id}`} className={`text-xs text-[#7D7D7D] block ${todo.completed ? 'line-through opacity-60' : ''}`}>
                              {todo.time.includes(':') ? todo.time.split(':')[0] + ' Uhr' : todo.time}
                            </span>
                          )}
                          <span id={`todo-text-${todo.id}`} className={`text-[#222222] block ${todo.completed ? 'line-through opacity-60' : ''}`}>
                            {todo.text}
                          </span>
                          {isOverdueTask && (
                            <span id={`todo-overdue-date-${todo.id}`} className={`text-xs text-red-500 block mt-1 ${todo.completed ? 'line-through opacity-60' : ''}`}>
                              {getOverdueOriginalDate(todo)}
                            </span>
                          )}
                        </div>
                        
                        <div
                          id={`todo-tag-${todo.id}`}
                          className="px-2 py-1 rounded text-xs text-white flex-shrink-0"
                          style={{ backgroundColor: folderColor }}
                        >
                          {getFolderName(todo.folderId)}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Monthly Overview */}
        {currentView === 'monthly' && (
          <div id="monthly-view" className="space-y-4" key="monthly">
            <div id="calendar-grid" className="grid grid-cols-3 gap-2">
              {daysInMonth.map((day, index) => {
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                const dayDate = new Date(day);
                dayDate.setHours(0, 0, 0, 0);
                
                // Get todos for this specific day (include completed so they show with a check)
                const dayDateStr = formatDateString(day);
                const dayTodos = todos.filter(todo => todo.date === dayDateStr);
                
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
          overflow: hidden;
          min-height: 50px;
        }
        
        #notes-list-inner {
          position: relative;
        }
        
        #notes-list-inner > div {
          will-change: transform, opacity;
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
