import assert from 'node:assert/strict';
import { formatPhone, normalizePhone, phonesMatch, telUri } from './phone';
import { matchDeviceCalls, type DeviceCall } from './syncCalls';
import type { CallRecord, Customer, Lead } from '../types';

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

console.log('all checks passed');
