import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { AppData, SessionUser } from '../types';

const DATA_KEY = 'cabcrm.desk.v1';
const SESSION_KEY = 'cabcrm.session.v1';
const API_KEY = 'cabcrm.apiBase.v1';

export async function loadDesk(): Promise<AppData | null> {
  const raw = await AsyncStorage.getItem(DATA_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AppData;
  } catch {
    return null;
  }
}

export async function saveDesk(data: AppData): Promise<void> {
  await AsyncStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export async function loadApiBase(): Promise<string | null> {
  return AsyncStorage.getItem(API_KEY);
}

export async function saveApiBase(value: string): Promise<void> {
  await AsyncStorage.setItem(API_KEY, value.trim());
}

interface StoredSession {
  token: string;
  user: SessionUser;
}

export async function loadSession(): Promise<StoredSession | null> {
  try {
    const raw = Platform.OS === 'web' ? await AsyncStorage.getItem(SESSION_KEY) : await SecureStore.getItemAsync(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as StoredSession;
    } catch {
      return null;
    }
  }
}

export async function saveSession(session: StoredSession | null): Promise<void> {
  if (!session) {
    await AsyncStorage.removeItem(SESSION_KEY);
    if (Platform.OS !== 'web') {
      try {
        await SecureStore.deleteItemAsync(SESSION_KEY);
      } catch {
        // Web and some desktop previews have no secure enclave.
      }
    }
    return;
  }
  const raw = JSON.stringify(session);
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(SESSION_KEY, raw);
    return;
  }
  try {
    await SecureStore.setItemAsync(SESSION_KEY, raw);
  } catch {
    await AsyncStorage.setItem(SESSION_KEY, raw);
  }
}
