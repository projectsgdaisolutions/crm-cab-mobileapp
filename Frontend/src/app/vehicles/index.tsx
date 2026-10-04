import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, ChoiceRow, EmptyState, Field, PageHeader, Pill, Screen } from '../../components/ui';
import { matchesQuery } from '../../lib/deskFilters';
import { makeId } from '../../lib/ids';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { VEHICLE_TYPES, type FleetVehicle, type VehicleType } from '../../types';

export default function VehiclesScreen() {
  const { data, saveVehicle } = useStore();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState('');
  const [model, setModel] = useState('');
  const [type, setType] = useState<VehicleType>('Sedan');
  const [status, setStatus] = useState<'Active' | 'Inactive'>('Active');
  const [error, setError] = useState('');

  const rows = data.vehicles.filter((vehicle) => matchesQuery(`${vehicle.number} ${vehicle.model} ${vehicle.type}`, query));

  return (
    <Screen>
      <PageHeader title="Vehicles" subtitle="Cars available for assignment" back />
      <View style={{ padding: 20, gap: 12 }}>
        <Button label={open ? 'Close form' : 'Add vehicle'} onPress={() => setOpen((value) => !value)} />
        {open ? (
          <Card>
            <Field label="Number *" value={number} onChangeText={setNumber} placeholder="MH01 AB 2210" />
            <Field label="Model *" value={model} onChangeText={setModel} placeholder="Swift Dzire" />
            <ChoiceRow label="Type" options={VEHICLE_TYPES} value={type} onChange={setType} />
            <ChoiceRow label="Status" options={['Active', 'Inactive']} value={status} onChange={setStatus} />
            {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}
            <Button
              label="Save vehicle"
              onPress={async () => {
                if (!number.trim() || !model.trim()) {
                  setError('Number and model are required.');
                  return;
                }
                const row: FleetVehicle = {
                  id: makeId('V'),
                  number: number.trim(),
                  model: model.trim(),
                  type,
                  status,
                  syncState: 'local',
                };
                await saveVehicle(row, true);
                setNumber('');
                setModel('');
                setError('');
                setOpen(false);
              }}
            />
          </Card>
        ) : null}
        <Field label="Search" value={query} onChangeText={setQuery} placeholder="Number or model" />
        {rows.length === 0 ? <EmptyState title="No vehicles" body="Add a car here, then assign it from a booking." /> : null}
        {rows.map((vehicle) => (
          <Card key={vehicle.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>{vehicle.number}</Text>
              <Pill label={vehicle.status} />
            </View>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>{vehicle.model} · {vehicle.type}</Text>
            <Pressable
              onPress={() => void saveVehicle({ ...vehicle, status: vehicle.status === 'Active' ? 'Inactive' : 'Active' }, false)}
              style={{ marginTop: 10 }}
            >
              <Text style={{ color: colors.saffron, fontFamily: fonts.bold }}>{vehicle.status === 'Active' ? 'Deactivate' : 'Activate'}</Text>
            </Pressable>
          </Card>
        ))}
      </View>
    </Screen>
  );
}
