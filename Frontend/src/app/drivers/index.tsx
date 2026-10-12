import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, ChoiceRow, EmptyState, Field, PageHeader, Pill, Screen } from '../../components/ui';
import { matchesQuery } from '../../lib/deskFilters';
import { makeId } from '../../lib/ids';
import { isPlausibleMobile } from '../../lib/phone';
import { useStore } from '../../state/store';
import { fonts, useColors } from '../../theme';
import type { Driver } from '../../types';

export default function DriversScreen() {
  const colors = useColors();
  const { data, saveDriver, session } = useStore();
  const canEdit = session?.role === 'admin';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [error, setError] = useState('');

  const rows = data.drivers.filter((driver) => matchesQuery(`${driver.name} ${driver.phone} ${driver.licenseNumber}`, query));

  return (
    <Screen>
      <PageHeader title="Drivers" subtitle="Drivers from the CRM API" back />
      <View style={{ padding: 20, gap: 12 }}>
        {canEdit ? <Button label={open ? 'Close form' : 'Add driver'} onPress={() => setOpen((value) => !value)} /> : (
          <Text style={{ fontFamily: fonts.medium, color: colors.muted }}>PHP allows only an Admin to create or edit drivers.</Text>
        )}
        {open ? (
          <Card>
            <Field label="Name *" value={name} onChangeText={setName} />
            <Field label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
            <Field label="License *" value={licenseNumber} onChangeText={setLicenseNumber} />
            <Field label="Address" value={address} onChangeText={setAddress} />
            <ChoiceRow label="Status" options={['active', 'inactive']} value={status} onChange={setStatus} />
            {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}
            <Button
              label="Save driver"
              onPress={async () => {
                if (!name.trim() || !licenseNumber.trim() || !isPlausibleMobile(phone)) {
                  setError('Name, a valid phone, and license are required.');
                  return;
                }
                const row: Driver = {
                  id: makeId('D'),
                  name: name.trim(),
                  phone: phone.trim(),
                  licenseNumber: licenseNumber.trim(),
                  status,
                  address: address.trim() || undefined,
                };
                try {
                  await saveDriver(row, true);
                  setName('');
                  setPhone('');
                  setLicenseNumber('');
                  setAddress('');
                  setError('');
                  setOpen(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Save failed.');
                }
              }}
            />
          </Card>
        ) : null}
        <Field label="Search" value={query} onChangeText={setQuery} placeholder="Name, phone, license" />
        {rows.length === 0 ? <EmptyState title="No drivers" body="Drivers created in PHP will show here." /> : null}
        {rows.map((driver) => (
          <Card key={driver.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>{driver.name}</Text>
              <Pill label={driver.status} />
            </View>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>
              {driver.phone} · {driver.licenseNumber}
            </Text>
            {canEdit ? (
              <Pressable
                onPress={() => void saveDriver({ ...driver, status: driver.status === 'active' ? 'inactive' : 'active' }, false).catch((err) => setError(err instanceof Error ? err.message : 'Save failed.'))}
                style={{ marginTop: 10 }}
              >
                <Text style={{ color: colors.saffron, fontFamily: fonts.bold }}>{driver.status === 'active' ? 'Deactivate' : 'Activate'}</Text>
              </Pressable>
            ) : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
