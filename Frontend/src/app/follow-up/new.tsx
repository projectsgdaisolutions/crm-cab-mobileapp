import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ChoiceRow, Field, PageHeader, Screen, SelectField } from '../../components/ui';
import { ymd } from '../../lib/dates';
import { makeId } from '../../lib/ids';
import {
  channelForFollowType,
  isFollowChannel,
  isFollowPriority,
  isFollowType,
  kindForParty,
  partiesForKind,
  partyLabel,
  syncPartyId,
  type PartyKind,
  type ScheduleParty,
} from '../../lib/scheduleSync';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import {
  FOLLOW_UP_CHANNELS,
  FOLLOW_UP_PRIORITIES,
  FOLLOW_UP_TYPES,
  type EntityType,
  type FollowUp,
  type FollowUpChannel,
  type FollowUpPriority,
  type FollowUpType,
} from '../../types';

export default function FollowUpFormScreen() {
  const params = useLocalSearchParams<{
    entityType?: string;
    entityId?: string;
    followType?: string;
    channel?: string;
    priority?: string;
    assignedTo?: string;
    date?: string;
    time?: string;
    remarks?: string;
    sourceId?: string;
  }>();
  const { data, saveFollowUp, session } = useStore();
  const router = useRouter();
  const appliedRoute = useRef(false);

  const parties = useMemo<ScheduleParty[]>(
    () => [
      ...data.customers.map((item) => ({ type: 'customer' as const, id: item.id, name: item.name, mobile: item.mobile })),
      ...data.leads.map((item) => ({ type: 'lead' as const, id: item.id, name: item.name, mobile: item.mobile })),
    ],
    [data.customers, data.leads],
  );

  const [entityKind, setEntityKind] = useState<PartyKind>('Customer');
  const [partyId, setPartyId] = useState('');
  const [date, setDate] = useState(ymd(new Date()));
  const [time, setTime] = useState('11:00');
  const [type, setType] = useState<FollowUpType>('Call');
  const [channel, setChannel] = useState<FollowUpChannel>('Phone');
  const [priority, setPriority] = useState<FollowUpPriority>('Medium');
  const [assignedTo, setAssignedTo] = useState(session?.name ?? '');
  const assignedTouched = useRef(false);
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (appliedRoute.current) return;
    const requestedId = typeof params.entityId === 'string' ? params.entityId : '';
    if (requestedId && !parties.some((item) => item.id === requestedId)) return;

    const requested = parties.find((item) => item.id === requestedId);
    const kind: PartyKind = requested
      ? kindForParty(requested.type)
      : params.entityType === 'lead'
        ? 'Lead'
        : 'Customer';
    setEntityKind(kind);
    setPartyId(syncPartyId(kind, parties, requested?.id ?? ''));

    if (isFollowType(params.followType)) {
      setType(params.followType);
      setChannel(isFollowChannel(params.channel) ? params.channel : channelForFollowType(params.followType));
    } else if (isFollowChannel(params.channel)) {
      setChannel(params.channel);
    }
    if (isFollowPriority(params.priority)) setPriority(params.priority);
    if (typeof params.assignedTo === 'string' && params.assignedTo) {
      assignedTouched.current = true;
      setAssignedTo(params.assignedTo);
    }
    if (typeof params.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(params.date)) setDate(params.date);
    if (typeof params.time === 'string' && /^\d{2}:\d{2}$/.test(params.time)) setTime(params.time);
    if (typeof params.remarks === 'string' && params.remarks) setRemarks(params.remarks);
    appliedRoute.current = true;
  }, [params, parties]);

  useEffect(() => {
    if (assignedTouched.current || assignedTo || !session?.name) return;
    setAssignedTo(session.name);
  }, [assignedTo, session?.name]);

  const visibleParties = partiesForKind(entityKind, parties);
  const party = visibleParties.find((item) => item.id === partyId) ?? null;
  const partyOptions = visibleParties.map(partyLabel);
  const selectedLabel = party ? partyLabel(party) : '';

  function changeKind(kind: PartyKind) {
    setEntityKind(kind);
    setPartyId(syncPartyId(kind, parties, ''));
  }

  function changeType(next: FollowUpType) {
    setType(next);
    setChannel(channelForFollowType(next));
  }

  return (
    <Screen>
      <PageHeader title="Schedule Follow-up" subtitle="New schedule" back />
      <View style={{ padding: 20 }}>
        <ChoiceRow label="Customer / Lead *" options={['Customer', 'Lead']} value={entityKind} onChange={changeKind} />

        <SelectField
          label={entityKind === 'Lead' ? 'Select Lead *' : 'Select Customer *'}
          options={partyOptions.length ? partyOptions : ['No options available']}
          value={selectedLabel}
          onChange={(label) => {
            const match = visibleParties.find((item) => partyLabel(item) === label);
            if (match) setPartyId(match.id);
          }}
        />

        <ChoiceRow label="Type" options={FOLLOW_UP_TYPES} value={type} onChange={changeType} />

        <ChoiceRow label="Channel" options={FOLLOW_UP_CHANNELS} value={channel} onChange={setChannel} />

        <Field label="Scheduled at *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Field label="Time *" value={time} onChangeText={setTime} placeholder="HH:MM" />

        <ChoiceRow label="Priority" options={FOLLOW_UP_PRIORITIES} value={priority} onChange={setPriority} />

        <Field
          label="Assigned to"
          value={assignedTo}
          onChangeText={(value) => {
            assignedTouched.current = true;
            setAssignedTo(value);
          }}
          placeholder={session?.name ?? 'Calling executive'}
        />

        <Field
          label="Notes"
          value={remarks}
          onChangeText={setRemarks}
          placeholder="Context, purpose, expected outcome..."
          multiline
        />

        {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
          <View style={{ flex: 1 }}>
            <Button label="Cancel" tone="ghost" onPress={() => router.back()} />
          </View>
          <View style={{ flex: 1 }}>
            <Button
              label="Schedule"
              onPress={async () => {
                if (!party || !remarks.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
                  setError('Pick a person, a valid date and time, and a note.');
                  return;
                }
                const row: FollowUp = {
                  id: makeId('F'),
                  entityType: party.type as EntityType,
                  entityId: party.id,
                  entityName: party.name,
                  mobile: party.mobile,
                  date,
                  time,
                  type,
                  channel,
                  priority,
                  assignedTo: assignedTo.trim() || session?.name,
                  remarks: remarks.trim(),
                  status: 'Pending',
                  createdBy: session?.name ?? 'Calling executive',
                  syncState: 'local',
                };
                await saveFollowUp(row, true);
                const sourceId = typeof params.sourceId === 'string' ? params.sourceId : '';
                if (sourceId) {
                  const previous = data.followUps.find((item) => item.id === sourceId);
                  if (previous && previous.status !== 'Completed' && previous.status !== 'Cancelled') {
                    await saveFollowUp({ ...previous, status: 'Rescheduled' }, false);
                  }
                }
                router.back();
              }}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}
