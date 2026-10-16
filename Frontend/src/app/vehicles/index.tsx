import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, ChoiceRow, EmptyState, Field, PageHeader, Pill, Screen } from '../../components/ui';
import { matchesQuery } from '../../lib/deskFilters';
import { makeId } from '../../lib/ids';
import { useStore } from '../../state/store';
import { fonts, useColors } from '../../theme';
import { VEHICLE_TYPES, type Vehicle, type VehicleType } from '../../types';

export default function VehiclesScreen() {
  const colors = useColors();
  const { data, saveVehicle, session } = useStore();
  const canEdit = session?.role === 'admin';
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [makeModel, setMakeModel] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [error, setError] = useState('');

  const rows = data.vehicles.filter((vehicle) => matchesQuery(`${vehicle.registrationNumber} ${vehicle.makeModel ?? ''} ${vehicle.vehicleType}`, query));

  return (
    <Screen>
      <PageHeader title="Vehicles" subtitle="Vehicles from the CRM API" back />
      <View style={{ padding: 20, gap: 12 }}>
        {canEdit ? <Button label={open ? 'Close form' : 'Add vehicle'} onPress={() => setOpen((value) => !value)} /> : (
          <Text style={{ fontFamily: fonts.medium, color: colors.muted }}>PHP allows only an Admin to create or edit vehicles.</Text>
        )}
        {open ? (
          <Card>
            <Field label="Registration number *" value={registrationNumber} onChangeText={setRegistrationNumber} placeholder="MH01 AB 2210" />
            <Field label="Make / model" value={makeModel} onChangeText={setMakeModel} placeholder="Swift Dzire" />
            <ChoiceRow label="Type" options={VEHICLE_TYPES} value={vehicleType} onChange={setVehicleType} />
            <ChoiceRow label="Status" options={['active', 'inactive']} value={status} onChange={setStatus} />
            {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}
            <Button
              label="Save vehicle"
              onPress={async () => {
                if (!registrationNumber.trim()) {
                  setError('Registration number is required.');
                  return;
                }
                const row: Vehicle = {
                  id: makeId('V'),
                  registrationNumber: registrationNumber.trim(),
                  vehicleType,
                  makeModel: makeModel.trim() || undefined,
                  status,
                };
                try {
                  await saveVehicle(row, true);
                  setRegistrationNumber('');
                  setMakeModel('');
                  setError('');
                  setOpen(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Save failed.');
                }
              }}
            />
          </Card>
        ) : null}
        <Field label="Search" value={query} onChangeText={setQuery} placeholder="Number or model" />
        {rows.length === 0 ? <EmptyState title="No vehicles" body="Vehicles created in PHP will show here." /> : null}
        {rows.map((vehicle) => (
          <Card key={vehicle.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>{vehicle.registrationNumber}</Text>
              <Pill label={vehicle.status} />
            </View>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>{vehicle.vehicleType}{vehicle.makeModel ? ` · ${vehicle.makeModel}` : ''}</Text>
            {canEdit ? (
              <Pressable
                onPress={() => void saveVehicle({ ...vehicle, status: vehicle.status === 'active' ? 'inactive' : 'active' }, false).catch((err) => setError(err instanceof Error ? err.message : 'Save failed.'))}
                style={{ marginTop: 10 }}
              >
                <Text style={{ color: colors.saffron, fontFamily: fonts.bold }}>{vehicle.status === 'active' ? 'Deactivate' : 'Activate'}</Text>
              </Pressable>
            ) : null}
          </Card>
        ))}
      </View>
    </Screen>
  );
}
