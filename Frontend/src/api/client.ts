import type {
  AppData,
  Booking,
  CallRecord,
  Customer,
  FollowUp,
  Lead,
  Note,
  Recording,
  SessionUser,
} from '../types';

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
  token: string;
  user: SessionUser;
}

type Query = Record<string, string | undefined>;

function joinUrl(base: string, path: string): string {
  const root = base.replace(/\/$/, '');
  const suffix = path.startsWith('/') ? path : `/${path}`;
  return `${root}${suffix}`;
}

async function request<T>(
  base: string,
  path: string,
  options: {
    method?: string;
    token?: string | null;
    body?: unknown;
    form?: FormData;
    query?: Query;
  } = {},
): Promise<T> {
  if (!base.trim()) {
    throw new ApiError('CRM API address is not configured.', 0, true);
  }
  const url = new URL(joinUrl(base.trim(), path));
  Object.entries(options.query ?? {}).forEach(([key, value]) => {
    if (value) url.searchParams.set(key, value);
  });
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (options.token) headers.Authorization = `Bearer ${options.token}`;
  let body: BodyInit | undefined;
  if (options.form) {
    body = options.form;
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(options.body);
  }
  let response: Response;
  try {
    response = await fetch(url.toString(), {
      method: options.method ?? 'GET',
      headers,
      body,
    });
  } catch {
    throw new ApiError('The CRM API could not be reached.', 0, true);
  }
  const text = await response.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'message' in payload && typeof payload.message === 'string'
        ? payload.message
        : `CRM API returned ${response.status}.`;
    throw new ApiError(message, response.status, false);
  }
  return payload as T;
}

export const api = {
  login: (base: string, identifier: string, password: string) =>
    request<LoginResponse>(base, '/api/mobile/auth/login', {
      method: 'POST',
      body: { identifier, password },
    }),
  forgotPassword: (base: string, identifier: string) =>
    request<{ message: string }>(base, '/api/mobile/auth/forgot-password', {
      method: 'POST',
      body: { identifier },
    }),
  logout: (base: string, token: string) =>
    request<{ ok: boolean }>(base, '/api/mobile/auth/logout', { method: 'POST', token }),
  me: (base: string, token: string) => request<SessionUser>(base, '/api/mobile/auth/me', { token }),
  dashboard: (base: string, token: string) => request<unknown>(base, '/api/mobile/dashboard', { token }),
  listCustomers: (base: string, token: string) => request<Customer[]>(base, '/api/mobile/customers', { token }),
  saveCustomer: (base: string, token: string, customer: Customer, creating: boolean) =>
    request<Customer>(base, creating ? '/api/mobile/customers' : `/api/mobile/customers/${customer.id}`, {
      method: creating ? 'POST' : 'PATCH',
      token,
      body: customer,
    }),
  listLeads: (base: string, token: string) => request<Lead[]>(base, '/api/mobile/leads', { token }),
  saveLead: (base: string, token: string, lead: Lead, creating: boolean) =>
    request<Lead>(base, creating ? '/api/mobile/leads' : `/api/mobile/leads/${lead.id}`, {
      method: creating ? 'POST' : 'PATCH',
      token,
      body: lead,
    }),
  listFollowUps: (base: string, token: string) => request<FollowUp[]>(base, '/api/mobile/follow-ups', { token }),
  saveFollowUp: (base: string, token: string, followUp: FollowUp, creating: boolean) =>
    request<FollowUp>(base, creating ? '/api/mobile/follow-ups' : `/api/mobile/follow-ups/${followUp.id}`, {
      method: creating ? 'POST' : 'PATCH',
      token,
      body: followUp,
    }),
  listNotes: (base: string, token: string) => request<Note[]>(base, '/api/mobile/notes', { token }),
  saveNote: (base: string, token: string, note: Note) =>
    request<Note>(base, '/api/mobile/notes', { method: 'POST', token, body: note }),
  listBookings: (base: string, token: string) => request<Booking[]>(base, '/api/mobile/bookings', { token }),
  saveBooking: (base: string, token: string, booking: Booking, creating: boolean) =>
    request<Booking>(base, creating ? '/api/mobile/bookings' : `/api/mobile/bookings/${booking.id}`, {
      method: creating ? 'POST' : 'PATCH',
      token,
      body: booking,
    }),
  listCalls: (base: string, token: string) => request<CallRecord[]>(base, '/api/mobile/calls', { token }),
  saveCall: (base: string, token: string, call: CallRecord) =>
    request<CallRecord>(base, '/api/mobile/calls', { method: 'POST', token, body: call }),
  syncCalls: (base: string, token: string, calls: CallRecord[]) =>
    request<CallRecord[]>(base, '/api/mobile/calls/sync', { method: 'POST', token, body: { calls } }),
  listRecordings: (base: string, token: string) => request<Recording[]>(base, '/api/mobile/recordings', { token }),
  uploadRecording: (base: string, token: string, form: FormData) =>
    request<Recording>(base, '/api/mobile/recordings/upload', { method: 'POST', token, form }),
};

export async function pullDesk(base: string, token: string): Promise<Partial<AppData>> {
  const [customers, leads, followUps, notes, bookings, calls, recordings] = await Promise.all([
    api.listCustomers(base, token),
    api.listLeads(base, token),
    api.listFollowUps(base, token),
    api.listNotes(base, token),
    api.listBookings(base, token),
    api.listCalls(base, token),
    api.listRecordings(base, token),
  ]);
  return { customers, leads, followUps, notes, bookings, calls, recordings };
}
