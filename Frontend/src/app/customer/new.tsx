import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, ChoiceRow, Field, PageHeader, Screen } from '../../components/ui';
import { makeId } from '../../lib/ids';
import { isPlausibleMobile } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { CUSTOMER_STATUSES, LEAD_SOURCES, type Customer, type CustomerStatus } from '../../types';

export default function CustomerFormScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { data, saveCustomer, session } = useStore();
  const existing = data.customers.find((item) => item.id === id);
  const router = useRouter();
  const executives = data.executives.filter((person) => person.role === 'Calling Executive' && person.active).map((person) => person.name);
  const assigneeOptions = executives.length ? executives : [session?.name ?? 'Calling executive'];
  const [name, setName] = useState(existing?.name ?? '');
  const [mobile, setMobile] = useState(existing?.mobile ?? '');
  const [alternate, setAlternate] = useState(existing?.alternate ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [city, setCity] = useState(existing?.city ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [pickup, setPickup] = useState(existing?.pickup ?? '');
  const [drop, setDrop] = useState(existing?.drop ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [source, setSource] = useState(existing?.source ?? LEAD_SOURCES[0]);
  const [assignedTo, setAssignedTo] = useState(existing?.assignedTo && assigneeOptions.includes(existing.assignedTo) ? existing.assignedTo : assigneeOptions[0]);
  const [status, setStatus] = useState<CustomerStatus>(existing?.status ?? 'Active');
  const [error, setError] = useState('');

  return (
    <Screen>
      <PageHeader title={existing ? 'Edit customer' : 'New customer'} subtitle="Contact, location, and assignment" back />
      <View style={{ padding: 20 }}>
        <Field label="Full name *" value={name} onChangeText={setName} placeholder="Ramesh Iyer" />
        <Field label="Phone *" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="+91 98765 43210" />
        <Field label="Alternate number" value={alternate} onChangeText={setAlternate} keyboardType="phone-pad" />
        <Field label="Email *" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="ramesh@email.com" />
        <Field label="City *" value={city} onChangeText={setCity} placeholder="Bengaluru" />
        <Field label="Address *" value={address} onChangeText={setAddress} placeholder="123, MG Road, Indiranagar" />
        <Field label="Usual pickup" value={pickup} onChangeText={setPickup} />
        <Field label="Usual drop" value={drop} onChangeText={setDrop} />
        <ChoiceRow label="Source" options={LEAD_SOURCES} value={source} onChange={setSource} />
        <ChoiceRow label="Status *" options={CUSTOMER_STATUSES} value={status} onChange={setStatus} />
        <ChoiceRow label="Assigned executive *" options={assigneeOptions} value={assignedTo} onChange={setAssignedTo} />
        {executives.length === 0 ? <Text style={{ color: colors.muted, fontFamily: fonts.regular, marginBottom: 10 }}>No active calling executives available yet.</Text> : null}
        <Field label="Notes" value={notes} onChangeText={setNotes} placeholder="Customer preferences, special requirements" multiline />
        {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 10 }}>{error}</Text> : null}
        <Button
          label={existing ? 'Save changes' : 'Create customer'}
          onPress={async () => {
            if (!name.trim() || !city.trim() || !address.trim()) {
              setError('Name, city, and address are required.');
              return;
            }
            if (!email.includes('@')) {
              setError('Email is required.');
              return;
            }
            if (!isPlausibleMobile(mobile) || (alternate.trim() && !isPlausibleMobile(alternate))) {
              setError('Enter a valid mobile number.');
              return;
            }
            const now = new Date().toISOString();
            const row: Customer = {
              id: existing?.id ?? makeId('C'),
              name: name.trim(),
              mobile: mobile.trim(),
              alternate: alternate.trim() || undefined,
              email: email.trim(),
              city: city.trim(),
              address: address.trim(),
              notes: notes.trim() || undefined,
              pickup: pickup.trim() || city.trim(),
              drop: drop.trim() || address.trim(),
              source,
              assignedTo,
              status,
              createdAt: existing?.createdAt ?? now,
              updatedAt: now,
              syncState: 'local',
            };
            const saved = await saveCustomer(row, !existing);
            router.replace(`/customer/${saved.id}`);
          }}
        />
      </View>
    </Screen>
  );
}
