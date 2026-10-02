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
  const [name, setName] = useState(existing?.name ?? '');
  const [mobile, setMobile] = useState(existing?.mobile ?? '');
  const [alternate, setAlternate] = useState(existing?.alternate ?? '');
  const [email, setEmail] = useState(existing?.email ?? '');
  const [address, setAddress] = useState(existing?.address ?? '');
  const [pickup, setPickup] = useState(existing?.pickup ?? '');
  const [drop, setDrop] = useState(existing?.drop ?? '');
  const [source, setSource] = useState(existing?.source ?? LEAD_SOURCES[0]);
  const [status, setStatus] = useState<CustomerStatus>(existing?.status ?? 'Active');
  const [error, setError] = useState('');

  return (
    <Screen>
      <PageHeader title={existing ? 'Edit customer' : 'New customer'} back />
      <View style={{ padding: 20 }}>
        <Field label="Name" value={name} onChangeText={setName} />
        <Field label="Mobile" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" />
        <Field label="Alternate number" value={alternate} onChangeText={setAlternate} keyboardType="phone-pad" />
        <Field label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" />
        <Field label="Address" value={address} onChangeText={setAddress} />
        <Field label="Pickup" value={pickup} onChangeText={setPickup} />
        <Field label="Drop" value={drop} onChangeText={setDrop} />
        <ChoiceRow label="Source" options={LEAD_SOURCES} value={source} onChange={setSource} />
        <ChoiceRow label="Status" options={CUSTOMER_STATUSES} value={status} onChange={setStatus} />
        {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 10 }}>{error}</Text> : null}
        <Button
          label={existing ? 'Save customer' : 'Create customer'}
          onPress={async () => {
            if (!name.trim() || !pickup.trim() || !drop.trim()) {
              setError('Name, pickup, and drop are required.');
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
              email: email.trim() || undefined,
              address: address.trim() || undefined,
              pickup: pickup.trim(),
              drop: drop.trim(),
              source,
              assignedTo: existing?.assignedTo ?? session?.name ?? 'Calling executive',
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
