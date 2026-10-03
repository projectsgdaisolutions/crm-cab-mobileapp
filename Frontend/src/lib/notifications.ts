import { formatWhen, isOverdueFollowUp, ymd } from './dates';
import type { AppData } from '../types';

export interface NotificationPrefs {
  reminders: boolean;
  leadAlerts: boolean;
  bookingAlerts: boolean;
}

export interface DeskNotification {
  id: string;
  title: string;
  description: string;
  at: string;
  href: string;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefs = {
  reminders: true,
  leadAlerts: true,
  bookingAlerts: true,
};

export function buildNotifications(data: AppData, prefs: NotificationPrefs, now = new Date()): DeskNotification[] {
  const today = ymd(now);
  const items: DeskNotification[] = [];

  if (prefs.reminders) {
    for (const follow of data.followUps) {
      const open = follow.status === 'Pending' || follow.status === 'Rescheduled';
      if (!open) continue;
      const overdue = isOverdueFollowUp(follow.date, follow.time, follow.status, now);
      const dueToday = follow.date === today;
      if (!overdue && !dueToday) continue;
      items.push({
        id: `followup:${follow.id}`,
        title: overdue ? `Overdue follow-up · ${follow.entityName}` : `Follow-up due · ${follow.entityName}`,
        description: `${follow.date} ${follow.time} · ${follow.type} · ${follow.channel ?? 'Phone'}. ${follow.remarks}`,
        at: `${follow.date}T${follow.time}:00`,
        href: '/followups',
      });
    }
  }

  if (prefs.leadAlerts) {
    for (const lead of data.leads) {
      if (lead.status !== 'New') continue;
      items.push({
        id: `lead:${lead.id}`,
        title: `New lead · ${lead.name}`,
        description: `${lead.requirement} · ${lead.pickup} to ${lead.drop}`,
        at: lead.createdAt,
        href: `/lead/${lead.id}`,
      });
    }
  }

  if (prefs.bookingAlerts) {
    for (const booking of data.bookings) {
      if (booking.status !== 'Enquiry' && booking.status !== 'Confirmed' && booking.status !== 'Assigned') continue;
      items.push({
        id: `booking:${booking.id}`,
        title: `${booking.status} booking · ${booking.customerName}`,
        description: `${booking.travelDate} ${booking.travelTime} · ${booking.pickup} to ${booking.drop}`,
        at: booking.createdAt,
        href: `/booking/${booking.id}`,
      });
    }
  }

  for (const call of data.calls) {
    if (call.status !== 'Missed') continue;
    items.push({
      id: `call:${call.id}`,
      title: `Missed call · ${call.name}`,
      description: `${call.direction === 'incoming' ? 'Incoming' : 'Outgoing'} · ${formatWhen(call.startedAt, now)}`,
      at: call.startedAt,
      href: '/calls',
    });
  }

  return items
    .sort((left, right) => right.at.localeCompare(left.at))
    .slice(0, 40);
}
