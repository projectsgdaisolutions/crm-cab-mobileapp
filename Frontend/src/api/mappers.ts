import { API_LEAD_SOURCES } from '../types';
import type {
  Activity,
  Booking,
  BookingStatus,
  CallDirection,
  CallRecord,
  Customer,
  EntityType,
  Executive,
  FollowUp,
  FollowUpType,
  Lead,
  PaymentStatus,
  Recording,
  Role,
  SessionUser,
  TaskItem,
  TeamRole,
  VehicleType,
} from '../types';

export interface MapperContext {
  executives: Executive[];
  session: SessionUser | null;
  customers?: Customer[];
  leads?: Lead[];
  bookings?: Booking[];
  followUps?: FollowUp[];
}

export function fromApiRole(role: unknown): Role {
  return String(role ?? '').toLowerCase() === 'admin' ? 'admin' : 'calling_executive';
}

export function fromApiTeamRole(role: unknown): TeamRole {
  const value = String(role ?? '');
  if (value === 'Admin' || value.toLowerCase() === 'admin') return 'Admin';
  if (value === 'Manager') return 'Manager';
  return 'Calling Executive';
}

export function toApiLeadSource(source: string): (typeof API_LEAD_SOURCES)[number] {
  if ((API_LEAD_SOURCES as readonly string[]).includes(source)) {
    return source as (typeof API_LEAD_SOURCES)[number];
  }
  if (source === 'Google' || source === 'Justdial') return 'Google Ads';
  if (source === 'Reference' || source === 'Repeat customer') return 'Referral';
  if (source === 'Incoming call' || source === 'Inbound call') return 'Inbound Call';
  return 'Website';
}

export function splitDateTime(value: string | null | undefined): { date: string; time: string } {
  if (!value) return { date: '', time: '10:00' };
  const match = String(value).match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
  if (match) return { date: match[1], time: match[2] };
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(value))) return { date: String(value), time: '10:00' };
  return { date: String(value).slice(0, 10), time: '10:00' };
}

export function joinDateTime(date: string, time?: string): string {
  const clock = time && /^\d{2}:\d{2}/.test(time) ? time.slice(0, 5) : '10:00';
  return `${date}T${clock}:00`;
}

export function apiOrigin(base: string): string {
  try {
    return new URL(base).origin;
  } catch {
    return base.replace(/\/api\/?$/, '');
  }
}

export function toDriverVehicle(driver?: string, vehicleNumber?: string): string {
  return [driver ? `Driver: ${driver}` : '', vehicleNumber ? `vehicle: ${vehicleNumber}` : '']
    .filter(Boolean)
    .join('; ');
}

export function fromDriverVehicle(value: string | null | undefined): { driver?: string; vehicleNumber?: string } {
  if (!value) return {};
  const driver = value.match(/Driver:\s*([^;]+)/i)?.[1]?.trim();
  const vehicleNumber = value.match(/vehicle:\s*([^;]+)/i)?.[1]?.trim();
  if (driver || vehicleNumber) return { driver, vehicleNumber };
  return { driver: value };
}

export function resolveExecutiveId(name: string | undefined, context: MapperContext): string | undefined {
  if (name) {
    const match = context.executives.find((person) => person.name === name);
    if (match) return match.id;
  }
  return context.session?.id;
}

export function fromApiUser(raw: Record<string, unknown>, desk = 'VehicoCRM'): SessionUser {
  const phone = String(raw.phone ?? raw.mobile ?? '');
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    mobile: phone,
    role: fromApiRole(raw.role),
    desk,
    timezone: raw.timezone == null ? undefined : String(raw.timezone),
    bio: raw.bio == null ? undefined : String(raw.bio),
  };
}

export function fromApiCustomer(raw: Record<string, unknown>): Customer {
  const city = String(raw.city ?? '');
  const location = String(raw.location ?? '');
  const joined = String(raw.joinedOn ?? raw.createdAt ?? new Date().toISOString());
  const updated = String(raw.lastContact ?? raw.updatedAt ?? joined);
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    mobile: String(raw.phone ?? raw.mobile ?? ''),
    email: raw.email ? String(raw.email) : undefined,
    address: location || undefined,
    city: city || undefined,
    notes: raw.notes ? String(raw.notes) : undefined,
    pickup: city || location,
    drop: location || city,
    source: 'Inbound Call',
    assignedTo: String(raw.assignedExecutiveName ?? ''),
    status: (raw.status as Customer['status']) ?? 'Active',
    createdAt: joined,
    updatedAt: updated,
    syncState: 'synced',
  };
}

export function toApiCustomer(customer: Customer, context: MapperContext): Record<string, unknown> {
  const assignedExecutiveId = resolveExecutiveId(customer.assignedTo, context);
  return {
    name: customer.name,
    phone: customer.mobile,
    email: customer.email ?? '',
    location: customer.address ?? customer.drop ?? '',
    city: customer.city ?? customer.pickup ?? '',
    status: customer.status,
    notes: customer.notes ?? '',
    tags: [],
    ...(assignedExecutiveId ? { assignedExecutiveId } : {}),
  };
}

export function fromApiLead(raw: Record<string, unknown>): Lead {
  const travel = splitDateTime(raw.travelAt == null ? undefined : String(raw.travelAt));
  const follow = splitDateTime(raw.nextFollowUp == null ? undefined : String(raw.nextFollowUp));
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    mobile: String(raw.phone ?? raw.mobile ?? ''),
    email: raw.email ? String(raw.email) : undefined,
    requirement: String(raw.interestedService ?? raw.requirement ?? ''),
    pickup: String(raw.pickupLocation ?? raw.pickup ?? ''),
    drop: String(raw.dropLocation ?? raw.drop ?? ''),
    travelDate: travel.date,
    travelTime: travel.time,
    source: String(raw.source ?? 'Website'),
    assignedTo: String(raw.assignedExecutiveName ?? ''),
    status: (raw.status as Lead['status']) ?? 'New',
    priority: (raw.priority as Lead['priority']) ?? 'Medium',
    estimatedValue: typeof raw.estimatedValue === 'number' ? raw.estimatedValue : Number(raw.estimatedValue ?? 0),
    nextFollowUpDate: raw.nextFollowUp ? follow.date : undefined,
    nextFollowUpTime: raw.nextFollowUp ? follow.time : undefined,
    remarks: raw.remarks ? String(raw.remarks) : undefined,
    location: raw.location ? String(raw.location) : undefined,
    createdAt: String(raw.createdOn ?? raw.createdAt ?? new Date().toISOString()),
    updatedAt: String(raw.updatedOn ?? raw.updatedAt ?? new Date().toISOString()),
    syncState: 'synced',
  };
}

export function toApiLead(lead: Lead, context: MapperContext, creating: boolean): Record<string, unknown> {
  const assignedExecutiveId = resolveExecutiveId(lead.assignedTo, context);
  const nextFollowUp = lead.nextFollowUpDate ? joinDateTime(lead.nextFollowUpDate, lead.nextFollowUpTime) : null;
  return {
    name: lead.name,
    phone: lead.mobile,
    email: lead.email ?? '',
    source: toApiLeadSource(lead.source),
    status: creating ? 'New' : lead.status === 'Converted' ? 'Booking Confirmed' : lead.status,
    priority: lead.priority,
    interestedService: lead.requirement,
    pickupLocation: lead.pickup,
    dropLocation: lead.drop,
    travelAt: joinDateTime(lead.travelDate, lead.travelTime),
    estimatedValue: lead.estimatedValue ?? 0,
    location: lead.location ?? lead.pickup,
    nextFollowUp,
    remarks: lead.remarks ?? '',
    ...(assignedExecutiveId ? { assignedExecutiveId } : {}),
  };
}

function partyMobile(entityType: EntityType, entityId: string, context: MapperContext): string {
  if (entityType === 'customer') {
    return context.customers?.find((item) => item.id === entityId)?.mobile ?? '';
  }
  return context.leads?.find((item) => item.id === entityId)?.mobile ?? '';
}

export function fromApiFollowUp(raw: Record<string, unknown>, context: MapperContext): FollowUp {
  const scheduled = splitDateTime(raw.scheduledAt == null ? undefined : String(raw.scheduledAt));
  const entityType: EntityType = String(raw.type ?? 'Lead').toLowerCase() === 'customer' ? 'customer' : 'lead';
  const entityId = String(raw.customerOrLeadId ?? '');
  const previous = context.followUps?.find((item) => item.id === String(raw.id ?? ''));
  const type: FollowUpType = previous?.type ?? 'Call';
  return {
    id: String(raw.id ?? ''),
    entityType,
    entityId,
    entityName: String(raw.customerOrLeadName ?? ''),
    mobile: partyMobile(entityType, entityId, context),
    date: scheduled.date,
    time: scheduled.time,
    type,
    channel: (raw.channel as FollowUp['channel']) ?? 'Phone',
    priority: (raw.priority as FollowUp['priority']) ?? 'Medium',
    assignedTo: String(raw.assignedExecutiveName ?? ''),
    remarks: String(raw.notes ?? raw.remarks ?? ''),
    status: (raw.status as FollowUp['status']) ?? 'Pending',
    createdBy: String(raw.assignedExecutiveName ?? ''),
    completedAt: raw.status === 'Completed' ? scheduled.date : undefined,
    syncState: 'synced',
  };
}

export function toApiFollowUp(followUp: FollowUp, context: MapperContext): Record<string, unknown> {
  const assignedExecutiveId = resolveExecutiveId(followUp.assignedTo, context);
  return {
    type: followUp.entityType === 'customer' ? 'Customer' : 'Lead',
    customerOrLeadId: followUp.entityId,
    scheduledAt: joinDateTime(followUp.date, followUp.time),
    status: followUp.status,
    priority: followUp.priority ?? 'Medium',
    channel: followUp.channel ?? 'Phone',
    notes: followUp.remarks,
    ...(assignedExecutiveId ? { assignedExecutiveId } : {}),
  };
}

export function fromApiBooking(raw: Record<string, unknown>): Booking {
  const travel = splitDateTime(raw.travelDate == null ? undefined : String(raw.travelDate));
  const details = fromDriverVehicle(raw.driverVehicleDetails == null ? undefined : String(raw.driverVehicleDetails));
  const kind = String(raw.customerOrLeadType ?? 'Customer');
  return {
    id: String(raw.id ?? ''),
    entityType: kind.toLowerCase() === 'lead' ? 'lead' : 'customer',
    entityId: String(raw.customerOrLeadId ?? raw.customerId ?? raw.leadId ?? ''),
    customerName: String(raw.customerName ?? ''),
    mobile: String(raw.mobileNumber ?? raw.mobile ?? ''),
    pickup: String(raw.pickupLocation ?? ''),
    drop: String(raw.dropLocation ?? ''),
    travelDate: travel.date,
    travelTime: travel.time,
    vehicleType: (raw.vehicleType as VehicleType) ?? 'Sedan',
    passengers: Number(raw.passengerCount ?? 1) || 1,
    fare: Number(raw.amount ?? 0) || 0,
    paymentStatus: (raw.paymentStatus as PaymentStatus) ?? 'Unpaid',
    status: (raw.bookingStatus as BookingStatus) ?? 'Enquiry',
    driver: details.driver,
    vehicleNumber: details.vehicleNumber,
    remarks: String(raw.remarks ?? ''),
    createdBy: String(raw.createdBy ?? ''),
    createdAt: String(raw.createdAt ?? new Date().toISOString()),
    syncState: 'synced',
  };
}

export function toApiBooking(booking: Booking, creating: boolean): Record<string, unknown> {
  return {
    customerOrLeadType: booking.entityType === 'lead' ? 'Lead' : 'Customer',
    customerOrLeadId: booking.entityId,
    mobileNumber: booking.mobile,
    pickupLocation: booking.pickup,
    dropLocation: booking.drop,
    travelDate: joinDateTime(booking.travelDate, booking.travelTime),
    vehicleType: booking.vehicleType,
    passengerCount: booking.passengers,
    bookingStatus: creating ? 'Enquiry' : booking.status,
    paymentStatus: booking.paymentStatus,
    amount: booking.fare,
    driverVehicleDetails: toDriverVehicle(booking.driver, booking.vehicleNumber),
    remarks: booking.remarks ?? '',
  };
}

export function fromApiCall(raw: Record<string, unknown>): CallRecord {
  const kind = String(raw.type ?? '').toLowerCase();
  const direction: CallDirection = String(raw.direction ?? '').toLowerCase() === 'incoming' ? 'incoming' : 'outgoing';
  return {
    id: String(raw.id ?? ''),
    entityType: kind === 'customer' ? 'customer' : kind === 'lead' ? 'lead' : undefined,
    entityId: raw.customerOrLeadId == null ? undefined : String(raw.customerOrLeadId),
    name: String(raw.customerOrLeadName ?? ''),
    mobile: String(raw.phoneNumber ?? ''),
    direction,
    status: (raw.status as CallRecord['status']) ?? 'Answered',
    startedAt: String(raw.timestamp ?? new Date().toISOString()).replace(' ', 'T'),
    durationSec: Number(raw.durationSec ?? 0) || 0,
    remarks: raw.notes ? String(raw.notes) : undefined,
    recordingId: raw.recordingId == null ? undefined : String(raw.recordingId),
    source: 'dialer',
    syncState: 'synced',
    createdBy: String(raw.executiveName ?? ''),
  };
}

export function toApiCall(call: CallRecord): Record<string, unknown> | null {
  if (!call.entityType || !call.entityId) return null;
  return {
    type: call.entityType === 'customer' ? 'Customer' : 'Lead',
    customerOrLeadId: call.entityId,
    phoneNumber: call.mobile,
    direction: call.direction === 'incoming' ? 'Incoming' : 'Outgoing',
    status: call.status,
    durationSec: call.durationSec,
    timestamp: call.startedAt,
    notes: call.remarks ?? '',
    followUpId: null,
  };
}

export function fromApiRecording(raw: Record<string, unknown>, base: string): Recording {
  const fileRef = raw.fileRef == null ? undefined : String(raw.fileRef);
  const id = String(raw.id ?? '');
  let remoteUrl: string | undefined;
  if (fileRef) {
    remoteUrl = fileRef.startsWith('http') ? fileRef : `${apiOrigin(base)}${fileRef.startsWith('/') ? fileRef : `/${fileRef}`}`;
  }
  const status = String(raw.status ?? 'Available').toLowerCase();
  return {
    id,
    name: String(raw.customerOrLeadName ?? 'Recording'),
    mobile: String(raw.phoneNumber ?? ''),
    fileName: raw.recordingId ? String(raw.recordingId) : `recording-${id}`,
    durationSec: Number(raw.durationSec ?? 0) || 0,
    recordedAt: String(raw.callDate ?? new Date().toISOString()).replace(' ', 'T'),
    availability: status === 'available' ? 'available' : 'unavailable',
    remoteUrl,
    note: raw.transcript ? String(raw.transcript) : undefined,
    access: raw.accessLevel === 'Public' ? 'Public' : raw.accessLevel === 'Manager' ? 'Manager' : 'Admin',
    fileSizeKb: raw.fileSizeKb == null ? undefined : Number(raw.fileSizeKb),
    executive: raw.executiveName ? String(raw.executiveName) : undefined,
    syncState: 'synced',
  };
}

export function fromApiExecutive(raw: Record<string, unknown>): Executive {
  return {
    id: String(raw.id ?? ''),
    name: String(raw.name ?? ''),
    email: String(raw.email ?? ''),
    phone: String(raw.phone ?? ''),
    role: fromApiTeamRole(raw.role),
    active: Boolean(raw.active),
    leadCount: Number(raw.leadCount ?? 0) || 0,
    callCount: Number(raw.callCount ?? 0) || 0,
    conversionRate: Number(raw.conversionRate ?? 0) || 0,
    lastActive: String(raw.lastActive ?? 'Not signed in'),
    createdAt: String(raw.joinedOn ?? raw.createdAt ?? new Date().toISOString()),
  };
}

export function toApiUser(executive: Executive, creating: boolean): Record<string, unknown> {
  const body: Record<string, unknown> = {
    name: executive.name,
    email: executive.email,
    phone: executive.phone,
    role: 'Calling Executive',
  };
  if (creating || executive.password) body.password = executive.password;
  if (!creating) body.active = executive.active;
  return body;
}

function fromApiTaskStatus(value: unknown): TaskItem['status'] {
  const status = String(value ?? '');
  if (status === 'Completed' || status === 'Done') return 'Completed';
  if (status === 'In Progress' || status === 'Review') return 'In Progress';
  return 'Pending';
}

function toApiTaskStatus(status: TaskItem['status']): 'Pending' | 'In Progress' | 'Completed' {
  if (status === 'Completed') return 'Completed';
  if (status === 'In Progress') return 'In Progress';
  return 'Pending';
}

export function fromApiTask(raw: Record<string, unknown>): TaskItem {
  const due = splitDateTime(raw.dueDate == null ? undefined : String(raw.dueDate));
  return {
    id: String(raw.id ?? ''),
    title: String(raw.title ?? ''),
    description: String(raw.description ?? ''),
    priority: (raw.priority as TaskItem['priority']) ?? 'Medium',
    status: fromApiTaskStatus(raw.status),
    dueDate: due.date || String(raw.dueDate ?? ''),
    assignedTo: String(raw.assignedToName ?? ''),
    assignedToId: raw.assignedToId == null ? undefined : String(raw.assignedToId),
    relatedTo: raw.relatedToName ? String(raw.relatedToName) : undefined,
    relatedToType: raw.relatedToType == null ? undefined : String(raw.relatedToType),
    relatedToId: raw.relatedToId == null ? undefined : String(raw.relatedToId),
    syncState: 'synced',
  };
}

export function toApiTask(task: TaskItem, context: MapperContext): Record<string, unknown> {
  const assignedToId = task.assignedToId ?? resolveExecutiveId(task.assignedTo, context);
  const related = resolveRelated(task, context);
  return {
    title: task.title,
    description: task.description,
    assignedToId,
    dueDate: task.dueDate ? joinDateTime(task.dueDate, '10:00') : undefined,
    priority: task.priority,
    status: toApiTaskStatus(task.status),
    ...related,
  };
}

function resolveRelated(task: TaskItem, context: MapperContext): Record<string, string> {
  if (task.relatedToType && task.relatedToId) {
    return { relatedToType: task.relatedToType, relatedToId: task.relatedToId };
  }
  const needle = task.relatedTo?.trim();
  if (!needle) return {};
  const booking = context.bookings?.find((item) => item.id === needle || item.customerName === needle);
  if (booking) return { relatedToType: 'Booking', relatedToId: booking.id };
  const customer = context.customers?.find((item) => item.id === needle || item.name === needle);
  if (customer) return { relatedToType: 'Customer', relatedToId: customer.id };
  const lead = context.leads?.find((item) => item.id === needle || item.name === needle);
  if (lead) return { relatedToType: 'Lead', relatedToId: lead.id };
  return {};
}

export function fromApiActivity(raw: Record<string, unknown>): Activity | null {
  const relatedType = String(raw.relatedType ?? '').toLowerCase();
  if (relatedType !== 'customer' && relatedType !== 'lead') {
    return {
      id: String(raw.id ?? ''),
      entityType: 'customer',
      entityId: String(raw.relatedId ?? ''),
      type: String(raw.type ?? raw.title ?? 'Activity'),
      at: String(raw.timestamp ?? new Date().toISOString()).replace(' ', 'T'),
      remarks: String(raw.description ?? raw.title ?? ''),
      actor: String(raw.actor ?? ''),
    };
  }
  return {
    id: String(raw.id ?? ''),
    entityType: relatedType,
    entityId: String(raw.relatedId ?? ''),
    type: String(raw.type ?? raw.title ?? 'Activity'),
    at: String(raw.timestamp ?? new Date().toISOString()).replace(' ', 'T'),
    remarks: String(raw.description ?? raw.title ?? ''),
    actor: String(raw.actor ?? ''),
  };
}

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export function asRecordArray(value: unknown): Record<string, unknown>[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === 'object' && !Array.isArray(item));
  }
  const single = asRecord(value);
  return single ? [single] : [];
}
