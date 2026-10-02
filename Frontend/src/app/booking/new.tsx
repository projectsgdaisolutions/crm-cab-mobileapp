import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, ChoiceRow, Field, PageHeader, Screen } from '../../components/ui';
import { ymd } from '../../lib/dates';
import { makeId } from '../../lib/ids';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { VEHICLE_TYPES, type Booking, type EntityType, type VehicleType } from '../../types';

export default function BookingFormScreen() {
  const params = useLocalSearchParams<{ entityType?: string; entityId?: string }>();
  const { data, saveBooking, session } = useStore();
  const router = useRouter();
  const parties = [
    ...data.customers.map((item) => ({ type: 'customer' as const, id: item.id, name: item.name, mobile: item.mobile, pickup: item.pickup, drop: item.drop })),
    ...data.leads.map((item) => ({ type: 'lead' as const, id: item.id, name: item.name, mobile: item.mobile, pickup: item.pickup, drop: item.drop })),
  ];
  const initial = parties.find((item) => item.id === params.entityId) ?? parties[0];
  const [partyId, setPartyId] = useState(initial?.id ?? '');
  const party = parties.find((item) => item.id === partyId);
  const [pickup, setPickup] = useState(initial?.pickup ?? '');
  const [drop, setDrop] = useState(initial?.drop ?? '');
  const [travelDate, setTravelDate] = useState(ymd(new Date()));
  const [travelTime, setTravelTime] = useState('10:00');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [passengers, setPassengers] = useState('2');
  const [fare, setFare] = useState('800');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  return (
    <Screen>
      <PageHeader title="New booking" subtitle={party?.name} back />
      <View style={{ padding: 20 }}>
        {!params.entityId ? parties.slice(0, 6).map((item) => (
          <Pressable key={item.id} onPress={() => { setPartyId(item.id); setPickup(item.pickup); setDrop(item.drop); }}>
            <Text style={{ paddingVertical: 6, fontFamily: fonts.semibold, color: item.id === partyId ? colors.saffronDeep : colors.ink }}>{item.name}</Text>
          </Pressable>
        )) : null}
        <Field label="Pickup" value={pickup} onChangeText={setPickup} />
        <Field label="Drop" value={drop} onChangeText={setDrop} />
        <Field label="Travel date" value={travelDate} onChangeText={setTravelDate} />
        <Field label="Travel time" value={travelTime} onChangeText={setTravelTime} />
        <ChoiceRow label="Vehicle" options={VEHICLE_TYPES} value={vehicleType} onChange={setVehicleType} />
        <Field label="Passengers" value={passengers} onChangeText={setPassengers} keyboardType="number-pad" />
        <Field label="Fare (INR)" value={fare} onChangeText={setFare} keyboardType="number-pad" />
        <Field label="Remarks" value={remarks} onChangeText={setRemarks} multiline />
        {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}
        <Button
          label="Create booking"
          onPress={async () => {
            if (!party || !pickup.trim() || !drop.trim()) {
              setError('Pickup, drop, and a customer or lead are required.');
              return;
            }
            const row: Booking = {
              id: makeId('B'),
              entityType: party.type as EntityType,
              entityId: party.id,
              customerName: party.name,
              mobile: party.mobile,
              pickup: pickup.trim(),
              drop: drop.trim(),
              travelDate,
              travelTime,
              vehicleType,
              passengers: Math.max(1, Number(passengers) || 1),
              fare: Math.max(0, Number(fare) || 0),
              paymentStatus: 'Unpaid',
              status: 'Enquiry',
              remarks: remarks.trim(),
              createdBy: session?.name ?? 'Calling executive',
              createdAt: new Date().toISOString(),
              syncState: 'local',
            };
            await saveBooking(row, true);
            router.replace(`/booking/${row.id}`);
          }}
        />
      </View>
    </Screen>
  );
}
