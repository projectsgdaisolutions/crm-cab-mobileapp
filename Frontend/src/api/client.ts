import type {
  Activity,
  AppData,
  Booking,
  CallRecord,
  Customer,
  Driver,
  Executive,
  FollowUp,
  Lead,
  Note,
  Recording,
  RolePermission,
  SessionUser,
  TaskItem,
  Vehicle,
} from '../types';
import {
  asRecord,
  asRecordArray,
  fromApiActivity,
  fromApiBooking,
  fromApiCall,
  fromApiCustomer,
  fromApiDriver,
  fromApiExecutive,
  fromApiFollowUp,
  fromApiLead,
  fromApiNote,
  fromApiPermission,
  fromApiRecording,
  fromApiTask,
  fromApiUser,
  fromApiVehicle,
  toApiBooking,
  toApiBulkCall,
  toApiCall,
  toApiCustomer,
  toApiDriver,
  toApiFollowUp,
  toApiLead,
  toApiNote,
  toApiTask,
  toApiUser,
  toApiVehicle,
  type MapperContext,
} from './mappers';

export class ApiError extends Error {
  status: number;
  network: boolean;

  constructor(message: string, status = 0, network = false) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.network = network;
  }
}

export interface LoginResponse {
  csrfToken: string;
  user: SessionUser;
}

type Query = Record<string, string | undefined>;

type RequestOptions = {
  method?: string;
  csrfToken?: string | null;
  body?: unknown;
  formData?: FormData;
  query?: Query;
  retried?: boolean;
  accept?: string;
  raw?: boolean;
};

let unauthorizedHandler: (() => void) | null = null;
let csrfRefreshHandler: ((csrfToken: string, user?: SessionUser) => void) | null = null;

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

export function setCsrfRefreshHandler(handler: ((csrfToken: string, user?: SessionUser) => void) | null): void {
  csrfRefreshHandler = handler;
}

function joinUrl(base: string, path: string): string {
  const root = base.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${root}${suffix}`;
}

function errorMessage(payload: unknown, status: number): string {
  if (payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string' && payload.message) {
    return payload.message;
  }
  return `CRM API returned ${status}.`;
}

function parseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

const PUBLIC_PATHS = new Set([
  '/auth/login.php',
  '/auth/forgot-password.php',
  '/auth/reset-password.php',
  '/auth/register.php',
]);

function needsCsrf(method: string, path: string): boolean {
  const verb = method.toUpperCase();
  if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(verb)) return false;
  return !PUBLIC_PATHS.has(path);
}

async function request<T>(base: string, path: string, options: RequestOptions = {}): Promise<T> {
  if (!base.trim()) {
    throw new ApiError('CRM API address is not configured.', 0, true);
  }
  const method = (options.method ?? 'GET').toUpperCase();
  let url: URL;
  try {
    url = new URL(joinUrl(base.trim(), path));
  } catch {
    throw new ApiError('CRM API address is not a valid URL.', 0, true);
  }
  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  const headers: Record<string, string> = {
    Accept: options.accept ?? 'application/json',
    'X-Client': 'gdai-cab-crm-web',
  };
  if (needsCsrf(method, path) && options.csrfToken && options.csrfToken !== 'demo') {
    headers['X-CSRF-Token'] = options.csrfToken;
  }
  let body: BodyInit | undefined;
  if (options.formData) {
    body = options.formData;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method,
      headers,
      body,
      credentials: 'include',
    });
  } catch {
    throw new ApiError('The CRM API could not be reached.', 0, true);
  }
  const text = await response.text();
  const payload = parseJson(text);

  if (response.status === 401 && !PUBLIC_PATHS.has(path)) {
    const optionalAuth = path === '/mobile/devices.php' || path === '/notifications/index.php';
    if (!optionalAuth) unauthorizedHandler?.();
    throw new ApiError(errorMessage(payload, 401), 401, false);
  }

  if (response.status === 419 && !options.retried && !PUBLIC_PATHS.has(path)) {
    try {
      const restored = await api.me(base);
      csrfRefreshHandler?.(restored.csrfToken, restored.user);
      return request<T>(base, path, { ...options, csrfToken: restored.csrfToken, retried: true });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) throw error;
      throw new ApiError(errorMessage(payload, 419), 419, false);
    }
  }

  if (!response.ok) {
    throw new ApiError(errorMessage(payload, response.status), response.status, false);
  }

  if (options.raw) {
    return text as T;
  }

  if (payload && typeof payload === 'object' && 'success' in payload && payload.success === false) {
    throw new ApiError(errorMessage(payload, response.status), response.status, false);
  }

  return payload as T;
}

async function optional<T>(work: () => Promise<T>): Promise<T | undefined> {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ApiError && (error.status === 403 || error.status === 404 || error.status === 405 || error.status === 422)) {
      return undefined;
    }
    throw error;
  }
}

function dataOf(payload: unknown): unknown {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: unknown }).data;
  }
  return payload;
}

function mapList<T>(payload: unknown, map: (row: Record<string, unknown>) => T | null): T[] {
  return asRecordArray(dataOf(payload)).map(map).filter((row): row is T => row != null);
}

function mapOne<T>(payload: unknown, map: (row: Record<string, unknown>) => T): T {
  const row = asRecord(dataOf(payload));
  if (!row) throw new ApiError('CRM API returned an empty record.');
  return map(row);
}

function readAuth(payload: unknown): LoginResponse {
  const envelope = asRecord(payload);
  if (!envelope) throw new ApiError('CRM API returned an empty session.');
  const userRaw = asRecord(envelope.user);
  const csrfToken = typeof envelope.csrfToken === 'string' ? envelope.csrfToken : '';
  if (!userRaw || !csrfToken) throw new ApiError('CRM API did not return a session.');
  return { csrfToken, user: fromApiUser(userRaw) };
}

export const api = {
  login: async (base: string, identifier: string, password: string) =>
    readAuth(await request(base, '/auth/login.php', { method: 'POST', body: { identifier, password } })),

  forgotPassword: async (base: string, email: string) => {
    const payload = await request<{ success?: boolean; message?: string }>(base, '/auth/forgot-password.php', {
      method: 'POST',
      body: { email },
    });
    return payload.message || 'If an account exists for this email, a password reset link has been sent.';
  },

  me: async (base: string) => readAuth(await request(base, '/auth/me.php')),

  logout: (base: string, csrfToken: string) =>
    request<{ success: boolean; message?: string }>(base, '/auth/logout.php', {
      method: 'POST',
      csrfToken,
      body: {},
    }),

  changePassword: (base: string, csrfToken: string, currentPassword: string, newPassword: string) =>
    request<{ success: boolean; message?: string }>(base, '/auth/password.php', {
      method: 'POST',
      csrfToken,
      body: { currentPassword, newPassword },
    }),

  updateProfile: async (base: string, csrfToken: string, body: { name: string; email: string; phone?: string; timezone?: string; bio?: string }) => {
    const payload = await request(base, '/auth/profile.php', { method: 'PUT', csrfToken, body });
    const envelope = asRecord(payload);
    const userRaw = asRecord(envelope?.user) ?? asRecord(dataOf(payload));
    if (!userRaw) throw new ApiError('CRM API returned an empty profile.');
    return fromApiUser(userRaw);
  },

  getPreferences: async (base: string) => {
    const data = dataOf(await request(base, '/auth/preferences.php'));
    return asRecord(data) ?? {};
  },

  savePreferences: async (base: string, csrfToken: string, prefs: Record<string, unknown>) => {
    const data = dataOf(await request(base, '/auth/preferences.php', { method: 'PUT', csrfToken, body: prefs }));
    return asRecord(data) ?? prefs;
  },

  listCustomers: async (base: string) => mapList(await request(base, '/customers/index.php'), fromApiCustomer),

  saveCustomer: async (base: string, csrfToken: string, customer: Customer, creating: boolean, context: MapperContext) => {
    const payload = await request(base, '/customers/index.php', {
      method: creating ? 'POST' : 'PUT',
      csrfToken,
      body: toApiCustomer(customer, context),
      query: creating ? undefined : { id: customer.id },
    });
    return mapOne(payload, fromApiCustomer);
  },

  listLeads: async (base: string) => mapList(await request(base, '/leads/index.php'), fromApiLead),

  saveLead: async (base: string, csrfToken: string, lead: Lead, creating: boolean, context: MapperContext) => {
    const payload = await request(base, '/leads/index.php', {
      method: creating ? 'POST' : 'PUT',
      csrfToken,
      body: toApiLead(lead, context, creating),
      query: creating ? undefined : { id: lead.id },
    });
    return mapOne(payload, fromApiLead);
  },

  convertLead: async (base: string, csrfToken: string, id: string) => {
    const payload = await request(base, '/leads/convert.php', { method: 'POST', csrfToken, body: {}, query: { id } });
    const data = asRecord(dataOf(payload)) ?? asRecord(payload);
    const leadRaw = asRecord(data?.lead);
    const customerRaw = asRecord(data?.customer);
    if (!leadRaw || !customerRaw) throw new ApiError('CRM API returned an incomplete conversion.');
    return { lead: fromApiLead(leadRaw), customer: fromApiCustomer(customerRaw) };
  },

  listFollowUps: async (base: string, context: MapperContext) =>
    mapList(await request(base, '/followups/index.php'), (row) => fromApiFollowUp(row, context)),

  saveFollowUp: async (base: string, csrfToken: string, followUp: FollowUp, creating: boolean, context: MapperContext) => {
    const payload = await request(base, '/followups/index.php', {
      method: creating ? 'POST' : 'PUT',
      csrfToken,
      body: toApiFollowUp(followUp, context),
      query: creating ? undefined : { id: followUp.id },
    });
    return mapOne(payload, (row) => fromApiFollowUp(row, context));
  },

  listBookings: async (base: string) => mapList(await request(base, '/bookings/index.php'), fromApiBooking),

  saveBooking: async (base: string, csrfToken: string, booking: Booking, creating: boolean) => {
    const payload = await request(base, '/bookings/index.php', {
      method: creating ? 'POST' : 'PUT',
      csrfToken,
      body: toApiBooking(booking, creating),
      query: creating ? undefined : { id: booking.id },
    });
    return mapOne(payload, fromApiBooking);
  },

  listCalls: async (base: string) => mapList(await request(base, '/calls/index.php'), fromApiCall),

  saveCall: async (base: string, csrfToken: string, call: CallRecord) => {
    const body = toApiCall(call);
    if (!body) throw new ApiError('A customer or lead is required before this call can sync.');
    const payload = await request(base, '/calls/index.php', { method: 'POST', csrfToken, body });
    return mapOne(payload, fromApiCall);
  },

  listRecordings: async (base: string) =>
    mapList(await request(base, '/recordings/index.php'), (row) => fromApiRecording(row, base)),

  fetchRecordingMedia: async (base: string, id: string): Promise<string> => {
    if (!base.trim()) throw new ApiError('CRM API address is not configured.', 0, true);
    let response: Response;
    try {
      response = await fetch(joinUrl(base.trim(), `/recordings/media.php?id=${encodeURIComponent(id)}`), {
        method: 'GET',
        credentials: 'include',
        headers: { Accept: '*/*' },
      });
    } catch {
      throw new ApiError('The CRM API could not be reached.', 0, true);
    }
    if (response.status === 401) {
      unauthorizedHandler?.();
      throw new ApiError('Your session has expired. Please sign in again.', 401);
    }
    if (!response.ok) throw new ApiError(`CRM API returned ${response.status}.`, response.status);
    const blob = await response.blob();
    if (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function') {
      return URL.createObjectURL(blob);
    }
    throw new ApiError('This runtime cannot play a remote recording.');
  },

  listTasks: async (base: string) => mapList(await request(base, '/tasks/index.php'), fromApiTask),

  saveTask: async (base: string, csrfToken: string, task: TaskItem, creating: boolean, context: MapperContext) => {
    const payload = await request(base, '/tasks/index.php', {
      method: creating ? 'POST' : 'PUT',
      csrfToken,
      body: toApiTask(task, context),
      query: creating ? undefined : { id: task.id },
    });
    return mapOne(payload, fromApiTask);
  },

  listActivities: async (base: string) => mapList(await request(base, '/activities/index.php'), fromApiActivity),

  listUsers: async (base: string) => mapList(await request(base, '/users/index.php'), fromApiExecutive),

  saveUser: async (base: string, csrfToken: string, executive: Executive, creating: boolean) => {
    const payload = await request(base, '/users/index.php', {
      method: creating ? 'POST' : 'PUT',
      csrfToken,
      body: toApiUser(executive, creating),
      query: creating ? undefined : { id: executive.id },
    });
    return mapOne(payload, fromApiExecutive);
  },

  deactivateUser: (base: string, csrfToken: string, executive: Executive) =>
    request<{ success: boolean }>(base, '/users/index.php', {
      method: 'DELETE',
      csrfToken,
      query: { id: executive.id },
      body: { name: executive.name, email: executive.email, phone: executive.phone },
    }),

  resetPassword: (base: string, token: string, password: string) =>
    request<{ success: boolean; message?: string }>(base, '/auth/reset-password.php', {
      method: 'POST',
      body: { token, newPassword: password },
    }),

  register: async (base: string, body: { name: string; email: string; phone: string; password: string }) => {
    const payload = await request<{ success?: boolean; message?: string }>(base, '/auth/register.php', {
      method: 'POST',
      body,
    });
    return payload.message || 'Account created. You may now sign in.';
  },

  getCustomer: async (base: string, id: string) => mapOne(await request(base, '/customers/index.php', { query: { id } }), fromApiCustomer),
  deleteCustomer: (base: string, csrfToken: string, id: string) =>
    request<{ success: boolean }>(base, '/customers/index.php', { method: 'DELETE', csrfToken, query: { id } }),

  getLead: async (base: string, id: string) => mapOne(await request(base, '/leads/index.php', { query: { id } }), fromApiLead),
  deleteLead: (base: string, csrfToken: string, id: string) =>
    request<{ success: boolean }>(base, '/leads/index.php', { method: 'DELETE', csrfToken, query: { id } }),

  getFollowUp: async (base: string, id: string, context: MapperContext) =>
    mapOne(await request(base, '/followups/index.php', { query: { id } }), (row) => fromApiFollowUp(row, context)),
  deleteFollowUp: (base: string, csrfToken: string, id: string) =>
    request<{ success: boolean }>(base, '/followups/index.php', { method: 'DELETE', csrfToken, query: { id } }),

  getBooking: async (base: string, id: string) => mapOne(await request(base, '/bookings/index.php', { query: { id } }), fromApiBooking),
  deleteBooking: (base: string, csrfToken: string, id: string) =>
    request<{ success: boolean }>(base, '/bookings/index.php', { method: 'DELETE', csrfToken, query: { id } }),

  assignDriver: async (
    base: string,
    csrfToken: string,
    bookingId: string,
    body: { driverId: string; vehicleId: string; driverVehicleDetails?: string },
  ) => {
    const payload = await request(base, '/bookings/assign-driver.php', {
      method: 'PUT',
      csrfToken,
      query: { id: bookingId },
      body,
    });
    return mapOne(payload, fromApiBooking);
  },

  getCall: async (base: string, id: string) => mapOne(await request(base, '/calls/index.php', { query: { id } }), fromApiCall),
  updateCall: async (base: string, csrfToken: string, call: CallRecord) => {
    const body = toApiCall(call);
    if (!body) throw new ApiError('A customer or lead is required before this call can sync.');
    const payload = await request(base, '/calls/index.php', { method: 'PUT', csrfToken, body, query: { id: call.id } });
    return mapOne(payload, fromApiCall);
  },
  deleteCall: (base: string, csrfToken: string, id: string) =>
    request<{ success: boolean }>(base, '/calls/index.php', { method: 'DELETE', csrfToken, query: { id } }),

  getTask: async (base: string, id: string) => mapOne(await request(base, '/tasks/index.php', { query: { id } }), fromApiTask),
  deleteTask: (base: string, csrfToken: string, id: string) =>
    request<{ success: boolean }>(base, '/tasks/index.php', { method: 'DELETE', csrfToken, query: { id } }),

  listDrivers: async (base: string, query?: Query) => mapList(await request(base, '/drivers/index.php', { query }), fromApiDriver),
  getDriver: async (base: string, id: string) => mapOne(await request(base, '/drivers/index.php', { query: { id } }), fromApiDriver),
  saveDriver: async (base: string, csrfToken: string, driver: Driver, creating: boolean) => {
    const payload = await request(base, '/drivers/index.php', {
      method: creating ? 'POST' : 'PUT',
      csrfToken,
      body: toApiDriver(driver),
      query: creating ? undefined : { id: driver.id },
    });
    return mapOne(payload, fromApiDriver);
  },

  listVehicles: async (base: string, query?: Query) => mapList(await request(base, '/vehicles/index.php', { query }), fromApiVehicle),
  getVehicle: async (base: string, id: string) => mapOne(await request(base, '/vehicles/index.php', { query: { id } }), fromApiVehicle),
  saveVehicle: async (base: string, csrfToken: string, vehicle: Vehicle, creating: boolean) => {
    const payload = await request(base, '/vehicles/index.php', {
      method: creating ? 'POST' : 'PUT',
      csrfToken,
      body: toApiVehicle(vehicle),
      query: creating ? undefined : { id: vehicle.id },
    });
    return mapOne(payload, fromApiVehicle);
  },

  listNotes: async (base: string, context: MapperContext, query?: Query) =>
    mapList(await request(base, '/notes/index.php', { query }), (row) => fromApiNote(row, context)),
  saveNote: async (base: string, csrfToken: string, note: Note, context: MapperContext) => {
    const payload = await request(base, '/notes/index.php', { method: 'POST', csrfToken, body: toApiNote(note) });
    return mapOne(payload, (row) => fromApiNote(row, context));
  },

  listDevices: async (base: string) => asRecordArray(dataOf(await request(base, '/mobile/devices.php'))),
  registerDevice: (base: string, csrfToken: string, body: { deviceToken: string; platform: string; appVersion?: string }) =>
    request<{ success: boolean }>(base, '/mobile/devices.php', { method: 'POST', csrfToken, body }),
  unregisterDevice: (base: string, csrfToken: string, deviceToken: string) =>
    request<{ success: boolean }>(base, '/mobile/devices.php', { method: 'DELETE', csrfToken, body: { deviceToken } }),

  listPermissions: async (base: string) => mapList(await request(base, '/permissions/index.php'), fromApiPermission),
  savePermission: async (base: string, csrfToken: string, body: { role: string; permissionKey: string; allowed: boolean }) => {
    const payload = await request(base, '/permissions/index.php', { method: 'PUT', csrfToken, body });
    const row = asRecord(dataOf(payload));
    return row ? fromApiPermission(row) : body;
  },

  uploadRecording: async (
    base: string,
    csrfToken: string,
    input: { callId: string; uri: string; fileName: string; mimeType?: string; durationSec?: number; accessLevel?: string },
  ) => {
    const form = new FormData();
    form.append('callId', input.callId);
    form.append('accessLevel', input.accessLevel ?? 'Admin');
    if (input.durationSec != null) form.append('durationSec', String(input.durationSec));
    const file = await filePart(input.uri, input.fileName, input.mimeType);
    form.append('file', file as Blob);
    const payload = await request(base, '/recordings/upload.php', { method: 'POST', csrfToken, formData: form });
    return mapOne(payload, (row) => fromApiRecording(row, base));
  },

  bulkSyncCalls: async (base: string, csrfToken: string, calls: CallRecord[]) => {
    const rows = calls.map((call) => toApiBulkCall(call)).filter((row): row is Record<string, unknown> => row != null);
    if (rows.length === 0) return [] as CallRecord[];
    const payload = await request(base, '/calls/bulk-sync.php', { method: 'POST', csrfToken, body: { calls: rows } });
    const data = dataOf(payload);
    const envelope = asRecord(data);
    const list = asRecordArray(data) ?? asRecordArray(envelope?.calls ?? envelope?.data);
    if (list.length) return list.map(fromApiCall);
    return calls.map((call) => ({ ...call, syncState: 'synced' as const }));
  },

  exportReport: async (
    base: string,
    query: { resource: string; format?: string; dateFrom?: string; dateTo?: string },
  ) =>
    request<string>(base, '/reports/export.php', {
      query: { resource: query.resource, format: query.format ?? 'csv', dateFrom: query.dateFrom, dateTo: query.dateTo },
      accept: 'text/csv,application/json',
      raw: true,
    }),

  listNotifications: async (base: string) => {
    const payload = await request(base, '/notifications/index.php');
    const envelope = asRecord(payload);
    return {
      items: asRecordArray(dataOf(payload)),
      unreadCount: typeof envelope?.unreadCount === 'number' ? envelope.unreadCount : 0,
    };
  },

  markNotificationRead: (base: string, csrfToken: string, id?: string) =>
    request<{ success: boolean }>(base, '/notifications/index.php', {
      method: 'PATCH',
      csrfToken,
      body: id ? {} : { readAll: true },
      query: id ? { id } : undefined,
    }),

  getDashboard: async (base: string) => dataOf(await request(base, '/reports/dashboard.php')),

  getReports: async (base: string) => dataOf(await request(base, '/reports/index.php')),
};

async function filePart(uri: string, fileName: string, mimeType?: string): Promise<Blob | { uri: string; name: string; type: string }> {
  if (uri.startsWith('blob:') || uri.startsWith('http') || uri.startsWith('data:')) {
    const response = await fetch(uri);
    const blob = await response.blob();
    if (typeof File !== 'undefined') {
      return new File([blob], fileName, { type: mimeType || 'audio/mpeg' });
    }
    return blob;
  }
  return { uri, name: fileName, type: mimeType || 'audio/mpeg' };
}

export async function pullDesk(base: string, previous: Partial<AppData> = {}): Promise<Partial<AppData>> {
  const context: MapperContext = {
    executives: previous.executives ?? [],
    session: null,
    customers: previous.customers ?? [],
    leads: previous.leads ?? [],
    bookings: previous.bookings ?? [],
    followUps: previous.followUps ?? [],
  };
  const [customers, leads, followUpsRaw, bookings, calls, tasks, executives, activities] = await Promise.all([
    api.listCustomers(base),
    api.listLeads(base),
    request(base, '/followups/index.php'),
    api.listBookings(base),
    api.listCalls(base),
    api.listTasks(base),
    api.listUsers(base),
    api.listActivities(base),
  ]);
  const lookup: MapperContext = {
    ...context,
    executives,
    customers,
    leads,
    bookings,
    followUps: previous.followUps ?? [],
  };
  const followUps = mapList(followUpsRaw, (row) => fromApiFollowUp(row, lookup));
  const [recordings, drivers, vehicles, ...noteBatches] = await Promise.all([
    optional(() => api.listRecordings(base)),
    optional(() => api.listDrivers(base)),
    optional(() => api.listVehicles(base)),
    ...customers.map((item) => optional(() => api.listNotes(base, lookup, { entityType: 'Customer', entityId: item.id }))),
    ...leads.map((item) => optional(() => api.listNotes(base, lookup, { entityType: 'Lead', entityId: item.id }))),
  ]);
  const notes = noteBatches.flatMap((batch) => batch ?? []);
  return { customers, leads, followUps, bookings, calls, tasks, executives, activities, recordings, notes, drivers, vehicles };
}
