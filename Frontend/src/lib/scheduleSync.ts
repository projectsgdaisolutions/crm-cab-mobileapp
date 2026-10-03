import type { FollowUpChannel, FollowUpPriority, FollowUpType } from '../types';
import { FOLLOW_UP_CHANNELS, FOLLOW_UP_PRIORITIES, FOLLOW_UP_TYPES } from '../types';

export type PartyKind = 'Customer' | 'Lead';

export interface ScheduleParty {
  type: 'customer' | 'lead';
  id: string;
  name: string;
  mobile: string;
}

/** Channel that matches a follow-up type, so the two fields stay aligned. */
export function channelForFollowType(type: FollowUpType): FollowUpChannel {
  if (type === 'Visit') return 'Visit';
  if (type === 'Message') return 'WhatsApp';
  return 'Phone';
}

export function isFollowType(value: string | undefined): value is FollowUpType {
  return !!value && (FOLLOW_UP_TYPES as readonly string[]).includes(value);
}

export function isFollowChannel(value: string | undefined): value is FollowUpChannel {
  return !!value && (FOLLOW_UP_CHANNELS as readonly string[]).includes(value);
}

export function isFollowPriority(value: string | undefined): value is FollowUpPriority {
  return !!value && (FOLLOW_UP_PRIORITIES as readonly string[]).includes(value);
}

export function kindForParty(type: ScheduleParty['type']): PartyKind {
  return type === 'lead' ? 'Lead' : 'Customer';
}

export function partiesForKind(kind: PartyKind, parties: ScheduleParty[]): ScheduleParty[] {
  return parties.filter((item) => (kind === 'Lead' ? item.type === 'lead' : item.type === 'customer'));
}

/**
 * Keep the selected person inside the list for the current Customer / Lead type.
 * A stale id from the other list is replaced with the first matching person.
 */
export function syncPartyId(kind: PartyKind, parties: ScheduleParty[], currentId: string): string {
  const visible = partiesForKind(kind, parties);
  if (visible.some((item) => item.id === currentId)) return currentId;
  return visible[0]?.id ?? '';
}

export function partyLabel(party: ScheduleParty): string {
  return `${party.name} · ${party.mobile}`;
}

export function nextFollowUpForLead<T extends { id: string; nextFollowUpDate?: string; nextFollowUpTime?: string; updatedAt: string }>(
  leads: T[],
  input: { creating: boolean; entityType: string; entityId: string; status: string; date: string; time: string },
  updatedAt: string,
): T[] {
  const open = input.status === 'Pending' || input.status === 'Rescheduled';
  if (!input.creating || !open || input.entityType !== 'lead') return leads;
  return leads.map((lead) =>
    lead.id === input.entityId ? { ...lead, nextFollowUpDate: input.date, nextFollowUpTime: input.time, updatedAt } : lead,
  );
}
