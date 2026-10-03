import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ChoiceRow, Field, PageHeader, Screen, SelectField } from '../../components/ui';
import { ymd } from '../../lib/dates';
import { makeId } from '../../lib/ids';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { FOLLOW_UP_CHANNELS, FOLLOW_UP_PRIORITIES, FOLLOW_UP_TYPES, type EntityType, type FollowUp, type FollowUpChannel, type FollowUpPriority, type FollowUpType } from '../../types';

export default function FollowUpFormScreen() {
  const params = useLocalSearchParams<{ entityType?: string; entityId?: string; name?: string; mobile?: string }>();
  const { data, saveFollowUp, session } = useStore();
  const router = useRouter();

  const customers = data.customers.map((item) => ({ type: 'customer' as const, id: item.id, name: item.name, mobile: item.mobile }));
  const leads = data.leads.map((item) => ({ type: 'lead' as const, id: item.id, name: item.name, mobile: item.mobile }));
  const parties = [...customers, ...leads];

  const initial = parties.find((item) => item.id === params.entityId) ?? parties[0];
  const [entityKind, setEntityKind] = useState<'Customer' | 'Lead'>(initial?.type === 'lead' ? 'Lead' : 'Customer');
  const [partyId, setPartyId] = useState(initial?.id ?? '');
  const [date, setDate] = useState(ymd(new Date()));
  const [time, setTime] = useState('11:00');
  const [type, setType] = useState<FollowUpType>('Call');
  const [channel, setChannel] = useState<FollowUpChannel>('Phone');
  const [priority, setPriority] = useState<FollowUpPriority>('Medium');
  const [assignedTo, setAssignedTo] = useState(session?.name ?? '');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  const visibleParties = entityKind === 'Lead' ? leads : customers;
  const partyOptions = visibleParties.map((item) => item.name);
  const selectedPartyName = visibleParties.find((item) => item.id === partyId)?.name ?? partyOptions[0] ?? '';
  const party = parties.find((item) => item.id === partyId);

  return (
    <Screen>
      <PageHeader title="Schedule Follow-up" subtitle="New schedule" back />
      <View style={{ padding: 20 }}>
        {/* Customer / Lead * toggle */}
        <ChoiceRow
          label="Customer / Lead *"
          options={['Customer', 'Lead']}
          value={entityKind}
          onChange={(kind) => {
            setEntityKind(kind);
            const next = kind === 'Lead' ? leads[0] : customers[0];
            if (next) setPartyId(next.id);
          }}
        />

        {/* Select lead / customer dropdown */}
        <SelectField
          label={entityKind === 'Lead' ? 'Select Lead *' : 'Select Customer *'}
          options={partyOptions.length ? partyOptions : ['No options available']}
          value={selectedPartyName}
          onChange={(name) => {
            const match = visibleParties.find((item) => item.name === name);
            if (match) setPartyId(match.id);
          }}
        />

        {/* Type */}
        <ChoiceRow label="Type" options={FOLLOW_UP_TYPES} value={type} onChange={setType} />

        {/* Channel */}
        <ChoiceRow label="Channel" options={FOLLOW_UP_CHANNELS} value={channel} onChange={setChannel} />

        {/* Scheduled at */}
        <Field label="Scheduled at *" value={date} onChangeText={setDate} placeholder="YYYY-MM-DD" />
        <Field label="Time *" value={time} onChangeText={setTime} placeholder="HH:MM" />

        {/* Priority */}
        <ChoiceRow label="Priority" options={FOLLOW_UP_PRIORITIES} value={priority} onChange={setPriority} />

        {/* Assigned to */}
        <Field label="Assigned to" value={assignedTo} onChangeText={setAssignedTo} placeholder={session?.name ?? 'Calling executive'} />

        {/* Notes */}
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
                router.back();
              }}
            />
          </View>
        </View>
      </View>
    </Screen>
  );
}
