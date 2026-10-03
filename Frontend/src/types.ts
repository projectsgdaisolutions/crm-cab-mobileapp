export type Role = 'calling_executive' | 'admin';

export type LeadStatus =
  | 'New'
  | 'Contacted'
  | 'Follow-up'
  | 'Interested'
  | 'Booking Confirmed'
  | 'Converted'
  | 'Lost';

export type CustomerStatus = 'Active' | 'VIP' | 'Inactive' | 'Lead' | 'Churned';
export type FollowUpStatus = 'Pending' | 'Completed' | 'Rescheduled' | 'Cancelled';
export type FollowUpType = 'Call' | 'Visit' | 'Message' | 'Booking';
export type FollowUpChannel = 'Phone' | 'WhatsApp' | 'Email' | 'Visit';
export type FollowUpPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type CallDirection = 'incoming' | 'outgoing';
export type CallStatus = 'Answered' | 'Missed' | 'Busy' | 'Rejected' | 'Failed';
export type BookingStatus = 'Enquiry' | 'Confirmed' | 'Assigned' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Unpaid' | 'Partial' | 'Paid' | 'Refunded';
export type VehicleType = 'Sedan' | 'SUV' | 'Hatchback' | 'Innova' | 'Tempo Traveller';
export type Priority = 'Low' | 'Medium' | 'High' | 'Hot';
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type TeamRole = 'Admin' | 'Manager' | 'Calling Executive';
export type RecordingAccess = 'Public' | 'Manager' | 'Admin';
export type SyncState = 'local' | 'synced' | 'failed';
export type EntityType = 'customer' | 'lead';
export type RecordingAvailability = 'available' | 'unavailable' | 'uploaded' | 'uploading' | 'failed' | 'processing' | 'permission_denied';

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  mobile: string;
  role: Role;
  desk: string;
  timezone?: string;
  bio?: string;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  alternate?: string;
  email?: string;
  address?: string;
  city?: string;
  notes?: string;
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
  estimatedValue?: number;
  nextFollowUpDate?: string;
  nextFollowUpTime?: string;
  remarks?: string;
  location?: string;
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
  channel?: FollowUpChannel;
  priority?: FollowUpPriority;
  assignedTo?: string;
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
  access?: RecordingAccess;
  fileSizeKb?: number;
  executive?: string;
  syncState: SyncState;
}

export interface Executive {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: TeamRole;
  active: boolean;
  /** Local demo password only. A live API would store this server-side. */
  password?: string;
  leadCount: number;
  callCount: number;
  conversionRate: number;
  lastActive: string;
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  dueDate: string;
  assignedTo: string;
  assignedToId?: string;
  relatedTo?: string;
  relatedToType?: string;
  relatedToId?: string;
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
  executives: Executive[];
  tasks: TaskItem[];
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

export const CUSTOMER_STATUSES: CustomerStatus[] = ['Active', 'VIP', 'Inactive', 'Lead', 'Churned'];
export const FOLLOW_UP_STATUSES: FollowUpStatus[] = ['Pending', 'Completed', 'Rescheduled', 'Cancelled'];
export const FOLLOW_UP_TYPES: FollowUpType[] = ['Call', 'Visit', 'Message', 'Booking'];
export const FOLLOW_UP_CHANNELS: FollowUpChannel[] = ['Phone', 'WhatsApp', 'Email', 'Visit'];
export const FOLLOW_UP_PRIORITIES: FollowUpPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
export const CALL_STATUSES: CallStatus[] = ['Answered', 'Missed', 'Busy', 'Rejected', 'Failed'];
export const BOOKING_STATUSES: BookingStatus[] = ['Enquiry', 'Confirmed', 'Assigned', 'Completed', 'Cancelled'];
export const PAYMENT_STATUSES: PaymentStatus[] = ['Unpaid', 'Partial', 'Paid', 'Refunded'];
export const VEHICLE_TYPES: VehicleType[] = ['Sedan', 'SUV', 'Hatchback', 'Innova', 'Tempo Traveller'];
export const PRIORITIES: Priority[] = ['Low', 'Medium', 'High', 'Hot'];
export const CAB_REQUIREMENTS = ['Airport Transfer', 'Outstation Cab', 'Hourly Rental', 'Corporate Travel', 'Wedding Car', 'City Taxi'];
export const TASK_STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'Completed'];
export const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
export const API_LEAD_SOURCES = [
  'Website',
  'Facebook',
  'Instagram',
  'Google Ads',
  'Referral',
  'Walk-in',
  'Inbound Call',
  'Outbound Call',
] as const;
export const LEAD_SOURCES = [
  'Website',
  'Facebook',
  'Instagram',
  'Google Ads',
  'Referral',
  'Walk-in',
  'Inbound Call',
  'Outbound Call',
  'Justdial',
  'Google',
  'Reference',
  'Repeat customer',
];
