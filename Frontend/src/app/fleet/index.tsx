import { Redirect } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, Card, ChoiceRow, Field, PageHeader, Pill, Screen } from '../../components/ui';
import { makeId } from '../../lib/ids';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { VEHICLE_TYPES, type Driver, type Vehicle } from '../../types';

export default function FleetScreen() {
  const { data, saveDriver, saveVehicle, session, ready, mode } = useStore();
  const canEdit = session?.role === 'admin';
  const [tab, setTab] = useState<'Drivers' | 'Vehicles'>('Drivers');
  const [open, setOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [address, setAddress] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [vehicleType, setVehicleType] = useState(VEHICLE_TYPES[0]);
  const [makeModel, setMakeModel] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [driverId, setDriverId] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [error, setError] = useState('');

  if (ready && mode !== 'api') return <Redirect href="/(auth)/login" />;

  function startDriver(row?: Driver) {
    if (!canEdit) {
      setError('PHP allows only an Admin account to create or edit drivers.');
      return;
    }
    setEditingVehicle(null);
    setEditingDriver(row ?? null);
    setName(row?.name ?? '');
    setPhone(row?.phone ?? '');
    setLicenseNumber(row?.licenseNumber ?? '');
    setAddress(row?.address ?? '');
    setStatus(row?.status ?? 'active');
    setError('');
    setOpen(true);
  }

  function startVehicle(row?: Vehicle) {
    if (!canEdit) {
      setError('PHP allows only an Admin account to create or edit vehicles.');
      return;
    }
    setEditingDriver(null);
    setEditingVehicle(row ?? null);
    setRegistrationNumber(row?.registrationNumber ?? '');
    setVehicleType((row?.vehicleType as typeof VEHICLE_TYPES[number]) ?? VEHICLE_TYPES[0]);
    setMakeModel(row?.makeModel ?? '');
    setCapacity(String(row?.capacity ?? 4));
    setDriverId(row?.driverId ?? '');
    setStatus(row?.status ?? 'active');
    setError('');
    setOpen(true);
  }

  return (
    <Screen>
      <PageHeader title="Fleet" subtitle="Drivers and vehicles from the CRM API" back />
      <View style={{ padding: 20, gap: 12 }}>
        <ChoiceRow label="Records" options={['Drivers', 'Vehicles']} value={tab} onChange={setTab} />
        {!canEdit ? (
          <Text style={{ fontFamily: fonts.medium, color: colors.muted, lineHeight: 20 }}>
            You can view fleet records. Creating or editing drivers and vehicles requires an Admin PHP login. The current account is a Calling Executive.
          </Text>
        ) : (
          <Button label={tab === 'Drivers' ? 'Add driver' : 'Add vehicle'} onPress={() => (tab === 'Drivers' ? startDriver() : startVehicle())} />
        )}
        {open ? (
          <Card>
            {editingDriver || (!editingVehicle && tab === 'Drivers') ? (
              <>
                <Field label="Name *" value={name} onChangeText={setName} />
                <Field label="Phone *" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
                <Field label="License number *" value={licenseNumber} onChangeText={setLicenseNumber} />
                <Field label="Address" value={address} onChangeText={setAddress} />
              </>
            ) : (
              <>
                <Field label="Registration number *" value={registrationNumber} onChangeText={setRegistrationNumber} />
                <ChoiceRow label="Vehicle type" options={VEHICLE_TYPES} value={vehicleType} onChange={setVehicleType} />
                <Field label="Make / model" value={makeModel} onChangeText={setMakeModel} />
                <Field label="Capacity" value={capacity} onChangeText={setCapacity} keyboardType="number-pad" />
                <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginBottom: 6 }}>Assigned driver</Text>
                {data.drivers.map((driver) => (
                  <Pressable key={driver.id} onPress={() => setDriverId(driver.id)}>
                    <Text style={{ paddingVertical: 6, fontFamily: fonts.semibold, color: driver.id === driverId ? colors.saffronDeep : colors.ink }}>
                      {driver.name} · {driver.phone}
                    </Text>
                  </Pressable>
                ))}
              </>
            )}
            <ChoiceRow label="Status" options={['active', 'inactive']} value={status} onChange={setStatus} />
            {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}
            <Button
              label="Save"
              onPress={async () => {
                setError('');
                try {
                  if (editingVehicle || tab === 'Vehicles') {
                    if (!registrationNumber.trim()) {
                      setError('Registration number is required.');
                      return;
                    }
                    await saveVehicle({
                      id: editingVehicle?.id ?? makeId('V'),
                      registrationNumber: registrationNumber.trim(),
                      vehicleType,
                      makeModel: makeModel.trim() || undefined,
                      capacity: Number(capacity) || 4,
                      status,
                      driverId: driverId || undefined,
                    }, !editingVehicle);
                  } else {
                    if (!name.trim() || !phone.trim() || !licenseNumber.trim()) {
                      setError('Name, phone, and license number are required.');
                      return;
                    }
                    await saveDriver({
                      id: editingDriver?.id ?? makeId('D'),
                      name: name.trim(),
                      phone: phone.trim(),
                      licenseNumber: licenseNumber.trim(),
                      status,
                      address: address.trim() || undefined,
                    }, !editingDriver);
                  }
                  setOpen(false);
                } catch (err) {
                  setError(err instanceof Error ? err.message : 'Save failed.');
                }
              }}
            />
            <View style={{ height: 8 }} />
            <Button label="Cancel" tone="ghost" onPress={() => setOpen(false)} />
          </Card>
        ) : null}
        {error && !open ? <Text style={{ color: colors.clay, fontFamily: fonts.medium }}>{error}</Text> : null}
        {tab === 'Drivers'
          ? data.drivers.map((driver) => (
            <Pressable key={driver.id} onPress={() => startDriver(driver)}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>{driver.name}</Text>
                  <Pill label={driver.status} />
                </View>
                <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>{driver.phone} · {driver.licenseNumber}</Text>
              </Card>
            </Pressable>
          ))
          : data.vehicles.map((vehicle) => (
            <Pressable key={vehicle.id} onPress={() => startVehicle(vehicle)}>
              <Card>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>{vehicle.registrationNumber}</Text>
                  <Pill label={vehicle.status} />
                </View>
                <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>
                  {vehicle.vehicleType}{vehicle.makeModel ? ` · ${vehicle.makeModel}` : ''}{vehicle.capacity ? ` · ${vehicle.capacity} seats` : ''}
                </Text>
              </Card>
            </Pressable>
          ))}
      </View>
    </Screen>
  );
}
