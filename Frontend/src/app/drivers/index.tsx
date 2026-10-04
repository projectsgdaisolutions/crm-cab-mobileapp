import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, ChoiceRow, EmptyState, Field, PageHeader, Pill, Screen } from '../../components/ui';
import { matchesQuery } from '../../lib/deskFilters';
import { makeId } from '../../lib/ids';
import { isPlausibleMobile } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import type { Driver } from '../../types';

export default function DriversScreen() {
  const { data, saveDriver } = useStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [license, setLicense] = useState('');
  const [city, setCity] = useState('');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [error, setError] = useState('');

  const rows = data.drivers.filter((driver) => matchesQuery(`${driver.name} ${driver.mobile} ${driver.city} ${driver.license}`, query));

  return (
    <Screen>
      <PageHeader title="Drivers" subtitle="Captains on this desk" back />
      <View style={{ padding: 20, gap: 12 }}>
        <Button label={open ? 'Close form' : 'Add driver'} onPress={() => setOpen((value) => !value)} />
        {open ? (
          <Card>
            <Field label="Name *" value={name} onChangeText={setName} placeholder="Rafiq Khan" />
            <Field label="Mobile *" value={mobile} onChangeText={setMobile} keyboardType="phone-pad" placeholder="+91 98220 11001" />
            <Field label="License *" value={license} onChangeText={setLicense} placeholder="MH01 2024 1188" />
            <Field label="City *" value={city} onChangeText={setCity} placeholder="Mumbai" />
            <ChoiceRow label="Status" options={['Active', 'Inactive']} value={status} onChange={setStatus} />
            {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}
            <Button
              label="Save driver"
              onPress={async () => {
                if (!name.trim() || !license.trim() || !city.trim() || !isPlausibleMobile(mobile)) {
                  setError('Name, a valid mobile, license, and city are required.');
                  return;
                }
                const row: Driver = {
                  id: makeId('D'),
                  name: name.trim(),
                  mobile: mobile.trim(),
                  license: license.trim(),
                  city: city.trim(),
                  status,
                  syncState: 'local',
                };
                await saveDriver(row, true);
                setName('');
                setMobile('');
                setLicense('');
                setCity('');
                setError('');
                setOpen(false);
              }}
            />
          </Card>
        ) : null}
        <Field label="Search" value={query} onChangeText={setQuery} placeholder="Name, mobile, city" />
        {rows.length === 0 ? <EmptyState title="No drivers" body="Add a captain here. Assignment on a booking stays on this phone." /> : null}
        {rows.map((driver) => (
          <Card key={driver.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>{driver.name}</Text>
              <Pill label={driver.status} />
            </View>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>
              {driver.mobile} · {driver.license} · {driver.city}
            </Text>
            <Pressable
              onPress={() => void saveDriver({ ...driver, status: driver.status === 'Active' ? 'Inactive' : 'Active' }, false)}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: colors.saffron, fontFamily: fonts.bold }}>{driver.status === 'Active' ? 'Deactivate' : 'Activate'}</Text>
            </Pressable>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
