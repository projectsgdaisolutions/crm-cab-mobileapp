import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { buildNotifications, DEFAULT_NOTIFICATION_PREFS, type DeskNotification, type NotificationPrefs } from '../lib/notifications';
import { useStore } from './store';

const PREFS_KEY = 'cabcrm.prefs.v1';
const READ_KEY = 'cabcrm.notifRead.v1';

export function useNotifications() {
  const { data } = useStore();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_NOTIFICATION_PREFS);
  const [readIds, setReadIds] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([AsyncStorage.getItem(PREFS_KEY), AsyncStorage.getItem(READ_KEY)]).then(([prefsRaw, readRaw]) => {
      if (cancelled) return;
      if (prefsRaw) {
        try {
          const stored = JSON.parse(prefsRaw) as Partial<NotificationPrefs>;
          setPrefs({
            reminders: stored.reminders !== false,
            leadAlerts: stored.leadAlerts !== false,
            bookingAlerts: stored.bookingAlerts !== false,
          });
        } catch {
          // Keep the default preferences when the local file is damaged.
        }
      }
      if (readRaw) {
        try {
          const stored = JSON.parse(readRaw) as string[];
          if (Array.isArray(stored)) setReadIds(stored.filter((item) => typeof item === 'string'));
        } catch {
          // Ignore a damaged read list.
        }
      }
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const items = useMemo(() => buildNotifications(data, prefs), [data, prefs]);
  const read = useMemo(() => new Set(readIds), [readIds]);
  const unreadCount = items.filter((item) => !read.has(item.id)).length;

  const persist = useCallback(async (next: string[]) => {
    setReadIds(next);
    await AsyncStorage.setItem(READ_KEY, JSON.stringify(next));
  }, []);

  const markRead = useCallback(
    async (item: DeskNotification) => {
      if (read.has(item.id)) return;
      await persist([...readIds, item.id]);
    },
    [persist, read, readIds],
  );

  const markAllRead = useCallback(async () => {
    const next = Array.from(new Set([...readIds, ...items.map((item) => item.id)]));
    await persist(next);
  }, [items, persist, readIds]);

  return { ready, items, read, unreadCount, markRead, markAllRead };
}
