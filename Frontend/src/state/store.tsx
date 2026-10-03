import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { ApiError, api, pullDesk, setCsrfRefreshHandler, setUnauthorizedHandler } from '../api/client';
import type { MapperContext } from '../api/mappers';
import { createSeed, demoUser, demoUserFor, isDemoLogin } from '../data/seed';
import { makeId } from '../lib/ids';
import type { DeviceCall } from '../lib/syncCalls';
import { loadApiBase, loadDesk, loadSession, saveApiBase, saveDesk, saveSession } from '../storage/persist';
import type {
  Activity,
  AppData,
  Booking,
  CallRecord,
  CallStatus,
  Customer,
  EntityType,
  Executive,
  FollowUp,
  FollowUpStatus,
  Lead,
  LeadStatus,
  Note,
  Recording,
  SessionUser,
  SyncState,
  TaskItem,
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
  restoreSample: () => Promise<void>;
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
  return session?.name ?? demoUser.name;
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
  const seed = createSeed();
  if (!stored) return seed;
  return {
    customers: asDeskList(stored.customers, seed.customers),
    leads: asDeskList(stored.leads, seed.leads),
    notes: asDeskList(stored.notes, seed.notes),
    followUps: asDeskList(stored.followUps, seed.followUps),
    bookings: asDeskList(stored.bookings, seed.bookings),
    calls: asDeskList(stored.calls, seed.calls),
    recordings: asDeskList(stored.recordings, seed.recordings),
    activities: asDeskList(stored.activities, seed.activities),
    executives: asDeskList(stored.executives, seed.executives),
    tasks: asDeskList(stored.tasks, seed.tasks),
  };
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
  const [data, setData] = useState<AppData>(() => createSeed());
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
      const base = storedBase ?? envBase;
      setApiBaseState(base);
      apiRef.current = base;
      if (storedDesk) {
        commit(completeDesk(storedDesk));
      }
      if (storedSession) {
        setSession(storedSession.user);
        setCsrfToken(storedSession.csrfToken);
        sessionRef.current = storedSession.user;
        csrfRef.current = storedSession.csrfToken;
      }
      setReady(true);
      if (storedSession && base.trim() && storedSession.csrfToken !== 'demo') {
        try {
          const me = await api.me(base);
          if (cancelled) return;
          setSession(me.user);
          setCsrfToken(me.csrfToken);
          sessionRef.current = me.user;
          csrfRef.current = me.csrfToken;
          await saveSession({ csrfToken: me.csrfToken, user: me.user });
          const remote = await pullDesk(base, dataRef.current);
          if (!cancelled) {
            commit({
              ...dataRef.current,
              ...remote,
              notes: dataRef.current.notes,
              recordings: remote.recordings ?? dataRef.current.recordings,
              activities: remote.activities ?? dataRef.current.activities,
              executives: remote.executives ?? dataRef.current.executives,
              tasks: remote.tasks ?? dataRef.current.tasks,
            });
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
          }
        } catch (error) {
          if (!cancelled) {
            setNotice(error instanceof Error ? error.message : 'Saved desk is showing because the API did not respond.');
          }
        }
      }
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
    if (base) {
      try {
        const result = await api.login(base, identifier.trim(), password);
        await applySession(result.user, result.csrfToken);
        try {
          const remote = await pullDesk(base, dataRef.current);
          commit({
            ...createSeed(),
            ...remote,
            notes: dataRef.current.notes,
            recordings: remote.recordings ?? [],
            activities: remote.activities ?? dataRef.current.activities,
            executives: remote.executives ?? dataRef.current.executives,
            tasks: remote.tasks ?? dataRef.current.tasks,
          });
          try {
            const alerts = await api.listNotifications(base);
            if (alerts.unreadCount > 0) {
              setNotice(`${alerts.unreadCount} unread CRM notification${alerts.unreadCount === 1 ? '' : 's'}.`);
            }
          } catch {
            // Desk already loaded; notifications are optional.
          }
        } catch (error) {
          setNotice(error instanceof Error ? `${error.message} Showing the desk saved on this phone.` : 'Showing the desk saved on this phone.');
        }
        return;
      } catch (error) {
        if (!(error instanceof ApiError) || !error.network || !isDemoLogin(identifier, password)) {
          throw error instanceof Error ? error : new Error('Sign in failed.');
        }
        setNotice('API is unreachable. Signed in with the account saved on this phone.');
      }
    }
    const builtIn = demoUserFor(identifier, password);
    if (builtIn) {
      await applySession(builtIn, 'demo');
      return;
    }
    const id = identifier.trim().toLowerCase();
    const digits = identifier.replace(/\D/g, '');
    const match = dataRef.current.executives.find((person) => {
      const phone = person.phone.replace(/\D/g, '');
      return person.email.toLowerCase() === id || (digits.length >= 10 && phone.endsWith(digits.slice(-10)));
    });
    if (match && match.role === 'Calling Executive' && match.password === password) {
      if (!match.active) throw new Error('This calling executive is inactive. An admin can activate the account from Team.');
      const user: SessionUser = {
        id: match.id,
        name: match.name,
        email: match.email,
        mobile: match.phone,
        role: 'calling_executive',
        desk: 'VehicoCRM',
      };
      await applySession(user, 'demo');
      return;
    }
    throw new Error('Those credentials were not accepted. Use the account from the CRM API.');
  }, [applySession, commit]);

  const forgotPassword = useCallback(async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) throw new Error('Enter the executive email or mobile number.');
    const base = apiRef.current.trim();
    if (!base) {
      return 'Password reset is sent by the CRM API. No API address is configured, so nothing was emailed. Use the credentials saved for this phone to sign in.';
    }
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
      setNotice('This desk is stored on the phone. Add the CRM API address in Profile to pull live records from VehicoCRM.');
      return;
    }
    const remote = await pullDesk(base, dataRef.current);
    commit({
      ...dataRef.current,
      ...remote,
      notes: dataRef.current.notes,
      recordings: remote.recordings ?? dataRef.current.recordings,
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

  const restoreSample = useCallback(async () => {
    const next = createSeed();
    commit(next);
    setNotice('Sample desk restored on this phone.');
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
        next = {
          ...next,
          recordings: next.recordings.map((row) =>
            row.id === recordingId
              ? { ...row, availability: 'available', note: 'Kept on this phone. The CRM API has no recording upload route.' }
              : row,
          ),
        };
      }
    }
    commit(next);
    setPendingCall(null);
    setAwaitingReturn(null);
  }, [addActivity, commit, pendingCall]);

  const saveCustomer = useCallback(async (input: Customer, creating: boolean) => {
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
    if (live()) {
      setNotice('Notes stay on this phone. The CRM API has no notes route.');
    }
    return row;
  }, [addActivity, live, patch]);

  const saveFollowUp = useCallback(async (input: FollowUp, creating: boolean) => {
    let row = { ...input, syncState: 'local' as SyncState };
    if (row.status === 'Completed' && !row.completedAt) row = { ...row, completedAt: new Date().toISOString() };
    patch((current) => {
      const followUps = creating ? [row, ...current.followUps] : current.followUps.map((item) => (item.id === row.id ? row : item));
      return addActivity(
        { ...current, followUps },
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
        patch((current) => ({ ...current, bookings: current.bookings.map((item) => (item.id === row.id ? row : item)) }));
      } else setNotice(result.error.message);
    }
    return row;
  }, [addActivity, patch]);

  const saveExecutive = useCallback(async (input: Executive, creating: boolean) => {
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
            await api.deactivateUser(base, csrf, row.id);
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
      const pending = dataRef.current.calls.filter((call) => call.syncState !== 'synced').slice(0, added);
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
    return { added, leads };
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
    row = { ...row, availability: 'available', note: 'Kept on this phone. The CRM API has no recording upload route.' };
    patch((current) => ({ ...current, recordings: current.recordings.map((item) => (item.id === row.id ? row : item)) }));
    return row;
  }, [patch]);

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
    restoreSample,
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
    importDeviceCalls,
    attachRecording,
  }), [
    ready, session, csrfToken, data, apiBase, mode, notice, pendingCall, awaitingReturn,
    login, forgotPassword, changePassword, updateAdminProfile, loadPreferences, savePreferences, playRecording,
    logout, setApiBase, refresh, restoreSample, beginCall,
    openDisposition, dismissDisposition, saveDisposition, saveCustomer, saveLead,
    addNote, saveFollowUp, saveBooking, saveExecutive, saveTask, importDeviceCalls, attachRecording,
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
