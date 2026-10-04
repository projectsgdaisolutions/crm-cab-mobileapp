import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const PASSWORD_KEY = 'cabcrm.localPasswords.v1';
const DEVICE_KEY = 'cabcrm.device.v1';
const ACCESS_KEY = 'cabcrm.access.v1';

export async function loadLocalPasswords(): Promise<Record<string, string>> {
  const raw = await AsyncStorage.getItem(PASSWORD_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export async function saveLocalPassword(email: string, password: string): Promise<void> {
  const current = await loadLocalPasswords();
  current[email.trim().toLowerCase()] = password;
  await AsyncStorage.setItem(PASSWORD_KEY, JSON.stringify(current));
}

export interface DeviceRegistration {
  id: string;
  token: string;
  platform: string;
  registeredAt: string;
}

export async function loadDeviceRegistration(): Promise<DeviceRegistration> {
  const raw = await AsyncStorage.getItem(DEVICE_KEY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as DeviceRegistration;
      if (parsed.token && parsed.id) return parsed;
    } catch {
      // Create a fresh local registration below.
    }
  }
  const created: DeviceRegistration = {
    id: `DEV-${Date.now().toString(36).toUpperCase()}`,
    token: `local-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`,
    platform: Platform.OS,
    registeredAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(DEVICE_KEY, JSON.stringify(created));
  return created;
}

export const ACCESS_KEYS = [
  { key: 'customers.view', label: 'View customers' },
  { key: 'leads.edit', label: 'Edit leads' },
  { key: 'followups.manage', label: 'Manage follow-ups' },
  { key: 'bookings.assign', label: 'Assign driver and vehicle' },
  { key: 'calls.log', label: 'Log calls' },
  { key: 'recordings.upload', label: 'Upload recordings' },
  { key: 'tasks.manage', label: 'Manage tasks' },
  { key: 'team.manage', label: 'Manage team' },
] as const;

export type AccessMap = Record<string, boolean>;

export function defaultAccess(): AccessMap {
  return Object.fromEntries(ACCESS_KEYS.map((item) => [item.key, true]));
}

export async function loadAccess(): Promise<AccessMap> {
  const raw = await AsyncStorage.getItem(ACCESS_KEY);
  const base = defaultAccess();
  if (!raw) return base;
  try {
    const parsed = JSON.parse(raw) as AccessMap;
    return { ...base, ...parsed };
  } catch {
    return base;
  }
}

export async function saveAccess(next: AccessMap): Promise<void> {
  await AsyncStorage.setItem(ACCESS_KEY, JSON.stringify(next));
}
