export function pad(value: number): string {
  return String(value).padStart(2, '0');
}

export function ymd(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function hm(date: Date): string {
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function shiftDays(offset: number, hours = 10, minutes = 0, base = new Date()): Date {
  const next = new Date(base);
  next.setDate(next.getDate() + offset);
  next.setHours(hours, minutes, 0, 0);
  return next;
}

export function parseDateTime(date: string, time: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const clock = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (!match || !clock) return null;
  const parsed = new Date(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(clock[1]),
    Number(clock[2]),
    0,
    0,
  );
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function isSameDay(left: Date, right: Date): boolean {
  return ymd(left) === ymd(right);
}

export function greeting(date = new Date()): string {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function formatWhen(iso: string, now = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const time = date.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
  if (isSameDay(date, now)) return `Today, ${time}`;
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return `Yesterday, ${time}`;
  const day = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  return `${day}, ${time}`;
}

export function formatDay(dateStr: string): string {
  const parsed = parseDateTime(dateStr, '00:00');
  if (!parsed) return dateStr;
  return parsed.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  const minutes = Math.floor(safe / 60);
  const remain = safe % 60;
  if (minutes <= 0) return `${remain}s`;
  return `${minutes}m ${pad(remain)}s`;
}

export function inr(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function followUpMoment(date: string, time: string): Date | null {
  return parseDateTime(date, time);
}

export function isOverdueFollowUp(date: string, time: string, status: string, now = new Date()): boolean {
  if (status === 'Completed' || status === 'Cancelled') return false;
  const moment = followUpMoment(date, time);
  if (!moment) return false;
  return moment.getTime() < now.getTime();
}
