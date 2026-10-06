import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ChoiceRow, Field, PageHeader, Screen } from '../../components/ui';
import { ymd } from '../../lib/dates';
import { makeId } from '../../lib/ids';
import { isPlausibleMobile } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { API_LEAD_SOURCES, CAB_REQUIREMENTS, LEAD_SOURCES, LEAD_STATUSES, PRIORITIES, type Lead, type LeadStatus, type Priority } from '../../types';

export default function LeadFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, saveLead, session, mode } = useStore();
  const existing = data.leads.find((item) => item.id === id);
  const router = useRouter();
  const executives = data.executives.filter((person) => person.role === 'Calling Executive' && person.active).map((person) => person.name);
  const assigneeOptions = executives.length ? executives : [session?.name ?? 'Calling executive'];
  const requirementOptions = existing && !CAB_REQUIREMENTS.includes(existing.requirement as typeof CAB_REQUIREMENTS[number])
    ? [existing.requirement, ...CAB_REQUIREMENTS]
    : [...CAB_REQUIREMENTS];
  const [name, setName] = useState(existing?.name ?? '');
  const [mobile, setMobile] = useState(existing?.mobile ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [requirement, setRequirement] = useState(existing?.requirement && requirementOptions.includes(existing.requirement) ? existing.requirement : requirementOptions[0]);
  const [pickup, setPickup] = useState(existing?.pickup ?? '');
  const [drop, setDrop] = useState(existing?.drop ?? '');
  const [travelDate, setTravelDate] = useState(existing?.travelDate ?? ymd(new Date()));
  const [travelTime, setTravelTime] = useState(existing?.travelTime ?? '10:00');
  const [source, setSource] = useState(existing?.source ?? 'Website');
  const [status, setStatus] = useState<LeadStatus>(existing?.status ?? 'New');
  const [priority, setPriority] = useState<Priority>(existing?.priority ?? 'Medium');
  const [assignedTo, setAssignedTo] = useState(existing?.assignedTo && assigneeOptions.includes(existing.assignedTo) ? existing.assignedTo : assigneeOptions[0]);
  const [estimatedValue, setEstimatedValue] = useState(String(existing?.estimatedValue ?? 1500));
  const [nextDate, setNextDate] = useState(existing?.nextFollowUpDate ?? '');
  const [nextTime, setNextTime] = useState(existing?.nextFollowUpTime ?? '');
  const [remarks, setRemarks] = useState(existing?.remarks ?? '');
  const [error, setError] = useState('');

  return (
    <Screen>
      <PageHeader title={existing ? 'Edit lead' : 'New lead'} subtitle="Trip, source, and assignment" back />
      <View style={{ padding: 20 }}>
        <Field label="Customer name *" value={name} onChangeText={setName} placeholder="Aditya Shah" />
        <Field label="Phone *" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="+91 98765 43210" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Pickup location *" value={pickup} onChangeText={setPickup} placeholder="Bengaluru Airport" />
        <Field label="Drop location *" value={drop} onChangeText={setDrop} placeholder="MG Road, Bengaluru" />
        <ChoiceRow label="Cab requirement *" options={requirementOptions} value={requirement} onChange={setRequirement} />
        <Field label="Travel date *" value={travelDate} onChangeText={setTravelDate} placeholder="YYYY-MM-DD" />
        <Field label="Travel time *" value={travelTime} onChangeText={setTravelTime} placeholder="HH:MM" />
        <Field label="Location" value={location} onChangeText={setLocation} placeholder="City or area" />
        <ChoiceRow label="Source *" options={mode === 'api' ? [...API_LEAD_SOURCES] : [...LEAD_SOURCES]} value={source} onChange={setSource} />
        <ChoiceRow label="Source *" options={LEAD_SOURCES} value={source} onChange={setSource} />
        <ChoiceRow label="Priority *" options={PRIORITIES} value={priority} onChange={setPriority} />
        <ChoiceRow label="Assigned executive *" options={assigneeOptions} value={assignedTo} onChange={setAssignedTo} />
        <ChoiceRow label="Status" options={LEAD_STATUSES} value={status} onChange={setStatus} />
        <Field label="Estimated value (₹) *" value={estimatedValue} onChangeText={setEstimatedValue} keyboardType="number-pad" />
        <Field label="Next follow-up date" value={nextDate} onChangeText={setNextDate} placeholder="YYYY-MM-DD" />
        <Field label="Next follow-up time" value={nextTime} onChangeText={setNextTime} placeholder="HH:MM" />
        <Field label="Remarks" value={remarks} onChangeText={setRemarks} placeholder="Lead context, requirements, urgency" multiline />
        {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 10 }}>{error}</Text> : null}
        <Button
          label={existing ? 'Save lead' : 'Create lead'}
          onPress={async () => {
            if (!name.trim() || !requirement.trim() || !pickup.trim() || !drop.trim()) {
              setError('Name, cab requirement, pickup, and drop are required.');
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
            if (email.trim() && !email.includes('@')) {
              setError('Enter a valid email or leave it blank.');
              return;
            }
            if ((nextDate && !/^\d{4}-\d{2}-\d{2}$/.test(nextDate)) || (nextTime && !/^\d{2}:\d{2}$/.test(nextTime))) {
              setError('Follow-up date and time must be YYYY-MM-DD and HH:MM.');
              return;
            }
            const value = Number(estimatedValue);
            if (!Number.isFinite(value) || value < 0) {
              setError('Estimated value is required.');
              return;
            }
            const now = new Date().toISOString();
            const row: Lead = {
              id: existing?.id ?? makeId('L'),
              name: name.trim(),
              mobile: mobile.trim(),
              email: email.trim() || undefined,
              requirement,
              pickup: pickup.trim(),
              drop: drop.trim(),
              travelDate,
              travelTime,
              source,
              assignedTo,
              status,
              priority,
              estimatedValue: value,
              nextFollowUpDate: nextDate || undefined,
              nextFollowUpTime: nextTime || undefined,
              remarks: remarks.trim() || undefined,
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
