import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Button, ChoiceRow, Field, PageHeader, Screen } from '../../components/ui';
import { ymd } from '../../lib/dates';
import { makeId } from '../../lib/ids';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { BOOKING_STATUSES, PAYMENT_STATUSES, VEHICLE_TYPES, type Booking, type BookingStatus, type EntityType, type PaymentStatus, type VehicleType } from '../../types';

export default function BookingFormScreen() {
  const params = useLocalSearchParams<{ entityType?: string; entityId?: string }>();
  const { data, saveBooking, session } = useStore();
  const router = useRouter();
  const parties = [
    ...data.customers.map((item) => ({ type: 'customer' as const, id: item.id, name: item.name, mobile: item.mobile, pickup: item.pickup, drop: item.drop })),
    ...data.leads.map((item) => ({ type: 'lead' as const, id: item.id, name: item.name, mobile: item.mobile, pickup: item.pickup, drop: item.drop })),
  ];
  const initial = parties.find((item) => item.id === params.entityId) ?? parties[0];
  const [kind, setKind] = useState<'Customer' | 'Lead'>(initial?.type === 'lead' ? 'Lead' : 'Customer');
  const [partyId, setPartyId] = useState(initial?.id ?? '');
  const visible = parties.filter((item) => item.type === (kind === 'Lead' ? 'lead' : 'customer'));
  const party = parties.find((item) => item.id === partyId) ?? visible[0];
  const [pickup, setPickup] = useState(initial?.pickup ?? '');
  const [drop, setDrop] = useState(initial?.drop ?? '');
  const [travelDate, setTravelDate] = useState(ymd(new Date()));
  const [travelTime, setTravelTime] = useState('10:00');
  const [vehicleType, setVehicleType] = useState<VehicleType>('Sedan');
  const [passengers, setPassengers] = useState('2');
  const [fare, setFare] = useState('800');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Unpaid');
  const [status, setStatus] = useState<BookingStatus>('Enquiry');
  const [driver, setDriver] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [remarks, setRemarks] = useState('');
  const [error, setError] = useState('');

  return (
    <Screen>
      <PageHeader title="New booking" subtitle={party?.name ?? 'Customer or lead'} back />
      <View style={{ padding: 20 }}>
        <ChoiceRow
          label="Customer or lead type *"
          options={['Customer', 'Lead']}
          value={kind}
          onChange={(next) => {
            setKind(next);
            const match = parties.find((item) => item.type === (next === 'Lead' ? 'lead' : 'customer'));
            if (match) {
              setPartyId(match.id);
              setPickup(match.pickup);
              setDrop(match.drop);
            }
          }}
        />
        <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginBottom: 6 }}>Customer / lead *</Text>
        {(visible.length ? visible : parties).slice(0, 8).map((item) => (
          <Pressable key={item.id} onPress={() => { setPartyId(item.id); setKind(item.type === 'lead' ? 'Lead' : 'Customer'); setPickup(item.pickup); setDrop(item.drop); }}>
            <Text style={{ paddingVertical: 6, fontFamily: fonts.semibold, color: item.id === party?.id ? colors.saffronDeep : colors.ink }}>
              {item.name} · {item.mobile}
            </Text>
          </Pressable>
        ))}
        <Field label="Mobile number *" value={party?.mobile ?? ''} onChangeText={() => undefined} editable={false} />
        <Field label="Travel date *" value={travelDate} onChangeText={setTravelDate} placeholder="YYYY-MM-DD" />
        <Field label="Travel time *" value={travelTime} onChangeText={setTravelTime} placeholder="HH:MM" />
        <Field label="Pickup location *" value={pickup} onChangeText={setPickup} placeholder="Bengaluru Airport, Terminal 1" />
        <Field label="Drop location *" value={drop} onChangeText={setDrop} placeholder="MG Road, Bengaluru" />
        <ChoiceRow label="Cab / vehicle type *" options={VEHICLE_TYPES} value={vehicleType} onChange={setVehicleType} />
        <Field label="Passenger count *" value={passengers} onChangeText={setPassengers} keyboardType="number-pad" />
        <Field label="Fare *" value={fare} onChangeText={setFare} keyboardType="number-pad" />
        <ChoiceRow label="Booking status" options={BOOKING_STATUSES} value={status} onChange={setStatus} />
        <ChoiceRow label="Payment status" options={PAYMENT_STATUSES} value={paymentStatus} onChange={setPaymentStatus} />
        <Field label="Driver / vehicle details" value={driver} onChangeText={setDriver} placeholder="Driver name and vehicle notes" multiline />
        <Field label="Vehicle number" value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="MH 01 AB 1234" />
        <Field label="Remarks" value={remarks} onChangeText={setRemarks} multiline />
        <Field label="Booking ID" value="Generated on save" onChangeText={() => undefined} editable={false} />
        <Field label="Created by" value={session?.name ?? 'Signed-in user'} onChangeText={() => undefined} editable={false} />
        <Field label="Created date" value="Generated on save" onChangeText={() => undefined} editable={false} />
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
              paymentStatus,
              status,
              driver: driver.trim() || undefined,
              vehicleNumber: vehicleNumber.trim() || undefined,
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
