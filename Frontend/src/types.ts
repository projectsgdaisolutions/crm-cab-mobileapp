export type Role = 'calling_executive' | 'admin';

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Follow-up'
  | 'Interested'
  | 'Booking Confirmed'
  | 'Converted'
  | 'Lost';

export type CustomerStatus = 'Active' | 'Inactive' | 'VIP';
export type FollowUpStatus = 'Pending' | 'Completed' | 'Rescheduled' | 'Cancelled';
export type FollowUpType = 'Call' | 'Visit' | 'Message' | 'Booking';
export type CallDirection = 'incoming' | 'outgoing';
export type CallStatus = 'Answered' | 'Missed' | 'Busy' | 'Failed';
export type BookingStatus = 'Enquiry' | 'Confirmed' | 'Assigned' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid';
export type VehicleType = 'Sedan' | 'SUV' | 'Hatchback' | 'Innova' | 'Tempo Traveller';
export type Priority = 'Low' | 'Medium' | 'High';
export type SyncState = 'local' | 'synced' | 'failed';
export type EntityType = 'customer' | 'lead';
export type RecordingAvailability = 'available' | 'unavailable' | 'uploaded' | 'uploading' | 'failed';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  desk: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  alternate?: string;
  email?: string;
  address?: string;
  pickup: string;
  drop: string;
  source: string;
  assignedTo: string;
  status: CustomerStatus;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
}

export interface Lead {
  id: string;
  name: string;
  mobile: string;
  email?: string;
  requirement: string;
  pickup: string;
  drop: string;
  travelDate: string;
  travelTime: string;
  source: string;
  assignedTo: string;
  status: LeadStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  syncState: SyncState;
}

export interface Note {
  id: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  body: string;
  createdBy: string;
  createdAt: string;
  syncState: SyncState;
}

export interface FollowUp {
  id: string;
  entityType: EntityType;
  entityId: string;
  entityName: string;
  mobile: string;
  date: string;
  time: string;
  type: FollowUpType;
  remarks: string;
  status: FollowUpStatus;
  createdBy: string;
  completedAt?: string;
  syncState: SyncState;
}

export interface Booking {
  id: string;
  entityType: EntityType;
  entityId: string;
  customerName: string;
  mobile: string;
  pickup: string;
  drop: string;
  travelDate: string;
  travelTime: string;
  vehicleType: VehicleType;
  passengers: number;
  fare: number;
  paymentStatus: PaymentStatus;
  status: BookingStatus;
  driver?: string;
  vehicleNumber?: string;
  remarks: string;
  createdBy: string;
  createdAt: string;
  syncState: SyncState;
}

export interface CallRecord {
  id: string;
  entityType?: EntityType;
  entityId?: string;
  name: string;
  mobile: string;
  direction: CallDirection;
  status: CallStatus;
  startedAt: string;
  durationSec: number;
  remarks?: string;
  recordingId?: string;
  source: 'dialer' | 'device_log' | 'manual';
  syncState: SyncState;
  createdBy: string;
}

export interface Recording {
  id: string;
  callId?: string;
  entityType?: EntityType;
  entityId?: string;
  name: string;
  mobile: string;
  fileName: string;
  uri?: string;
  durationSec: number;
  recordedAt: string;
  availability: RecordingAvailability;
  remoteUrl?: string;
  note?: string;
  previewClip?: boolean;
  syncState: SyncState;
}

export interface Activity {
  id: string;
  entityType: EntityType;
  entityId: string;
  type: string;
  at: string;
  remarks: string;
  actor: string;
}

export interface AppData {
  customers: Customer[];
  leads: Lead[];
  notes: Note[];
  followUps: FollowUp[];
  bookings: Booking[];
  calls: CallRecord[];
  recordings: Recording[];
  activities: Activity[];
}

export const LEAD_STATUSES: LeadStatus[] = [
  'New',
  'Contacted',
  'Follow-up',
  'Interested',
  'Booking Confirmed',
  'Converted',
  'Lost',
];

export const CUSTOMER_STATUSES: CustomerStatus[] = ['Active', 'Inactive', 'VIP'];
export const FOLLOW_UP_STATUSES: FollowUpStatus[] = ['Pending', 'Completed', 'Rescheduled', 'Cancelled'];
export const FOLLOW_UP_TYPES: FollowUpType[] = ['Call', 'Visit', 'Message', 'Booking'];
export const CALL_STATUSES: CallStatus[] = ['Answered', 'Missed', 'Busy', 'Failed'];
export const BOOKING_STATUSES: BookingStatus[] = ['Enquiry', 'Confirmed', 'Assigned', 'Completed', 'Cancelled'];
export const PAYMENT_STATUSES: PaymentStatus[] = ['Unpaid', 'Partial', 'Paid'];
export const VEHICLE_TYPES: VehicleType[] = ['Sedan', 'SUV', 'Hatchback', 'Innova', 'Tempo Traveller'];
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High'];
export const LEAD_SOURCES = ['Website', 'Justdial', 'Google', 'Reference', 'Walk-in', 'Repeat customer'];
