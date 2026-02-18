'use client';

import { useState } from 'react';

type Folder = {
  id: string;
  name: string;
  color: string;
};

type Todo = {
  id: string;
  text: string;
  folderId: string;
  time?: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
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
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string | null>(null);
  const [showFolderModal, setShowFolderModal] = useState(false);
  const [showAddTodoModal, setShowAddTodoModal] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderColor, setNewFolderColor] = useState('#FFB6C1');
  const [newTodoText, setNewTodoText] = useState('');
  const [newTodoFolder, setNewTodoFolder] = useState('');
  const [newTodoTime, setNewTodoTime] = useState('');
  const [editingTodo, setEditingTodo] = useState<Todo | null>(null);
  const [showTodoActions, setShowTodoActions] = useState<string | null>(null);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(null);

  // Folders state (now mutable) - start with empty array
  const [folders, setFolders] = useState<Folder[]>([]);

  // Sample todos - start with empty array
  const [todos, setTodos] = useState<Todo[]>([]);

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
    
    return todos.filter(todo => {
      if (selectedFolderFilter && todo.folderId !== selectedFolderFilter) return false;
      
      const todoDate = new Date(todo.date + 'T00:00:00');
      todoDate.setHours(0, 0, 0, 0);
      
      // If viewing today, include overdue tasks (from previous days) - these show with light red background
      if (isToday && todoDate < today) {
        return true;
      }
      
      // Otherwise, show tasks for the selected date (including completed ones)
      return todo.date === dateStr;
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

  const getFolderColor = (folderId: string) => {
    return folders.find(f => f.id === folderId)?.color || '#D3D3D3';
  };

  const getFolderName = (folderId: string) => {
    return folders.find(f => f.id === folderId)?.name || 'UNKNOWN';
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

  const toggleTodoComplete = (todoId: string) => {
    // Don't toggle if showing actions menu
    if (showTodoActions === todoId) return;
    setTodos(todos.map(todo => 
      todo.id === todoId ? { ...todo, completed: !todo.completed } : todo
    ));
  };

  const deleteTodo = (todoId: string) => {
    setTodos(todos.filter(todo => todo.id !== todoId));
    setShowTodoActions(null);
  };

  const startEditTodo = (todo: Todo) => {
    setEditingTodo(todo);
    setNewTodoText(todo.text);
    setNewTodoFolder(todo.folderId);
    setNewTodoTime(todo.time ? todo.time.replace(' Uhr', '') : '');
    setShowAddTodoModal(true);
    setShowTodoActions(null);
  };


  const handleTodoLongPress = (todoId: string) => {
    const timer = setTimeout(() => {
      setShowTodoActions(todoId);
    }, 500); // 500ms long press
    setLongPressTimer(timer);
  };

  const handleTodoPressEnd = () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }
  };

  const addTodo = () => {
    if (newTodoText.trim() && newTodoFolder) {
      const timeDisplay = newTodoTime ? newTodoTime.split(':')[0] + ' Uhr' : undefined;
      
      if (editingTodo) {
        // Update existing todo
        const updatedTodo: Todo = {
          ...editingTodo,
          text: newTodoText.trim(),
          folderId: newTodoFolder,
          time: timeDisplay,
        };
        setTodos(todos.map(todo => todo.id === editingTodo.id ? updatedTodo : todo));
        setEditingTodo(null);
      } else {
        // Create new todo
        const dateToUse = currentView === 'chosen-day' ? chosenDayFromCalendar : selectedDay;
        const dateStr = formatDateString(dateToUse);
        const newTodo: Todo = {
          id: Date.now().toString(),
          text: newTodoText.trim(),
          folderId: newTodoFolder,
          time: timeDisplay,
          date: dateStr,
          completed: false,
        };
        setTodos([...todos, newTodo]);
      }
      
      setNewTodoText('');
      setNewTodoFolder('');
      setNewTodoTime('');
      setShowAddTodoModal(false);
    }
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
      <div id="app-wrapper" className="max-w-md mx-auto px-4">
        {/* Header */}
        <div id="header-section" className="text-center mb-6">
          {currentView === 'dashboard' || currentView === 'chosen-day' ? (
            <h1 id="brand-logo" className="text-2xl font-bold text-[#222222] mb-2">
              Blumè.
            </h1>
          ) : (
            <div id="month-header" className="flex items-center justify-between mb-2 relative">
              <button
                id="prev-month-btn"
                onClick={() => navigateMonth('prev')}
                className="text-[#222222] text-xl px-4"
              >
                ←
              </button>
              <button
                id="month-selector"
                onClick={() => setShowMonthPicker(!showMonthPicker)}
                className="text-2xl font-bold text-[#222222] flex-1"
              >
                {months[currentMonth.getMonth()]}.
              </button>
              <button
                id="next-month-btn"
                onClick={() => navigateMonth('next')}
                className="text-[#222222] text-xl px-4"
              >
                →
              </button>
              
              {/* Month Picker Dropdown */}
              {showMonthPicker && (
                <div id="month-picker-dropdown" className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-white rounded-lg shadow-lg p-4 z-50 grid grid-cols-3 gap-2 min-w-[200px]">
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
              className={`text-lg ${currentView === 'dashboard' ? 'underline font-semibold' : ''} text-[#222222] transition-all`}
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
              className={`text-lg ${currentView === 'monthly' ? 'underline font-semibold' : ''} text-[#222222] transition-all`}
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
              className={`text-lg ${currentView === 'chosen-day' ? 'underline font-semibold' : ''} text-[#222222] transition-all`}
            >
              3
            </button>
          </div>
        </div>

        {/* Dashboard View and Chosen Day View */}
        {(currentView === 'dashboard' || currentView === 'chosen-day') && (
          <div id="dashboard-view" className="space-y-4" key={currentView}>
            {/* Weekday Navigation */}
            <div id="weekday-navigation-wrapper" className="-mx-4 w-screen relative">
              <div id="weekday-navigation" className="flex gap-1 px-2 w-full">
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
                      <span id={`today-label-${index}`} className="absolute -top-4 left-1/2 transform -translate-x-1/2 text-[10px] text-[#7D7D7D] whitespace-nowrap">
                        Heute
                      </span>
                    )}
                    <button
                      id={`weekday-btn-${index}`}
                      onClick={() => handleWeekdayClick(index)}
                      className={`w-full py-3 px-1 rounded-lg transition-all duration-300 ${bgColor} ${textColor} min-w-0`}
                    >
                      <span id={`weekday-text-${index}`} className="text-[10px] font-medium truncate block">
                        {day}
                      </span>
                    </button>
                  </div>
                );
              })}
              </div>
            </div>

            {/* Action Grid */}
            <div id="action-grid" className="grid grid-cols-3 gap-2">
              <button
                id="folder-filter-btn"
                onClick={() => setShowFolderModal(true)}
                className="bg-white rounded-lg p-4 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <svg
                  id="folder-icon"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#222222"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                </svg>
              </button>
              
              <div id="date-display" className="bg-white rounded-lg p-4 flex flex-col items-center justify-center">
                <span id="day-number" className="text-5xl font-bold text-[#222222] leading-none mb-0">
                  {formatDate(displayDay)}
                </span>
                <span id="month-name" className="text-sm text-[#7D7D7D]">
                  {months[displayDay.getMonth()]}
                </span>
              </div>
              
              <button
                id="quick-add-btn"
                onClick={() => setShowAddTodoModal(true)}
                className="bg-white rounded-lg p-4 flex items-center justify-center hover:bg-gray-50 transition-colors"
              >
                <span id="plus-icon" className="text-3xl font-light text-[#222222]">+</span>
              </button>
            </div>

            {/* Filter Capsule */}
            {selectedFolderFilter && (
              <div id="filter-capsule" className="flex items-center gap-2">
                <div
                  id="filter-capsule-content"
                  className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white"
                  style={{ backgroundColor: getFolderColor(selectedFolderFilter) + '20' }}
                >
                  <div
                    id="filter-capsule-color"
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: getFolderColor(selectedFolderFilter) }}
                  />
                  <span id="filter-capsule-name" className="text-sm text-[#222222]">
                    {getFolderName(selectedFolderFilter)}
                  </span>
                  <button
                    id="filter-capsule-close"
                    onClick={() => setSelectedFolderFilter(null)}
                    className="text-[#222222] hover:text-red-500"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {/* Folder Modal */}
            {showFolderModal && (
              <div id="folder-modal-overlay" className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowFolderModal(false)}>
                <div id="folder-modal" className="bg-white rounded-lg p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                  <h2 id="folder-modal-title" className="text-xl font-bold text-[#222222] mb-4">Ordner</h2>
                  
                  <div id="folder-list" className="space-y-2 mb-4 max-h-60 overflow-y-auto">
                    {folders.map(folder => (
                      <button
                        key={folder.id}
                        id={`folder-item-${folder.id}`}
                        onClick={() => {
                          setSelectedFolderFilter(folder.id);
                          setShowFolderModal(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded flex items-center gap-2 ${
                          selectedFolderFilter === folder.id ? 'bg-gray-100' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div
                          id={`folder-color-${folder.id}`}
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: folder.color }}
                        />
                        <span id={`folder-name-${folder.id}`} className="text-[#222222]">{folder.name}</span>
                      </button>
                    ))}
                  </div>
                  
                    <div id="add-folder-section" className="border-t pt-4">
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
                      <label id="color-picker-label" className="block text-sm font-medium text-[#222222] mb-2">
                        Farbe
                      </label>
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
                </div>
              </div>
            )}

            {/* Add Todo Modal */}
            {showAddTodoModal && (
              <div id="add-todo-modal-overlay" className="fixed inset-0 bg-black bg-opacity-50 flex items-end z-50" onClick={() => setShowAddTodoModal(false)}>
                <div id="add-todo-modal" className="bg-white rounded-t-2xl p-6 w-full max-w-md mx-auto shadow-2xl" onClick={(e) => e.stopPropagation()}>
                  <div id="modal-drag-handle" className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4"></div>
                  <h2 id="add-todo-modal-title" className="text-xl font-bold text-[#222222] mb-6">
                    {editingTodo ? 'Aufgabe bearbeiten' : 'Neue Aufgabe'}
                  </h2>
                  
                  <div id="add-todo-form" className="space-y-5">
                    <div id="todo-text-field">
                      <input
                        id="todo-text-input"
                        type="text"
                        value={newTodoText}
                        onChange={(e) => setNewTodoText(e.target.value)}
                        placeholder="Was möchtest du erledigen?"
                        className="w-full px-4 py-3 text-lg border-2 border-gray-200 rounded-xl text-[#222222] focus:border-[#222222] focus:outline-none transition-colors"
                        autoFocus
                      />
                    </div>
                    
                    <div id="todo-folder-field">
                      <label id="todo-folder-label" className="block text-sm font-medium text-[#7D7D7D] mb-2">
                        Ordner
                      </label>
                      <div id="folder-options" className="grid grid-cols-2 gap-2">
                        {folders.map(folder => (
                          <button
                            key={folder.id}
                            id={`folder-option-${folder.id}`}
                            onClick={() => setNewTodoFolder(folder.id)}
                            className={`px-4 py-3 rounded-xl border-2 transition-all flex items-center gap-2 ${
                              newTodoFolder === folder.id
                                ? 'border-[#222222] bg-gray-50'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div
                              id={`folder-option-color-${folder.id}`}
                              className="w-4 h-4 rounded-full flex-shrink-0"
                              style={{ backgroundColor: folder.color }}
                            />
                            <span id={`folder-option-name-${folder.id}`} className="text-sm font-medium text-[#222222]">
                              {folder.name}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                    
                    <div id="todo-time-field">
                      <label id="todo-time-label" className="block text-sm font-medium text-[#7D7D7D] mb-2">
                        Zeit (optional)
                      </label>
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
                          setEditingTodo(null);
                        }}
                        className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl text-[#222222] hover:bg-gray-50 transition-colors font-medium"
                      >
                        Abbrechen
                      </button>
                      <button
                        id="save-todo-btn"
                        onClick={addTodo}
                        disabled={!newTodoText.trim() || !newTodoFolder}
                        className="flex-1 px-4 py-3 bg-[#222222] text-white rounded-xl hover:bg-[#333333] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {editingTodo ? 'Speichern' : 'Hinzufügen'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notes List */}
            <div id="notes-list-container" className="overflow-hidden relative">
              <div id="notes-list-inner" className="space-y-2">
                {currentTodos.map((todo, index) => {
                  const folderColor = getFolderColor(todo.folderId);
                  const isOverdueTask = isOverdue(todo);
                  
                  return (
                    <div
                      key={`${displayDay.toISOString()}-${todo.id}`}
                      id={`todo-item-${todo.id}`}
                      className={`rounded-lg p-4 flex items-center gap-3 cursor-pointer hover:bg-gray-50 transition-colors relative ${
                        isOverdueTask ? 'bg-red-50' : 'bg-white'
                      }`}
                      onClick={() => toggleTodoComplete(todo.id)}
                      onTouchStart={() => handleTodoLongPress(todo.id)}
                      onTouchEnd={handleTodoPressEnd}
                      onMouseDown={() => handleTodoLongPress(todo.id)}
                      onMouseUp={handleTodoPressEnd}
                      onMouseLeave={handleTodoPressEnd}
                      style={{
                        animation: `slideUpFromBottom 0.4s cubic-bezier(0.4, 0, 0.2, 1) ${index * 0.05}s both`,
                      }}
                    >
                      {/* Todo Actions Menu */}
                      {showTodoActions === todo.id && (
                        <div 
                          id={`todo-actions-${todo.id}`}
                          className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-lg border border-gray-200 z-50 min-w-[120px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            id={`edit-todo-${todo.id}`}
                            onClick={() => startEditTodo(todo)}
                            className="w-full px-4 py-2 text-left text-sm text-[#222222] hover:bg-gray-50 rounded-t-lg"
                          >
                            Bearbeiten
                          </button>
                          <button
                            id={`delete-todo-${todo.id}`}
                            onClick={() => deleteTodo(todo.id)}
                            className="w-full px-4 py-2 text-left text-sm text-red-500 hover:bg-gray-50 rounded-b-lg"
                          >
                            Löschen
                          </button>
                        </div>
                      )}
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
                
                // Get todos for this specific day (only incomplete ones for the grid)
                const dayDateStr = formatDateString(day);
                const dayTodos = todos.filter(todo => {
                  return todo.date === dayDateStr && !todo.completed;
                });
                
                // Get overdue todos that should appear on this day (if viewing today)
                const overdueTodosForDay: Todo[] = [];
                if (dayDate.getTime() === today.getTime()) {
                  // If this is today, include overdue todos from previous days (only incomplete)
                  overdueTodosForDay.push(...todos.filter(todo => {
                    const todoDate = new Date(todo.date + 'T00:00:00');
                    todoDate.setHours(0, 0, 0, 0);
                    return todoDate < today && !todo.completed;
                  }));
                }
                
                // Combine day todos and overdue todos (only incomplete for grid display)
                const allTodosForDay = [...dayTodos, ...overdueTodosForDay];
                
                const overdueTodos = allTodosForDay.filter(todo => {
                  const todoDate = new Date(todo.date + 'T00:00:00');
                  todoDate.setHours(0, 0, 0, 0);
                  return todoDate < today;
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
                    <div id={`day-todos-${index}`} className="flex flex-wrap gap-1">
                      {allTodosForDay.slice(0, 5).map((todo, todoIndex) => {
                        const isOverdue = overdueTodos.some(ot => ot.id === todo.id);
                        return (
                          <div
                            key={todo.id}
                            id={`day-todo-indicator-${index}-${todoIndex}`}
                            className={`w-3 h-3 rounded ${
                              isOverdue ? 'border-2 border-red-500' : ''
                            }`}
                            style={{ 
                              backgroundColor: isOverdue ? 'transparent' : getFolderColor(todo.folderId),
                              borderColor: isOverdue ? '#EF4444' : 'transparent'
                            }}
                          />
                        );
                      })}
                      {allTodosForDay.length > 5 && (
                        <span id={`day-more-indicator-${index}`} className="text-xs text-[#7D7D7D]">
                          ...
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
