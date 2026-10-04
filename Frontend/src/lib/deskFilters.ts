import type { TaskItem } from '../types';

export function matchesQuery(haystack: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle);
}

/** Empty day keeps every row. A filled day matches the YYYY-MM-DD prefix. */
export function matchesOnDate(value: string | undefined, day: string): boolean {
  const wanted = day.trim();
  if (!wanted) return true;
  return (value ?? '').slice(0, 10) === wanted;
}

export function taskStats(tasks: TaskItem[], today: string): { open: number; dueToday: number; overdue: number } {
  const openTasks = tasks.filter((task) => task.status !== 'Done');
  return {
    open: openTasks.length,
    dueToday: openTasks.filter((task) => task.dueDate === today).length,
    overdue: openTasks.filter((task) => task.dueDate < today).length,
  };
}

export function pageRows<T>(rows: T[], shown: number): { visible: T[]; hidden: number } {
  return { visible: rows.slice(0, shown), hidden: Math.max(0, rows.length - shown) };
}
