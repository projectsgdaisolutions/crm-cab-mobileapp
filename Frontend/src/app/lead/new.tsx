import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ChoiceRow, Field, PageHeader, Screen } from '../../components/ui';
import { ymd } from '../../lib/dates';
import { makeId } from '../../lib/ids';
import { isPlausibleMobile } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { LEAD_SOURCES, LEAD_STATUSES, PRIORITIES, type Lead, type LeadStatus, type Priority } from '../../types';

export default function LeadFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, saveLead, session } = useStore();
  const existing = data.leads.find((item) => item.id === id);
  const router = useRouter();
  const [name, setName] = useState(existing?.name ?? '');
  const [mobile, setMobile] = useState(existing?.mobile ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [requirement, setRequirement] = useState(existing?.requirement ?? '');
  const [pickup, setPickup] = useState(existing?.pickup ?? '');
  const [drop, setDrop] = useState(existing?.drop ?? '');
  const [travelDate, setTravelDate] = useState(existing?.travelDate ?? ymd(new Date()));
  const [travelTime, setTravelTime] = useState(existing?.travelTime ?? '10:00');
  const [source, setSource] = useState(existing?.source ?? LEAD_SOURCES[0]);
  const [status, setStatus] = useState<LeadStatus>(existing?.status ?? 'New');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'Medium');
  const [error, setError] = useState('');

  return (
    <Screen>
      <PageHeader title={existing ? 'Edit lead' : 'New lead'} back />
      <View style={{ padding: 20 }}>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Cab requirement" value={requirement} onChangeText={setRequirement} multiline />
        <Field label="Pickup" value={pickup} onChangeText={setPickup} />
        <Field label="Drop" value={drop} onChangeText={setDrop} />
        <Field label="Travel date" value={travelDate} onChangeText={setTravelDate} placeholder="YYYY-MM-DD" />
        <Field label="Travel time" value={travelTime} onChangeText={setTravelTime} placeholder="HH:MM" />
        <ChoiceRow label="Source" options={LEAD_SOURCES} value={source} onChange={setSource} />
        <ChoiceRow label="Priority" options={PRIORITIES} value={priority} onChange={setPriority} />
        <ChoiceRow label="Status" options={LEAD_STATUSES} value={status} onChange={setStatus} />
        {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 10 }}>{error}</Text> : null}
        <Button
          label={existing ? 'Save lead' : 'Create lead'}
          onPress={async () => {
            if (!name.trim() || !requirement.trim() || !pickup.trim() || !drop.trim()) {
              setError('Name, requirement, pickup, and drop are required.');
              return;
            }
            if (!isPlausibleMobile(mobile)) {
              setError('Enter a valid mobile number.');
              return;
            }
            if (!/^\d{4}-\d{2}-\d{2}$/.test(travelDate) || !/^\d{2}:\d{2}$/.test(travelTime)) {
              setError('Use date YYYY-MM-DD and time HH:MM.');
              return;
            }
            const now = new Date().toISOString();
            const row: Lead = {
              id: existing?.id ?? makeId('L'),
              name: name.trim(),
              mobile: mobile.trim(),
              email: email.trim() || undefined,
              requirement: requirement.trim(),
              pickup: pickup.trim(),
              drop: drop.trim(),
              travelDate,
              travelTime,
              source,
              assignedTo: existing?.assignedTo ?? session?.name ?? 'Calling executive',
              status,
              priority,
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
              syncState: 'local',
            };
            const saved = await saveLead(row, !existing);
            router.replace(`/lead/${saved.id}`);
          }}
        />
      </View>
    </Screen>
  );
}
