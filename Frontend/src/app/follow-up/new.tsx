import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, ChoiceRow, Field, PageHeader, Screen } from '../../components/ui';
import { ymd } from '../../lib/dates';
import { makeId } from '../../lib/ids';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { FOLLOW_UP_CHANNELS, FOLLOW_UP_PRIORITIES, FOLLOW_UP_TYPES, type EntityType, type FollowUp, type FollowUpChannel, type FollowUpPriority, type FollowUpType } from '../../types';

export default function FollowUpFormScreen() {
  const params = useLocalSearchParams<{ entityType?: string; entityId?: string; name?: string; mobile?: string }>();
  const { data, saveFollowUp, session } = useStore();
  const router = useRouter();
  const parties = [
    ...data.customers.map((item) => ({ type: 'customer' as const, id: item.id, name: item.name, mobile: item.mobile })),
    ...data.leads.map((item) => ({ type: 'lead' as const, id: item.id, name: item.name, mobile: item.mobile })),
  ];
  const initial = parties.find((item) => item.id === params.entityId) ?? parties[0];
  const [partyId, setPartyId] = useState(initial?.id ?? '');
  const [date, setDate] = useState(ymd(new Date()));
  const [time, setTime] = useState('11:00');
  const [type, setType] = useState<FollowUpType>('Call');
  const [channel, setChannel] = useState<FollowUpChannel>('Phone');
  const [priority, setPriority] = useState<FollowUpPriority>('Medium');
  const [assignedTo, setAssignedTo] = useState(session?.name ?? '');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');
  const party = parties.find((item) => item.id === partyId);

  return (
    <Screen>
      <PageHeader title="Schedule follow-up" subtitle={party?.name} back />
      <View style={{ padding: 20 }}>
        {!params.entityId ? parties.slice(0, 8).map((item) => (
          <Pressable key={item.id} onPress={() => setPartyId(item.id)}>
            <Text style={{ paddingVertical: 6, fontFamily: fonts.semibold, color: item.id === partyId ? colors.saffronDeep : colors.ink }}>{item.name}</Text>
          </Pressable>
        )) : null}
        <Field label="Date" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Field label="Time" value={time} onChangeText={setTime} placeholder="HH:MM" />
        <ChoiceRow label="Type" options={['Customer', 'Lead']} value={party?.type === 'lead' ? 'Lead' : 'Customer'} onChange={(kind) => {
          const next = parties.find((item) => item.type === (kind === 'Lead' ? 'lead' : 'customer'));
          if (next) setPartyId(next.id);
        }} />
        <ChoiceRow label="Channel" options={FOLLOW_UP_CHANNELS} value={channel} onChange={setChannel} />
        <ChoiceRow label="Follow-up kind" options={FOLLOW_UP_TYPES} value={type} onChange={setType} />
        <ChoiceRow label="Priority" options={FOLLOW_UP_PRIORITIES} value={priority} onChange={setPriority} />
        <Field label="Assigned to" value={assignedTo} onChangeText={setAssignedTo} placeholder={session?.name ?? 'Calling executive'} />
        <Field label="Notes" value={remarks} onChangeText={setRemarks} placeholder="Context, purpose, expected outcome" multiline />
        {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}
        <Button
          label="Save follow-up"
          onPress={async () => {
            if (!party || !remarks.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
              setError('Pick a person, a valid date and time, and a remark.');
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
            router.back();
          }}
        />
      </View>
    </Screen>
  );
}
