import assert from 'node:assert/strict';
import { matchesOnDate, taskStats } from './deskFilters';
import { buildNotifications } from './notifications';
import { formatPhone, normalizePhone, phonesMatch, telUri } from './phone';
import { channelForFollowType, nextFollowUpForLead, syncPartyId } from './scheduleSync';
import { matchDeviceCalls, type DeviceCall } from './syncCalls';
import type { AppData, CallRecord, Customer, Lead } from '../types';

function check(name: string, fn: () => void) {
  try {
    fn();
    console.log(`ok ${name}`);
  } catch (error) {
    console.error(`fail ${name}`);
    throw error;
  }
}

const customer: Customer = {
  id: 'C-1',
  name: 'Ananya Iyer',
  mobile: '+91 98450 11220',
  pickup: 'Andheri',
  drop: 'BKC',
  source: 'Repeat customer',
  assignedTo: 'Priya Sharma',
  status: 'Active',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  syncState: 'synced',
};

const lead: Lead = {
  id: 'L-1',
  name: 'Kabir Joshi',
  mobile: '9988776655',
  requirement: 'Airport drop',
  pickup: 'Powai',
  drop: 'T2',
  travelDate: '2026-10-02',
  travelTime: '05:30',
  source: 'Website',
  assignedTo: 'Priya Sharma',
  status: 'New',
  priority: 'High',
  createdAt: '2026-09-01T00:00:00.000Z',
  updatedAt: '2026-09-01T00:00:00.000Z',
  syncState: 'synced',
};

check('normalizes Indian mobiles', () => {
  assert.equal(normalizePhone('9845011220'), '919845011220');
  assert.equal(normalizePhone('+91 98450 11220'), '919845011220');
  assert.equal(normalizePhone('09845011220'), '919845011220');
  assert.equal(formatPhone('9845011220'), '+91 98450 11220');
  assert.equal(telUri('98450 11220'), 'tel:+919845011220');
});

check('matches the last 10 digits', () => {
  assert.equal(phonesMatch('+91 98450 11220', '9845011220'), true);
  assert.equal(phonesMatch('9845011220', '9988776655'), false);
});

check('links device calls and skips duplicates', () => {
  const started = Date.parse('2026-10-01T08:00:00.000Z');
  const existing: CallRecord[] = [
    {
      id: 'CALL-1',
      entityType: 'customer',
      entityId: 'C-1',
      name: 'Ananya Iyer',
      mobile: '+91 98450 11220',
      direction: 'outgoing',
      status: 'Answered',
      startedAt: new Date(started).toISOString(),
      durationSec: 40,
      source: 'dialer',
      syncState: 'synced',
      createdBy: 'Priya Sharma',
    },
  ];
  const device: DeviceCall[] = [
    {
      number: '9845011220',
      name: 'Ananya',
      direction: 'outgoing',
      status: 'Answered',
      startedAt: started + 15_000,
      durationSec: 42,
    },
    {
      number: '9988776655',
      direction: 'incoming',
      status: 'Missed',
      startedAt: started + 3_600_000,
      durationSec: 0,
    },
    {
      number: '9000000001',
      direction: 'incoming',
      status: 'Answered',
      startedAt: started + 7_200_000,
      durationSec: 80,
    },
  ];
  const matched = matchDeviceCalls(existing, device, [customer], [lead]);
  assert.equal(matched[0].duplicate, true);
  assert.equal(matched[0].entityId, 'C-1');
  assert.equal(matched[1].duplicate, false);
  assert.equal(matched[1].entityType, 'lead');
  assert.equal(matched[1].entityName, 'Kabir Joshi');
  assert.equal(matched[2].entityId, undefined);
});

check('syncs the person when the follow-up type changes', () => {
  const parties = [
    { type: 'customer' as const, id: 'C-1', name: 'Ananya', mobile: '1' },
    { type: 'lead' as const, id: 'L-1', name: 'Kabir', mobile: '2' },
  ];
  assert.equal(syncPartyId('Lead', parties, 'C-1'), 'L-1');
  assert.equal(syncPartyId('Customer', parties, 'L-1'), 'C-1');
  assert.equal(syncPartyId('Lead', parties, 'L-1'), 'L-1');
  assert.equal(channelForFollowType('Call'), 'Phone');
  assert.equal(channelForFollowType('Message'), 'WhatsApp');
  assert.equal(channelForFollowType('Visit'), 'Visit');
});

check('copies a new schedule onto the lead follow-up fields', () => {
  const leads = [{ id: 'L-1', nextFollowUpDate: '2026-10-01', nextFollowUpTime: '09:00', updatedAt: 'old' }];
  const next = nextFollowUpForLead(
    leads,
    { creating: true, entityType: 'lead', entityId: 'L-1', status: 'Pending', date: '2026-10-04', time: '15:30' },
    'new',
  );
  assert.equal(next[0].nextFollowUpDate, '2026-10-04');
  assert.equal(next[0].nextFollowUpTime, '15:30');
  const skipped = nextFollowUpForLead(
    leads,
    { creating: true, entityType: 'customer', entityId: 'C-1', status: 'Pending', date: '2026-10-04', time: '15:30' },
    'new',
  );
  assert.equal(skipped[0].nextFollowUpDate, '2026-10-01');
});

check('builds local notifications and skips the report feed', () => {
  const now = new Date('2026-10-03T12:00:00');
  const data = {
    customers: [],
    leads: [{ ...lead, createdAt: '2026-10-03T08:00:00.000Z' }],
    notes: [],
    followUps: [
      {
        id: 'F-1',
        entityType: 'lead' as const,
        entityId: 'L-1',
        entityName: 'Kabir Joshi',
        mobile: '9988776655',
        date: '2026-10-03',
        time: '09:00',
        type: 'Call' as const,
        channel: 'Phone' as const,
        remarks: 'Confirm pickup',
        status: 'Pending' as const,
        createdBy: 'Priya',
        syncState: 'local' as const,
      },
    ],
    bookings: [],
    calls: [],
    recordings: [],
    activities: [],
    executives: [],
    tasks: [],
    drivers: [],
    vehicles: [],
  } satisfies AppData;
  const items = buildNotifications(data, { reminders: true, leadAlerts: true, bookingAlerts: false }, now);
  assert.equal(items.some((item) => item.id === 'followup:F-1'), true);
  assert.equal(items.some((item) => item.id === 'lead:L-1'), true);
  assert.equal(items.some((item) => item.title.toLowerCase().includes('report')), false);
  const quiet = buildNotifications(data, { reminders: false, leadAlerts: false, bookingAlerts: false }, now);
  assert.equal(quiet.length, 0);
});

check('filters a desk by day and counts open tasks', () => {
  assert.equal(matchesOnDate('2026-10-03T09:00:00.000Z', ''), true);
  assert.equal(matchesOnDate('2026-10-03T09:00:00.000Z', '2026-10-03'), true);
  assert.equal(matchesOnDate('2026-10-04', '2026-10-03'), false);
  const stats = taskStats(
    [
      { id: 'T-1', title: 'A', description: '', priority: 'High', status: 'Todo', dueDate: '2026-10-03', assignedTo: 'Priya', syncState: 'local' },
      { id: 'T-2', title: 'B', description: '', priority: 'Low', status: 'Done', dueDate: '2026-10-03', assignedTo: 'Priya', syncState: 'local' },
      { id: 'T-3', title: 'C', description: '', priority: 'Medium', status: 'Review', dueDate: '2026-10-01', assignedTo: 'Priya', syncState: 'local' },
    ],
    '2026-10-03',
  );
  assert.equal(stats.open, 2);
  assert.equal(stats.dueToday, 1);
  assert.equal(stats.overdue, 1);
});

console.log('all checks passed');
