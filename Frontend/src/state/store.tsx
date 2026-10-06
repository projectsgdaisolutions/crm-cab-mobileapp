import Constants from 'expo-constants';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { ApiError, api, pullDesk, setCsrfRefreshHandler, setUnauthorizedHandler } from '../api/client';
import type { MapperContext } from '../api/mappers';
import { toDriverVehicle } from '../api/mappers';
import { ApiError, api, pullDesk } from '../api/client';
import { createSeed, demoUser, demoUserFor, findDemoUser, isDemoLogin } from '../data/seed';
import { loadLocalPasswords } from '../lib/localAccount';
import { makeId } from '../lib/ids';
import { nextFollowUpForLead } from '../lib/scheduleSync';
import type { DeviceCall } from '../lib/syncCalls';
import { loadApiBase, loadDesk, loadDeviceToken, loadSession, saveApiBase, saveDesk, saveDeviceToken, saveSession } from '../storage/persist';
import type {
  Activity,
  AppData,
  Booking,
  CallRecord,
  CallStatus,
  Customer,
  Driver,
  FleetVehicle,
  EntityType,
  Executive,
  FollowUp,
  FollowUpStatus,
  Lead,
  LeadStatus,
  Note,
  Recording,
  RolePermission,
  SessionUser,
  SyncState,
  TaskItem,
  Vehicle,
} from '../types';

export interface CallTarget {
  name: string;
  mobile: string;
  entityType?: EntityType;
  entityId?: string;
}

export interface PendingCall extends CallTarget {
  openedNative: boolean;
}

export interface DispositionInput {
  status: CallStatus;
  durationSec: number;
  remarks: string;
  recording?: {
    uri: string;
    fileName: string;
    mimeType?: string;
  };
}

interface StoreValue {
  ready: boolean;
  session: SessionUser | null;
  csrfToken: string | null;
  data: AppData;
  apiBase: string;
  mode: 'demo' | 'api';
  notice: string | null;
  pendingCall: PendingCall | null;
  awaitingReturn: PendingCall | null;
  login: (identifier: string, password: string) => Promise<void>;
  forgotPassword: (identifier: string) => Promise<string>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  updateAdminProfile: (input: { name: string; email: string; phone?: string; timezone?: string; bio?: string }) => Promise<SessionUser>;
  loadPreferences: () => Promise<Record<string, unknown>>;
  savePreferences: (prefs: Record<string, unknown>) => Promise<Record<string, unknown>>;
  playRecording: (recording: Recording) => Promise<string>;
  logout: () => Promise<void>;
  setApiBase: (url: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearNotice: () => void;
  beginCall: (target: CallTarget, openedNative: boolean) => void;
  openDisposition: () => void;
  dismissDisposition: () => void;
  saveDisposition: (input: DispositionInput) => Promise<void>;
  saveCustomer: (input: Customer, creating: boolean) => Promise<Customer>;
  saveLead: (input: Lead, creating: boolean) => Promise<Lead>;
  addNote: (input: Omit<Note, 'id' | 'createdAt' | 'createdBy' | 'syncState'>) => Promise<Note>;
  saveFollowUp: (input: FollowUp, creating: boolean) => Promise<FollowUp>;
  saveBooking: (input: Booking, creating: boolean) => Promise<Booking>;
  saveExecutive: (input: Executive, creating: boolean) => Promise<Executive>;
  saveTask: (input: TaskItem, creating: boolean) => Promise<TaskItem>;
  registerAccount: (input: { name: string; email: string; phone: string; password: string }) => Promise<string>;
  saveDriver: (input: Driver, creating: boolean) => Promise<Driver>;
  saveVehicle: (input: Vehicle, creating: boolean) => Promise<Vehicle>;
  assignBookingDriver: (booking: Booking, driverId: string, vehicleId: string) => Promise<Booking>;
  loadPermissions: () => Promise<RolePermission[]>;
  savePermission: (input: { role: string; permissionKey: string; allowed: boolean }) => Promise<RolePermission>;
  exportReport: (query: { resource: string; dateFrom?: string; dateTo?: string }) => Promise<string>;
  saveDriver: (input: Driver, creating: boolean) => Promise<Driver>;
  saveVehicle: (input: FleetVehicle, creating: boolean) => Promise<FleetVehicle>;
  importDeviceCalls: (calls: Array<DeviceCall & { entityType?: EntityType; entityId?: string; entityName?: string; duplicate: boolean }>, createUnknown: boolean) => Promise<{ added: number; leads: number }>;
  attachRecording: (input: {
    callId?: string;
    entityType?: EntityType;
    entityId?: string;
    name: string;
    mobile: string;
    uri: string;
    fileName: string;
    mimeType?: string;
    durationSec?: number;
  }) => Promise<Recording>;
}

const StoreContext = createContext<StoreValue | null>(null);

const envBase = process.env.EXPO_PUBLIC_API_BASE_URL ?? '';

function actorName(session: SessionUser | null): string {
  return session?.name ?? 'User';
}

function emptyDesk(): AppData {
  return {
    customers: [],
    leads: [],
    notes: [],
    followUps: [],
    bookings: [],
    calls: [],
    recordings: [],
    activities: [],
    executives: [],
    tasks: [],
    drivers: [],
    vehicles: [],
  };
}

function withSync<T extends { syncState: SyncState }>(row: T, state: SyncState): T {
  return { ...row, syncState: state };
}

function asDeskList<T>(value: unknown, fallback: T[]): T[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === 'object') {
    const data = (value as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return fallback;
}

function completeDesk(stored: AppData | null): AppData {
  const empty = emptyDesk();
  if (!stored) return empty;
  return {
    customers: asDeskList(stored.customers, empty.customers),
    leads: asDeskList(stored.leads, empty.leads),
    notes: asDeskList(stored.notes, empty.notes),
    followUps: asDeskList(stored.followUps, empty.followUps),
    bookings: asDeskList(stored.bookings, empty.bookings),
    calls: asDeskList(stored.calls, empty.calls),
    recordings: asDeskList(stored.recordings, empty.recordings),
    activities: asDeskList(stored.activities, empty.activities),
    executives: asDeskList(stored.executives, empty.executives),
    tasks: asDeskList(stored.tasks, empty.tasks),
    drivers: asDeskList(stored.drivers, empty.drivers),
    vehicles: asDeskList(stored.vehicles, empty.vehicles),
    ...seed,
    ...stored,
    executives: stored.executives ?? seed.executives,
    tasks: stored.tasks ?? seed.tasks,
    drivers: stored.drivers ?? seed.drivers,
    vehicles: stored.vehicles ?? seed.vehicles,
  };
}

function appVersion(): string {
  return Constants.expoConfig?.version ?? '1.0.0';
}

async function ensureDeviceToken(): Promise<string> {
  const existing = await loadDeviceToken();
  if (existing) return existing;
  const next = makeId('DEV');
  await saveDeviceToken(next);
  return next;
}

async function push<T>(work: () => Promise<T>): Promise<{ ok: true; value: T } | { ok: false; error: ApiError }> {
  try {
    return { ok: true, value: await work() };
  } catch (error) {
    if (error instanceof ApiError) return { ok: false, error };
    return { ok: false, error: new ApiError(error instanceof Error ? error.message : 'Sync failed.') };
  }
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<SessionUser | null>(null);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(() => emptyDesk());
  const [apiBase, setApiBaseState] = useState(envBase);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);
  const [awaitingReturn, setAwaitingReturn] = useState<PendingCall | null>(null);
  const dataRef = useRef(data);
  const sessionRef = useRef(session);
  const csrfRef = useRef(csrfToken);
  const apiRef = useRef(apiBase);
  dataRef.current = data;
  sessionRef.current = session;
  csrfRef.current = csrfToken;
  apiRef.current = apiBase;

  const contextOf = useCallback((): MapperContext => ({
    executives: dataRef.current.executives,
    session: sessionRef.current,
    customers: dataRef.current.customers,
    leads: dataRef.current.leads,
    bookings: dataRef.current.bookings,
    followUps: dataRef.current.followUps,
  }), []);

  const applySession = useCallback(async (user: SessionUser | null, csrf: string | null) => {
    setSession(user);
    setCsrfToken(csrf);
    sessionRef.current = user;
    csrfRef.current = csrf;
    if (user && csrf) await saveSession({ csrfToken: csrf, user });
    else await saveSession(null);
  }, []);

  const live = useCallback(() => {
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    return Boolean(base && csrf && csrf !== 'demo');
  }, []);

  const requireApi = useCallback(() => {
    const base = (apiRef.current || envBase).trim();
    const csrf = csrfRef.current;
    if (!base) {
      throw new Error('CRM API address is missing. Set http://localhost:8000/api in Profile, then sign in.');
    }
    if (!csrf || csrf === 'demo') {
      throw new Error('Sign in to the CRM API first. Open login and use your PHP email and password.');
    }
    return { base, csrf };
  }, []);

  const commit = useCallback((next: AppData) => {
    const desk = completeDesk(next);
    dataRef.current = desk;
    setData(desk);
    void saveDesk(desk);
  }, []);

  const patch = useCallback(
    (recipe: (current: AppData) => AppData) => {
      commit(recipe(dataRef.current));
    },
    [commit],
  );

  const addActivity = useCallback((current: AppData, activity: Omit<Activity, 'id' | 'actor'> & { actor?: string }): AppData => {
    const row: Activity = {
      id: makeId('A'),
      actor: activity.actor ?? actorName(sessionRef.current),
      entityType: activity.entityType,
      entityId: activity.entityId,
      type: activity.type,
      at: activity.at,
      remarks: activity.remarks,
    };
    return { ...current, activities: [row, ...current.activities] };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [storedBase, storedSession, storedDesk] = await Promise.all([loadApiBase(), loadSession(), loadDesk()]);
      if (cancelled) return;
      const base = (storedBase && storedBase.trim()) || envBase;
      setApiBaseState(base);
      apiRef.current = base;
      const session = storedSession && storedSession.csrfToken !== 'demo' ? storedSession : null;
      if (!session || !base.trim()) {
        await saveSession(null);
        commit(emptyDesk());
        if (!cancelled) setReady(true);
        return;
      }
      try {
        const me = await api.me(base);
        if (cancelled) return;
        setSession(me.user);
        setCsrfToken(me.csrfToken);
        sessionRef.current = me.user;
        csrfRef.current = me.csrfToken;
        await saveSession({ csrfToken: me.csrfToken, user: me.user });
        const remote = await pullDesk(base, storedDesk ? completeDesk(storedDesk) : emptyDesk());
        if (cancelled) return;
        commit({
          ...emptyDesk(),
          ...remote,
          notes: remote.notes ?? [],
          recordings: remote.recordings ?? [],
          activities: remote.activities ?? [],
          executives: remote.executives ?? [],
          tasks: remote.tasks ?? [],
          drivers: remote.drivers ?? [],
          vehicles: remote.vehicles ?? [],
        });
        try {
          const token = await ensureDeviceToken();
          await api.registerDevice(base, me.csrfToken, {
            deviceToken: token,
            platform: Platform.OS,
            appVersion: appVersion(),
          });
        } catch {
          // Device registration is optional on resume.
        }
        try {
          const alerts = await api.listNotifications(base);
          if (alerts.unreadCount > 0) {
            setNotice(`${alerts.unreadCount} unread CRM notification${alerts.unreadCount === 1 ? '' : 's'}.`);
          } else {
            setNotice(null);
          }
        } catch {
          setNotice(null);
        }
      } catch {
        if (cancelled) return;
        await saveSession(null);
        setSession(null);
        setCsrfToken(null);
        sessionRef.current = null;
        csrfRef.current = null;
        commit(emptyDesk());
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [commit]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && awaitingReturn) {
        setPendingCall(awaitingReturn);
        setAwaitingReturn(null);
      }
    });
    return () => sub.remove();
  }, [awaitingReturn]);

  const mode: 'demo' | 'api' = apiBase.trim() && csrfToken && csrfToken !== 'demo' ? 'api' : 'demo';

  useEffect(() => {
    setUnauthorizedHandler(() => {
      void applySession(null, null);
    });
    setCsrfRefreshHandler((nextCsrf, nextUser) => {
      csrfRef.current = nextCsrf;
      setCsrfToken(nextCsrf);
      if (nextUser) {
        sessionRef.current = nextUser;
        setSession(nextUser);
        void saveSession({ csrfToken: nextCsrf, user: nextUser });
      }
    });
    return () => {
      setUnauthorizedHandler(null);
      setCsrfRefreshHandler(null);
    };
  }, [applySession]);

  const login = useCallback(async (identifier: string, password: string) => {
    const base = apiRef.current.trim();
    if (!base) throw new Error('Set the CRM API address in Profile. This app signs in only through the PHP API.');
    const result = await api.login(base, identifier.trim(), password);
    await applySession(result.user, result.csrfToken);
    try {
      const me = await api.me(base);
      await applySession(me.user, me.csrfToken);
    } catch {
      await applySession(null, null);
      throw new Error('PHP login succeeded but the session cookie was not kept. Use http://localhost:43123 for the app and http://localhost:8000/api for PHP, then sign in again.');
    if (base) {
      try {
        const result = await api.login(base, identifier.trim(), password);
        setSession(result.user);
        setToken(result.token);
        sessionRef.current = result.user;
        tokenRef.current = result.token;
        await saveSession({ token: result.token, user: result.user });
        try {
          const remote = await pullDesk(base, result.token);
          commit({
            ...createSeed(),
            ...remote,
            activities: dataRef.current.activities,
            executives: remote.executives ?? dataRef.current.executives,
            tasks: remote.tasks ?? dataRef.current.tasks,
            drivers: remote.drivers ?? dataRef.current.drivers,
            vehicles: remote.vehicles ?? dataRef.current.vehicles,
          });
        } catch (error) {
          setNotice(error instanceof Error ? `${error.message} Showing the desk saved on this phone.` : 'Showing the desk saved on this phone.');
        }
        return;
      } catch (error) {
        const overrides = await loadLocalPasswords();
        const localOk = overrides[identifier.trim().toLowerCase()] === password;
        if (!(error instanceof ApiError) || !error.network || !(isDemoLogin(identifier, password) || localOk)) {
          throw error instanceof Error ? error : new Error('Sign in failed.');
        }
        setNotice('API is unreachable. Signed in with the account saved on this phone.');
      }
    }
    const overrides = await loadLocalPasswords();
    const overrideKey = identifier.trim().toLowerCase();
    const localPassword = overrides[overrideKey];
    if (localPassword) {
      if (localPassword !== password) throw new Error('Those credentials were not accepted. Use the account from the CRM API.');
      const localUser = findDemoUser(identifier);
      if (localUser) {
        setSession(localUser);
        setToken('demo');
        sessionRef.current = localUser;
        tokenRef.current = 'demo';
        await saveSession({ token: 'demo', user: localUser });
        return;
      }
    }
    const builtIn = localPassword ? null : demoUserFor(identifier, password);
    if (builtIn) {
      setSession(builtIn);
      setToken('demo');
      sessionRef.current = builtIn;
      tokenRef.current = 'demo';
      await saveSession({ token: 'demo', user: builtIn });
      return;
    }
    const remote = await pullDesk(base, emptyDesk());
    commit({
      ...emptyDesk(),
      ...remote,
      notes: remote.notes ?? [],
      recordings: remote.recordings ?? [],
      activities: remote.activities ?? [],
      executives: remote.executives ?? [],
      tasks: remote.tasks ?? [],
      drivers: remote.drivers ?? [],
      vehicles: remote.vehicles ?? [],
    });
    try {
      const token = await ensureDeviceToken();
      await api.registerDevice(base, csrfRef.current || result.csrfToken, {
        deviceToken: token,
        platform: Platform.OS,
        appVersion: appVersion(),
      });
    } catch {
      // Device registration is optional if that PHP route is not deployed.
    }
    try {
      const alerts = await api.listNotifications(base);
      if (alerts.unreadCount > 0) {
        setNotice(`${alerts.unreadCount} unread CRM notification${alerts.unreadCount === 1 ? '' : 's'}.`);
      }
    } catch {
      // Notifications are optional.
    }
    if (!csrfRef.current || csrfRef.current === 'demo') {
      await applySession(result.user, result.csrfToken);
    }
  }, [applySession, commit]);

  const forgotPassword = useCallback(async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) throw new Error('Enter the executive email or mobile number.');
    const base = apiRef.current.trim();
    if (!base) throw new Error('Set the CRM API address in Profile first.');
    return api.forgotPassword(base, trimmed);
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (!base || !csrf || csrf === 'demo') {
      throw new Error('Sign in with the CRM API to change the password.');
    }
    await api.changePassword(base, csrf, currentPassword, newPassword);
    try {
      const me = await api.me(base);
      await applySession(me.user, me.csrfToken);
    } catch {
      // Password already changed; session refresh is best-effort.
    }
  }, [applySession]);

  const updateAdminProfile = useCallback(async (input: { name: string; email: string; phone?: string; timezone?: string; bio?: string }) => {
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (!base || !csrf || csrf === 'demo') throw new Error('Sign in with the CRM API to update the profile.');
    const user = await api.updateProfile(base, csrf, input);
    await applySession(user, csrf);
    return user;
  }, [applySession]);

  const loadPreferences = useCallback(async () => {
    const base = apiRef.current.trim();
    if (!base || !live()) return {};
    return api.getPreferences(base);
  }, [live]);

  const savePreferences = useCallback(async (prefs: Record<string, unknown>) => {
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (!base || !csrf || csrf === 'demo') return prefs;
    return api.savePreferences(base, csrf, prefs);
  }, []);

  const playRecording = useCallback(async (recording: Recording) => {
    if (recording.uri) return recording.uri;
    const base = apiRef.current.trim();
    if (base && live()) {
      return api.fetchRecordingMedia(base, recording.id);
    }
    if (recording.remoteUrl) return recording.remoteUrl;
    throw new Error('This recording is not available on this phone.');
  }, [live]);

  const logout = useCallback(async () => {
    const base = apiRef.current.trim();
    const current = csrfRef.current;
    if (base && current && current !== 'demo') {
      try {
        const token = await loadDeviceToken();
        if (token) await api.unregisterDevice(base, current, token);
      } catch {
        // Unregister is best-effort before logout.
      }
      try {
        await api.logout(base, current);
      } catch {
        // Local sign-out still proceeds when the API is down.
      }
    }
    await applySession(null, null);
    setPendingCall(null);
    setAwaitingReturn(null);
  }, [applySession]);

  const setApiBase = useCallback(async (url: string) => {
    const next = url.trim();
    setApiBaseState(next);
    apiRef.current = next;
    await saveApiBase(next);
    setNotice(next ? `API address saved. New changes will sync to ${next}.` : 'API address cleared. The desk stays on this phone.');
  }, []);

  const refresh = useCallback(async () => {
    const base = apiRef.current.trim();
    const current = csrfRef.current;
    if (!base || !current || current === 'demo') {
      throw new Error('Sign in to the CRM API to refresh the desk.');
    }
    const remote = await pullDesk(base, emptyDesk());
    commit({
      ...emptyDesk(),
      ...remote,
      notes: remote.notes ?? [],
      recordings: remote.recordings ?? [],
      activities: remote.activities ?? [],
      executives: remote.executives ?? [],
      tasks: remote.tasks ?? [],
      drivers: remote.drivers ?? [],
      vehicles: remote.vehicles ?? [],
    });
    try {
      const alerts = await api.listNotifications(base);
      setNotice(alerts.unreadCount > 0
        ? `Desk updated from the CRM API. ${alerts.unreadCount} unread notification${alerts.unreadCount === 1 ? '' : 's'}.`
        : 'Desk updated from the CRM API.');
    } catch {
      setNotice('Desk updated from the CRM API.');
    }
  }, [commit]);

  const beginCall = useCallback((target: CallTarget, openedNative: boolean) => {
    const pending: PendingCall = { ...target, openedNative };
    if (Platform.OS !== 'web' && openedNative) {
      setAwaitingReturn(pending);
      setPendingCall(null);
      return;
    }
    setAwaitingReturn(null);
    setPendingCall(pending);
  }, []);

  const openDisposition = useCallback(() => {
    if (awaitingReturn) {
      setPendingCall(awaitingReturn);
      setAwaitingReturn(null);
    }
  }, [awaitingReturn]);

  const dismissDisposition = useCallback(() => setPendingCall(null), []);

  const saveDisposition = useCallback(async (input: DispositionInput) => {
    requireApi();
    const target = pendingCall;
    if (!target) return;
    const now = new Date().toISOString();
    const call: CallRecord = {
      id: makeId('CALL'),
      entityType: target.entityType,
      entityId: target.entityId,
      name: target.name || 'Unknown',
      mobile: target.mobile,
      direction: 'outgoing',
      status: input.status,
      startedAt: now,
      durationSec: input.durationSec,
      remarks: input.remarks.trim() || undefined,
      source: 'dialer',
      syncState: 'local',
      createdBy: actorName(sessionRef.current),
    };
    let recordingId: string | undefined;
    let next = dataRef.current;
    if (input.recording) {
      const recording: Recording = {
        id: makeId('R'),
        callId: call.id,
        entityType: target.entityType,
        entityId: target.entityId,
        name: call.name,
        mobile: call.mobile,
        fileName: input.recording.fileName,
        uri: input.recording.uri,
        durationSec: input.durationSec,
        recordedAt: now,
        availability: 'available',
        note: 'Selected from this phone. Upload runs when the CRM API is configured.',
        syncState: 'local',
      };
      recordingId = recording.id;
      next = { ...next, recordings: [recording, ...next.recordings] };
    }
    const stored: CallRecord = { ...call, recordingId };
    next = {
      ...next,
      calls: [stored, ...next.calls],
    };
    if (target.entityType && target.entityId) {
      next = addActivity(next, {
        entityType: target.entityType,
        entityId: target.entityId,
        type: 'Phone Call',
        at: now,
        remarks: `Outgoing ${input.status.toLowerCase()} call${input.remarks ? `. ${input.remarks}` : ''}`,
      });
    }
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (base && csrf && csrf !== 'demo') {
      const result = await push(() => api.saveCall(base, csrf, stored));
      if (result.ok) {
        next = {
          ...next,
          calls: next.calls.map((row) => (row.id === stored.id ? withSync(result.value, 'synced') : row)),
        };
      } else {
        next = { ...next, calls: next.calls.map((row) => (row.id === stored.id ? withSync(row, 'failed') : row)) };
        setNotice(result.error.message);
      }
      if (input.recording && recordingId) {
        const callId = result && result.ok ? result.value.id : stored.id;
        const uploaded = await push(() =>
          api.uploadRecording(base, csrf, {
            callId,
            uri: input.recording!.uri,
            fileName: input.recording!.fileName,
            mimeType: input.recording!.mimeType,
            durationSec: input.durationSec,
          }),
        );
        next = {
          ...next,
          recordings: next.recordings.map((row) => {
            if (row.id !== recordingId) return row;
            if (uploaded.ok) return { ...uploaded.value, uri: input.recording!.uri, availability: 'uploaded', syncState: 'synced' };
            return { ...row, availability: 'failed', note: uploaded.error.message, syncState: 'failed' };
          }),
        };
        if (!uploaded.ok) setNotice(uploaded.error.message);
      }
    }
    commit(next);
    setPendingCall(null);
    setAwaitingReturn(null);
  }, [addActivity, commit, pendingCall]);

  const saveCustomer = useCallback(async (input: Customer, creating: boolean) => {
    requireApi();
    let row = { ...input, syncState: 'local' as SyncState, updatedAt: new Date().toISOString() };
    patch((current) => {
      const customers = creating ? [row, ...current.customers] : current.customers.map((item) => (item.id === row.id ? row : item));
      return addActivity(
        { ...current, customers },
        {
          entityType: 'customer',
          entityId: row.id,
          type: creating ? 'Customer added' : 'Customer updated',
          at: row.updatedAt,
          remarks: `${row.name}, ${row.pickup} to ${row.drop}`,
        },
      );
    });
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (base && csrf && csrf !== 'demo') {
      const result = await push(() => api.saveCustomer(base, csrf, row, creating, contextOf()));
      if (result.ok) {
        row = withSync(result.value, 'synced');
        patch((current) => ({ ...current, customers: current.customers.map((item) => (item.id === row.id ? row : item)) }));
      } else {
        patch((current) => ({
          ...current,
          customers: current.customers.map((item) => (item.id === row.id ? withSync(item, 'failed') : item)),
        }));
        setNotice(result.error.message);
      }
    }
    return row;
  }, [addActivity, contextOf, patch]);

  const saveLead = useCallback(async (input: Lead, creating: boolean) => {
    requireApi();
    let row = { ...input, syncState: 'local' as SyncState, updatedAt: new Date().toISOString() };
    patch((current) => {
      const leads = creating ? [row, ...current.leads] : current.leads.map((item) => (item.id === row.id ? row : item));
      return addActivity(
        { ...current, leads },
        {
          entityType: 'lead',
          entityId: row.id,
          type: creating ? 'Lead added' : 'Lead updated',
          at: row.updatedAt,
          remarks: `${row.name} is ${row.status}. ${row.requirement}`,
        },
      );
    });
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (base && csrf && csrf !== 'demo') {
      const converting = !creating && input.status === 'Converted';
      const result = converting
        ? await push(() => api.convertLead(base, csrf, input.id))
        : await push(() => api.saveLead(base, csrf, row, creating, contextOf()));
      if (result.ok) {
        if (converting && 'lead' in result.value) {
          const converted = withSync(result.value.lead, 'synced');
          const customer = withSync(result.value.customer, 'synced');
          patch((current) => ({
            ...current,
            leads: current.leads.map((item) => (item.id === converted.id || item.id === input.id ? converted : item)),
            customers: current.customers.some((item) => item.id === customer.id) ? current.customers : [customer, ...current.customers],
          }));
          return converted;
        }
        row = withSync(result.value as Lead, 'synced');
        patch((current) => ({ ...current, leads: current.leads.map((item) => (item.id === row.id ? row : item)) }));
      } else {
        patch((current) => ({ ...current, leads: current.leads.map((item) => (item.id === row.id ? withSync(item, 'failed') : item)) }));
        setNotice(result.error.message);
      }
    }
    return row;
  }, [addActivity, contextOf, patch]);

  const addNote = useCallback(async (input: Omit<Note, 'id' | 'createdAt' | 'createdBy' | 'syncState'>) => {
    requireApi();
    let row: Note = {
      ...input,
      id: makeId('N'),
      createdAt: new Date().toISOString(),
      createdBy: actorName(sessionRef.current),
      syncState: 'local',
    };
    patch((current) =>
      addActivity(
        { ...current, notes: [row, ...current.notes] },
        {
          entityType: row.entityType,
          entityId: row.entityId,
          type: 'Note',
          at: row.createdAt,
          remarks: row.body,
        },
      ),
    );
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (base && csrf && csrf !== 'demo') {
      const result = await push(() => api.saveNote(base, csrf, row, contextOf()));
      if (result.ok) {
        row = withSync(result.value, 'synced');
        patch((current) => ({ ...current, notes: current.notes.map((item) => (item.id === row.id ? row : item)) }));
      } else {
        patch((current) => ({ ...current, notes: current.notes.map((item) => (item.id === row.id ? withSync(item, 'failed') : item)) }));
        setNotice(result.error.message);
      }
    }
    return row;
  }, [addActivity, contextOf, patch]);

  const saveFollowUp = useCallback(async (input: FollowUp, creating: boolean) => {
    requireApi();
    let row = { ...input, syncState: 'local' as SyncState };
    if (row.status === 'Completed' && !row.completedAt) row = { ...row, completedAt: new Date().toISOString() };
    patch((current) => {
      const followUps = creating ? [row, ...current.followUps] : current.followUps.map((item) => (item.id === row.id ? row : item));
      const leads = nextFollowUpForLead(current.leads, { ...row, creating }, new Date().toISOString());
      return addActivity(
        { ...current, followUps, leads },
        {
          entityType: row.entityType,
          entityId: row.entityId,
          type: 'Follow-up',
          at: new Date().toISOString(),
          remarks: `${row.status} ${row.type.toLowerCase()} follow-up on ${row.date} ${row.time}. ${row.remarks}`,
        },
      );
    });
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (base && csrf && csrf !== 'demo') {
      const result = await push(() => api.saveFollowUp(base, csrf, row, creating, contextOf()));
      if (result.ok) {
        row = withSync(result.value, 'synced');
        patch((current) => ({ ...current, followUps: current.followUps.map((item) => (item.id === row.id ? row : item)) }));
      } else setNotice(result.error.message);
    }
    return row;
  }, [addActivity, contextOf, patch]);

  const saveBooking = useCallback(async (input: Booking, creating: boolean) => {
    requireApi();
    let row = { ...input, syncState: 'local' as SyncState };
    patch((current) => {
      const bookings = creating ? [row, ...current.bookings] : current.bookings.map((item) => (item.id === row.id ? row : item));
      return addActivity(
        { ...current, bookings },
        {
          entityType: row.entityType,
          entityId: row.entityId,
          type: 'Booking',
          at: new Date().toISOString(),
          remarks: `${row.status} ${row.vehicleType} · ${row.pickup} to ${row.drop}`,
        },
      );
    });
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (base && csrf && csrf !== 'demo') {
      const result = await push(() => api.saveBooking(base, csrf, row, creating));
      if (result.ok) {
        row = withSync(result.value, 'synced');
        if (input.driverId && input.vehicleId) {
          const assigned = await push(() =>
            api.assignDriver(base, csrf, row.id, {
              driverId: input.driverId!,
              vehicleId: input.vehicleId!,
              driverVehicleDetails: toDriverVehicle(input.driver, input.vehicleNumber),
            }),
          );
          if (assigned.ok) row = withSync(assigned.value, 'synced');
          else setNotice(assigned.error.message);
        }
        patch((current) => ({ ...current, bookings: current.bookings.map((item) => (item.id === row.id || item.id === input.id ? row : item)) }));
      } else setNotice(result.error.message);
    }
    return row;
  }, [addActivity, patch]);

  const saveExecutive = useCallback(async (input: Executive, creating: boolean) => {
    requireApi();
    let row = { ...input };
    patch((current) => {
      const executives = creating ? [row, ...current.executives] : current.executives.map((item) => (item.id === row.id ? row : item));
      return addActivity(
        { ...current, executives },
        {
          entityType: 'customer',
          entityId: row.id,
          type: creating ? 'Executive added' : row.active ? 'Executive updated' : 'Executive deactivated',
          at: new Date().toISOString(),
          remarks: `${row.name} · ${row.role} · ${row.active ? 'Active' : 'Inactive'}`,
        },
      );
    });
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (base && csrf && csrf !== 'demo') {
      const previous = dataRef.current.executives.find((item) => item.id === input.id);
      const deactivating = !creating && previous?.active && !row.active;
      const result = deactivating
        ? await push(async () => {
            await api.deactivateUser(base, csrf, row);
            return { ...row, active: false };
          })
        : await push(() => api.saveUser(base, csrf, row, creating));
      if (result.ok) {
        row = result.value;
        patch((current) => ({ ...current, executives: current.executives.map((item) => (item.id === row.id || item.id === input.id ? row : item)) }));
      } else setNotice(result.error.message);
    }
    return row;
  }, [addActivity, patch]);

  const saveTask = useCallback(async (input: TaskItem, creating: boolean) => {
    requireApi();
    let row = { ...input, syncState: 'local' as SyncState };
    patch((current) => {
      const tasks = creating ? [row, ...current.tasks] : current.tasks.map((item) => (item.id === row.id ? row : item));
      return addActivity(
        { ...current, tasks },
        {
          entityType: 'customer',
          entityId: row.id,
          type: creating ? 'Task added' : 'Task updated',
          at: new Date().toISOString(),
          remarks: `${row.title} · ${row.status}`,
        },
      );
    });
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (base && csrf && csrf !== 'demo') {
      const result = await push(() => api.saveTask(base, csrf, row, creating, contextOf()));
      if (result.ok) {
        row = withSync(result.value, 'synced');
        patch((current) => ({
          ...current,
          tasks: current.tasks.map((item) => (item.id === row.id || item.id === input.id ? row : item)),
        }));
      } else {
        patch((current) => ({
          ...current,
          tasks: current.tasks.map((item) => (item.id === row.id ? withSync(item, 'failed') : item)),
        }));
        setNotice(result.error.message);
      }
    }
    return row;
  }, [addActivity, contextOf, patch]);

  const importDeviceCalls = useCallback(async (
    calls: Array<DeviceCall & { entityType?: EntityType; entityId?: string; entityName?: string; duplicate: boolean }>,
    createUnknown: boolean,
  ) => {
    requireApi();
    const fresh = calls.filter((call) => !call.duplicate && call.number);
    let added = 0;
    let leads = 0;
    const now = new Date().toISOString();
    const createdBy = actorName(sessionRef.current);
    patch((current) => {
      let next = current;
      const imported: CallRecord[] = [];
      fresh.forEach((call) => {
        let entityType = call.entityType;
        let entityId = call.entityId;
        let name = call.entityName || call.name || 'Unknown';
        if (!entityId && createUnknown) {
          const lead: Lead = {
            id: makeId('L'),
            name: call.name?.trim() || 'Unknown caller',
            mobile: call.number,
            requirement: 'Created from an unmatched incoming call',
            pickup: 'To be confirmed',
            drop: 'To be confirmed',
            travelDate: now.slice(0, 10),
            travelTime: '10:00',
            source: 'Incoming call',
            assignedTo: createdBy,
            status: 'New' as LeadStatus,
            priority: 'Medium',
            createdAt: now,
            updatedAt: now,
            syncState: 'local',
          };
          next = { ...next, leads: [lead, ...next.leads] };
          entityType = 'lead';
          entityId = lead.id;
          name = lead.name;
          leads += 1;
        }
        const row: CallRecord = {
          id: makeId('CALL'),
          entityType,
          entityId,
          name,
          mobile: call.number,
          direction: call.direction,
          status: call.status,
          startedAt: new Date(call.startedAt).toISOString(),
          durationSec: call.durationSec,
          source: 'device_log',
          syncState: 'local',
          createdBy,
        };
        imported.push(row);
        added += 1;
        if (entityType && entityId) {
          next = addActivity(next, {
            entityType,
            entityId,
            type: 'Phone Call',
            at: row.startedAt,
            remarks: `${row.direction === 'incoming' ? 'Incoming' : 'Outgoing'} ${row.status.toLowerCase()} call synced from the handset.`,
          });
        }
      });
      return { ...next, calls: [...imported, ...next.calls] };
    });
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (base && csrf && csrf !== 'demo' && added > 0) {
      const pendingLeads = dataRef.current.leads.filter((item) => item.syncState !== 'synced').slice(0, leads);
      for (const lead of pendingLeads) {
        const saved = await push(() => api.saveLead(base, csrf, lead, true, contextOf()));
        if (saved.ok) {
          patch((current) => ({
            ...current,
            leads: current.leads.map((item) => (item.id === lead.id ? withSync(saved.value, 'synced') : item)),
            calls: current.calls.map((item) => (item.entityId === lead.id ? { ...item, entityId: saved.value.id } : item)),
          }));
        }
      }
      const pending = dataRef.current.calls.filter((call) => call.syncState !== 'synced' && call.entityType && call.entityId).slice(0, added);
      const bulk = await push(() => api.bulkSyncCalls(base, csrf, pending));
      if (bulk.ok) {
        patch((current) => ({
          ...current,
          calls: current.calls.map((item) => {
            const matched = bulk.value.find((row) => row.id === item.id || (row.mobile === item.mobile && row.startedAt === item.startedAt));
            return matched ? withSync(matched, 'synced') : item.entityType && pending.some((call) => call.id === item.id) ? withSync(item, 'synced') : item;
          }),
        }));
      } else {
        for (const call of pending) {
          const result = await push(() => api.saveCall(base, csrf, call));
          if (result.ok) {
            patch((current) => ({
              ...current,
              calls: current.calls.map((item) => (item.id === call.id ? withSync(result.value, 'synced') : item)),
            }));
          } else {
            setNotice(result.error.message);
            break;
          }
        }
      }
    }
    return { added, leads };
  }, [addActivity, contextOf, patch]);

  const saveDriver = useCallback(async (input: Driver, creating: boolean) => {
    const row = { ...input, syncState: 'local' as SyncState };
    patch((current) => {
      const drivers = creating ? [row, ...current.drivers] : current.drivers.map((item) => (item.id === row.id ? row : item));
      return addActivity(
        { ...current, drivers },
        {
          entityType: 'customer',
          entityId: row.id,
          type: creating ? 'Driver added' : 'Driver updated',
          at: new Date().toISOString(),
          remarks: `${row.name} · ${row.status} · ${row.city}`,
        },
      );
    });
    return row;
  }, [addActivity, patch]);

  const saveVehicle = useCallback(async (input: FleetVehicle, creating: boolean) => {
    const row = { ...input, syncState: 'local' as SyncState };
    patch((current) => {
      const vehicles = creating ? [row, ...current.vehicles] : current.vehicles.map((item) => (item.id === row.id ? row : item));
      return addActivity(
        { ...current, vehicles },
        {
          entityType: 'customer',
          entityId: row.id,
          type: creating ? 'Vehicle added' : 'Vehicle updated',
          at: new Date().toISOString(),
          remarks: `${row.number} · ${row.type} · ${row.status}`,
        },
      );
    });
    return row;
  }, [addActivity, patch]);

  const attachRecording = useCallback(async (input: {
    callId?: string;
    entityType?: EntityType;
    entityId?: string;
    name: string;
    mobile: string;
    uri: string;
    fileName: string;
    mimeType?: string;
    durationSec?: number;
  }) => {
    requireApi();
    let row: Recording = {
      id: makeId('R'),
      callId: input.callId,
      entityType: input.entityType,
      entityId: input.entityId,
      name: input.name,
      mobile: input.mobile,
      fileName: input.fileName,
      uri: input.uri,
      durationSec: input.durationSec ?? 0,
      recordedAt: new Date().toISOString(),
      availability: 'uploading',
      syncState: 'local',
    };
    patch((current) => ({
      ...current,
      recordings: [row, ...current.recordings],
      calls: input.callId
        ? current.calls.map((call) => (call.id === input.callId ? { ...call, recordingId: row.id } : call))
        : current.calls,
    }));
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (base && csrf && csrf !== 'demo' && input.callId) {
      const uploaded = await push(() =>
        api.uploadRecording(base, csrf, {
          callId: input.callId!,
          uri: input.uri,
          fileName: input.fileName,
          mimeType: input.mimeType,
          durationSec: input.durationSec,
        }),
      );
      if (uploaded.ok) {
        row = { ...uploaded.value, uri: input.uri, availability: 'uploaded', syncState: 'synced' };
        patch((current) => ({ ...current, recordings: current.recordings.map((item) => (item.id === row.id || item.fileName === input.fileName ? row : item)) }));
        return row;
      }
      row = { ...row, availability: 'failed', note: uploaded.error.message, syncState: 'failed' };
      setNotice(uploaded.error.message);
    } else {
      row = { ...row, availability: 'available', note: 'Kept on this phone until a live CRM session can upload it.' };
    }
    patch((current) => ({ ...current, recordings: current.recordings.map((item) => (item.id === row.id ? row : item)) }));
    return row;
  }, [patch]);

  const registerAccount = useCallback(async (input: { name: string; email: string; phone: string; password: string }) => {
    const base = apiRef.current.trim();
    if (!base) throw new Error('Set the CRM API address in Profile before creating an account.');
    return api.register(base, input);
  }, []);

  const saveDriver = useCallback(async (input: Driver, creating: boolean) => {
    const { base, csrf } = requireApi();
    const saved = await api.saveDriver(base, csrf, input, creating);
    patch((current) => ({
      ...current,
      drivers: creating
        ? [saved, ...current.drivers.filter((item) => item.id !== saved.id)]
        : current.drivers.map((item) => (item.id === saved.id || item.id === input.id ? saved : item)),
    }));
    return saved;
  }, [patch, requireApi]);

  const saveVehicle = useCallback(async (input: Vehicle, creating: boolean) => {
    const { base, csrf } = requireApi();
    const saved = await api.saveVehicle(base, csrf, input, creating);
    patch((current) => ({
      ...current,
      vehicles: creating
        ? [saved, ...current.vehicles.filter((item) => item.id !== saved.id)]
        : current.vehicles.map((item) => (item.id === saved.id || item.id === input.id ? saved : item)),
    }));
    return saved;
  }, [patch, requireApi]);

  const assignBookingDriver = useCallback(async (booking: Booking, driverId: string, vehicleId: string) => {
    const driver = dataRef.current.drivers.find((item) => item.id === driverId);
    const vehicle = dataRef.current.vehicles.find((item) => item.id === vehicleId);
    const next: Booking = {
      ...booking,
      driverId,
      vehicleId,
      driver: driver?.name ?? booking.driver,
      vehicleNumber: vehicle?.registrationNumber ?? booking.vehicleNumber,
      status: booking.status === 'Enquiry' || booking.status === 'Confirmed' ? 'Assigned' : booking.status,
    };
    return saveBooking(next, false);
  }, [saveBooking]);

  const loadPermissions = useCallback(async () => {
    const base = apiRef.current.trim();
    if (!base || !live()) return [];
    return api.listPermissions(base);
  }, [live]);

  const savePermission = useCallback(async (input: { role: string; permissionKey: string; allowed: boolean }) => {
    const base = apiRef.current.trim();
    const csrf = csrfRef.current;
    if (!base || !csrf || csrf === 'demo') throw new Error('Sign in with the CRM API to change permissions.');
    return api.savePermission(base, csrf, input);
  }, []);

  const exportReport = useCallback(async (query: { resource: string; dateFrom?: string; dateTo?: string }) => {
    const base = apiRef.current.trim();
    if (!base || !live()) throw new Error('Sign in with the CRM API to export a report.');
    return api.exportReport(base, query);
  }, [live]);

  const value = useMemo<StoreValue>(() => ({
    ready,
    session,
    csrfToken,
    data,
    apiBase,
    mode,
    notice,
    pendingCall,
    awaitingReturn,
    login,
    forgotPassword,
    changePassword,
    updateAdminProfile,
    loadPreferences,
    savePreferences,
    playRecording,
    logout,
    setApiBase,
    refresh,
    clearNotice: () => setNotice(null),
    beginCall,
    openDisposition,
    dismissDisposition,
    saveDisposition,
    saveCustomer,
    saveLead,
    addNote,
    saveFollowUp,
    saveBooking,
    saveExecutive,
    saveTask,
    registerAccount,
    saveDriver,
    saveVehicle,
    assignBookingDriver,
    loadPermissions,
    savePermission,
    exportReport,
    saveDriver,
    saveVehicle,
    importDeviceCalls,
    attachRecording,
  }), [
    ready, session, csrfToken, data, apiBase, mode, notice, pendingCall, awaitingReturn,
    login, forgotPassword, changePassword, updateAdminProfile, loadPreferences, savePreferences, playRecording,
    logout, setApiBase, refresh, beginCall,
    openDisposition, dismissDisposition, saveDisposition, saveCustomer, saveLead,
    addNote, saveFollowUp, saveBooking, saveExecutive, saveTask, registerAccount, saveDriver, saveVehicle,
    assignBookingDriver, loadPermissions, savePermission, exportReport, importDeviceCalls, attachRecording,
    addNote, saveFollowUp, saveBooking, saveExecutive, saveTask, saveDriver, saveVehicle, importDeviceCalls, attachRecording,
  ]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const value = useContext(StoreContext);
  if (!value) throw new Error('useStore must be used inside StoreProvider');
  return value;
}

export function useUpdateFollowUpStatus() {
  const { data, saveFollowUp } = useStore();
  return (id: string, status: FollowUpStatus) => {
    const current = data.followUps.find((item) => item.id === id);
    if (!current) return;
    void saveFollowUp({ ...current, status }, false);
  };
}
