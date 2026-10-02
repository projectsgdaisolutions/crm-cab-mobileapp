import type { CallRecord, Customer, Lead, EntityType } from '../types';
import { phonesMatch } from './phone';

export interface DeviceCall {
  number: string;
  name?: string | null;
  direction: 'incoming' | 'outgoing';
  status: 'Answered' | 'Missed' | 'Busy' | 'Failed';
  startedAt: number;
  durationSec: number;
}

export interface MatchedDeviceCall extends DeviceCall {
  key: string;
  duplicate: boolean;
  entityType?: EntityType;
  entityId?: string;
  entityName?: string;
}

const DUPLICATE_WINDOW_MS = 90_000;

function partyMatch(
  number: string,
  customers: Customer[],
  leads: Lead[],
): { entityType: EntityType; entityId: string; entityName: string } | undefined {
  const customer = customers.find((item) => phonesMatch(item.mobile, number) || (item.alternate ? phonesMatch(item.alternate, number) : false));
  if (customer) return { entityType: 'customer', entityId: customer.id, entityName: customer.name };
  const lead = leads.find((item) => phonesMatch(item.mobile, number));
  if (lead) return { entityType: 'lead', entityId: lead.id, entityName: lead.name };
  return undefined;
}

function isDuplicate(existing: CallRecord[], call: DeviceCall, entityId?: string): boolean {
  return existing.some((row) => {
    if (!phonesMatch(row.mobile, call.number)) return false;
    if (row.direction !== call.direction) return false;
    if (entityId && row.entityId && row.entityId !== entityId) return false;
    const delta = Math.abs(new Date(row.startedAt).getTime() - call.startedAt);
    return delta <= DUPLICATE_WINDOW_MS;
  });
}

export function matchDeviceCalls(
  existing: CallRecord[],
  deviceCalls: DeviceCall[],
  customers: Customer[],
  leads: Lead[],
): MatchedDeviceCall[] {
  return deviceCalls.map((call, index) => {
    const party = partyMatch(call.number, customers, leads);
    return {
      ...call,
      key: `${call.startedAt}-${call.number}-${index}`,
      duplicate: isDuplicate(existing, call, party?.entityId),
      entityType: party?.entityType,
      entityId: party?.entityId,
      entityName: party?.entityName,
    };
  });
}
