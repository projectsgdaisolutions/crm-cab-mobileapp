import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState, Platform } from 'react-native';
import { ApiError, api, pullDesk } from '../api/client';
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
  token: string | null;
  data: AppData;
  apiBase: string;
  mode: 'demo' | 'api';
  notice: string | null;
  pendingCall: PendingCall | null;
  awaitingReturn: PendingCall | null;
  login: (identifier: string, password: string) => Promise<void>;
  forgotPassword: (identifier: string) => Promise<string>;
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

function completeDesk(stored: AppData | null): AppData {
  const seed = createSeed();
  if (!stored) return seed;
  return {
    ...seed,
    ...stored,
    executives: stored.executives ?? seed.executives,
    tasks: stored.tasks ?? seed.tasks,
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
  const [token, setToken] = useState<string | null>(null);
  const [data, setData] = useState<AppData>(() => createSeed());
  const [apiBase, setApiBaseState] = useState(envBase);
  const [notice, setNotice] = useState<string | null>(null);
  const [pendingCall, setPendingCall] = useState<PendingCall | null>(null);
  const [awaitingReturn, setAwaitingReturn] = useState<PendingCall | null>(null);
  const dataRef = useRef(data);
  const sessionRef = useRef(session);
  const tokenRef = useRef(token);
  const apiRef = useRef(apiBase);
  dataRef.current = data;
  sessionRef.current = session;
  tokenRef.current = token;
  apiRef.current = apiBase;

  const commit = useCallback((next: AppData) => {
    dataRef.current = next;
    setData(next);
    void saveDesk(next);
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
        const desk = completeDesk(storedDesk);
        setData(desk);
        dataRef.current = desk;
      }
      if (storedSession) {
        setSession(storedSession.user);
        setToken(storedSession.token);
        sessionRef.current = storedSession.user;
        tokenRef.current = storedSession.token;
      }
      setReady(true);
      if (storedSession && base.trim() && storedSession.token !== 'demo') {
        try {
          const remote = await pullDesk(base, storedSession.token);
          if (!cancelled) {
            const merged = { ...dataRef.current, ...remote, activities: dataRef.current.activities };
            commit(merged);
            setNotice(null);
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

  const mode: 'demo' | 'api' = apiBase.trim() && token && token !== 'demo' ? 'api' : 'demo';

  const login = useCallback(async (identifier: string, password: string) => {
    const base = apiRef.current.trim();
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
          });
        } catch (error) {
          setNotice(error instanceof Error ? `${error.message} Showing the desk saved on this phone.` : 'Showing the desk saved on this phone.');
        }
        return;
      } catch (error) {
        if (!(error instanceof ApiError) || !error.network || !isDemoLogin(identifier, password)) {
          throw error instanceof Error ? error : new Error('Sign in failed.');
        }
        setNotice('API is unreachable. Signed in to the on-device demo desk.');
      }
    }
    const builtIn = demoUserFor(identifier, password);
    if (builtIn) {
      setSession(builtIn);
      setToken('demo');
      sessionRef.current = builtIn;
      tokenRef.current = 'demo';
      await saveSession({ token: 'demo', user: builtIn });
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
      setSession(user);
      setToken('demo');
      sessionRef.current = user;
      tokenRef.current = 'demo';
      await saveSession({ token: 'demo', user });
      return;
    }
    throw new Error('Those credentials were not accepted. Use the calling executive or admin account from the CRM API, or the executive credentials set up in this app.');
  }, [commit]);

  const forgotPassword = useCallback(async (identifier: string) => {
    const trimmed = identifier.trim();
    if (!trimmed) throw new Error('Enter the executive email or mobile number.');
    const base = apiRef.current.trim();
    if (!base) {
      return 'Password reset is sent by the CRM API. No API address is configured, so nothing was emailed. Use the credentials saved for this phone to sign in.';
    }
    const result = await api.forgotPassword(base, trimmed);
    return result.message || 'If this account is registered, the CRM will send reset instructions.';
  }, []);

  const logout = useCallback(async () => {
    const base = apiRef.current.trim();
    const current = tokenRef.current;
    if (base && current && current !== 'demo') {
      try {
        await api.logout(base, current);
      } catch {
        // Local sign-out still proceeds when the API is down.
      }
    }
    setSession(null);
    setToken(null);
    sessionRef.current = null;
    tokenRef.current = null;
    setPendingCall(null);
    setAwaitingReturn(null);
    await saveSession(null);
  }, []);

  const setApiBase = useCallback(async (url: string) => {
    const next = url.trim();
    setApiBaseState(next);
    apiRef.current = next;
    await saveApiBase(next);
    setNotice(next ? `API address saved. New changes will sync to ${next}.` : 'API address cleared. The desk stays on this phone.');
  }, []);

  const refresh = useCallback(async () => {
    const base = apiRef.current.trim();
    const current = tokenRef.current;
    if (!base || !current || current === 'demo') {
      setNotice('This desk is stored on the phone. Add the CRM API address in Profile to pull live records from VehicoCRM.');
      return;
    }
    const remote = await pullDesk(base, current);
    commit({ ...dataRef.current, ...remote });
    setNotice('Desk updated from the CRM API.');
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
    const currentToken = tokenRef.current;
    if (base && currentToken && currentToken !== 'demo') {
      const result = await push(() => api.saveCall(base, currentToken, stored));
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
        const form = new FormData();
        form.append('callId', stored.id);
        form.append('mobile', stored.mobile);
        form.append('fileName', input.recording.fileName);
        if (target.entityType) form.append('entityType', target.entityType);
        if (target.entityId) form.append('entityId', target.entityId);
        form.append('file', {
          uri: input.recording.uri,
          name: input.recording.fileName,
          type: input.recording.mimeType || 'audio/mpeg',
        } as unknown as Blob);
        const uploaded = await push(() => api.uploadRecording(base, currentToken, form));
        if (uploaded.ok) {
          next = {
            ...next,
            recordings: next.recordings.map((row) => (row.id === recordingId ? { ...uploaded.value, syncState: 'synced', availability: 'uploaded' } : row)),
          };
        } else {
          next = {
            ...next,
            recordings: next.recordings.map((row) => (row.id === recordingId ? { ...row, availability: 'failed', syncState: 'failed', note: uploaded.error.message } : row)),
          };
        }
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
    const currentToken = tokenRef.current;
    if (base && currentToken && currentToken !== 'demo') {
      const result = await push(() => api.saveCustomer(base, currentToken, row, creating));
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
  }, [addActivity, patch]);

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
    const currentToken = tokenRef.current;
    if (base && currentToken && currentToken !== 'demo') {
      const result = await push(() => api.saveLead(base, currentToken, row, creating));
      if (result.ok) {
        row = withSync(result.value, 'synced');
        patch((current) => ({ ...current, leads: current.leads.map((item) => (item.id === row.id ? row : item)) }));
      } else {
        patch((current) => ({ ...current, leads: current.leads.map((item) => (item.id === row.id ? withSync(item, 'failed') : item)) }));
        setNotice(result.error.message);
      }
    }
    return row;
  }, [addActivity, patch]);

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
    const base = apiRef.current.trim();
    const currentToken = tokenRef.current;
    if (base && currentToken && currentToken !== 'demo') {
      const result = await push(() => api.saveNote(base, currentToken, row));
      if (result.ok) {
        row = withSync(result.value, 'synced');
        patch((current) => ({ ...current, notes: current.notes.map((item) => (item.id === row.id ? row : item)) }));
      } else {
        setNotice(result.error.message);
      }
    }
    return row;
  }, [addActivity, patch]);

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
    const currentToken = tokenRef.current;
    if (base && currentToken && currentToken !== 'demo') {
      const result = await push(() => api.saveFollowUp(base, currentToken, row, creating));
      if (result.ok) {
        row = withSync(result.value, 'synced');
        patch((current) => ({ ...current, followUps: current.followUps.map((item) => (item.id === row.id ? row : item)) }));
      } else setNotice(result.error.message);
    }
    return row;
  }, [addActivity, patch]);

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
    const currentToken = tokenRef.current;
    if (base && currentToken && currentToken !== 'demo') {
      const result = await push(() => api.saveBooking(base, currentToken, row, creating));
      if (result.ok) {
        row = withSync(result.value, 'synced');
        patch((current) => ({ ...current, bookings: current.bookings.map((item) => (item.id === row.id ? row : item)) }));
      } else setNotice(result.error.message);
    }
    return row;
  }, [addActivity, patch]);

  const saveExecutive = useCallback(async (input: Executive, creating: boolean) => {
    const row = { ...input };
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
    return row;
  }, [addActivity, patch]);

  const saveTask = useCallback(async (input: TaskItem, creating: boolean) => {
    const row = { ...input, syncState: 'local' as SyncState };
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
    return row;
  }, [addActivity, patch]);

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
    const currentToken = tokenRef.current;
    if (base && currentToken && currentToken !== 'demo' && added > 0) {
      const pending = dataRef.current.calls.filter((call) => call.syncState !== 'synced').slice(0, added);
      const result = await push(() => api.syncCalls(base, currentToken, pending));
      if (result.ok) {
        const byId = new Map(result.value.map((call) => [call.id, call]));
        patch((current) => ({
          ...current,
          calls: current.calls.map((call) => (byId.has(call.id) ? withSync(byId.get(call.id) as CallRecord, 'synced') : call)),
        }));
      } else setNotice(result.error.message);
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
    const base = apiRef.current.trim();
    const currentToken = tokenRef.current;
    if (!base || !currentToken || currentToken === 'demo') {
      row = { ...row, availability: 'available', note: 'Kept on this phone until a CRM API address is set.' };
      patch((current) => ({ ...current, recordings: current.recordings.map((item) => (item.id === row.id ? row : item)) }));
      return row;
    }
    const form = new FormData();
    if (input.callId) form.append('callId', input.callId);
    form.append('mobile', input.mobile);
    form.append('fileName', input.fileName);
    if (input.entityType) form.append('entityType', input.entityType);
    if (input.entityId) form.append('entityId', input.entityId);
    form.append('file', {
      uri: input.uri,
      name: input.fileName,
      type: input.mimeType || 'audio/*',
    } as unknown as Blob);
    const result = await push(() => api.uploadRecording(base, currentToken, form));
    if (result.ok) {
      row = { ...result.value, uri: input.uri, availability: 'uploaded', syncState: 'synced' };
    } else {
      row = { ...row, availability: 'failed', syncState: 'failed', note: result.error.message };
      setNotice(result.error.message);
    }
    patch((current) => ({ ...current, recordings: current.recordings.map((item) => (item.id === row.id ? row : item)) }));
    return row;
  }, [patch]);

  const value = useMemo<StoreValue>(() => ({
    ready,
    session,
    token,
    data,
    apiBase,
    mode,
    notice,
    pendingCall,
    awaitingReturn,
    login,
    forgotPassword,
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
    ready, session, token, data, apiBase, mode, notice, pendingCall, awaitingReturn,
    login, forgotPassword, logout, setApiBase, refresh, restoreSample, beginCall,
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
