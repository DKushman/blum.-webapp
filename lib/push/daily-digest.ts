import type { ReminderOffset } from "@/lib/push/reminder-offset";

export type TodoDigestSnapshot = {
  id: string;
  date: string;
  completed: boolean;
  completedOn?: string;
};

export function countOpenTodosForDate(
  todos: TodoDigestSnapshot[],
  dateStr: string
): number {
  const target = new Date(`${dateStr}T00:00:00`);
  target.setHours(0, 0, 0, 0);

  return todos.filter((todo) => {
    if (todo.completed) return false;

    const todoDate = new Date(`${todo.date}T00:00:00`);
    todoDate.setHours(0, 0, 0, 0);

    if (todoDate < target) return true;
    return todo.date === dateStr;
  }).length;
}

export function buildDailyDigestMessage(count: number): string {
  if (count === 1) {
    return "Du hast 1 To-Do heute, setz dich ran du Esel!";
  }
  return `Du hast ${count} To-Dos heute, setz dich ran du Esel!`;
}

export type { ReminderOffset };
