import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, ChoiceRow, Muted, PageHeader, Screen } from '../../components/ui';
import { formatDay, inr } from '../../lib/dates';
import { formatPhone } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { BOOKING_STATUSES, PAYMENT_STATUSES, type BookingStatus, type PaymentStatus } from '../../types';

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, saveBooking, assignBookingDriver } = useStore();
  const [driverId, setDriverId] = useState('');
  const [vehicleId, setVehicleId] = useState('');
  const booking = data.bookings.find((item) => item.id === id);
  if (!booking) {
    return (
      <Screen>
        <PageHeader title="Booking" back />
        <Muted style={{ margin: 20 }}>This booking is not on the desk.</Muted>
      </Screen>
    );
  }
  return (
    <Screen>
      <PageHeader title={booking.id} subtitle={booking.customerName} back />
      <Card style={{ margin: 20 }}>
        <Text style={{ fontFamily: fonts.displaySoft, fontSize: 24, color: colors.ink }}>{booking.pickup} → {booking.drop}</Text>
        <Muted style={{ marginTop: 6 }}>{formatPhone(booking.mobile)}</Muted>
        <Text style={{ marginTop: 10, fontFamily: fonts.medium, color: colors.ink }}>{formatDay(booking.travelDate)} at {booking.travelTime}</Text>
        <Text style={{ fontFamily: fonts.medium, color: colors.ink }}>{booking.vehicleType} · {booking.passengers} passengers · {inr(booking.fare)}</Text>
        {booking.driver ? <Muted>Driver {booking.driver}{booking.vehicleNumber ? ` · ${booking.vehicleNumber}` : ''}</Muted> : null}
        {booking.remarks ? <Text style={{ marginTop: 8, fontFamily: fonts.regular, color: colors.ink }}>{booking.remarks}</Text> : null}
      </Card>
      <View style={{ marginHorizontal: 20 }}>
        <ChoiceRow label="Booking status" options={BOOKING_STATUSES} value={booking.status} onChange={(status: BookingStatus) => void saveBooking({ ...booking, status }, false)} />
        <ChoiceRow label="Payment" options={PAYMENT_STATUSES} value={booking.paymentStatus} onChange={(paymentStatus: PaymentStatus) => void saveBooking({ ...booking, paymentStatus }, false)} />
        {data.drivers.length ? (
          <View style={{ marginTop: 12 }}>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginBottom: 6 }}>Assign driver</Text>
            {data.drivers.filter((item) => item.status === 'active').map((driver) => (
              <Pressable key={driver.id} onPress={() => setDriverId(driver.id)}>
                <Text style={{ paddingVertical: 6, fontFamily: fonts.semibold, color: (driverId || booking.driverId) === driver.id ? colors.saffronDeep : colors.ink }}>
                  {driver.name} · {driver.phone}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {data.vehicles.length ? (
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginBottom: 6 }}>Assign vehicle</Text>
            {data.vehicles.filter((item) => item.status === 'active').map((vehicle) => (
              <Pressable
                key={vehicle.id}
                onPress={() => {
                  const nextDriver = driverId || booking.driverId;
                  setVehicleId(vehicle.id);
                  if (nextDriver) void assignBookingDriver(booking, nextDriver, vehicle.id);
                }}
              >
                <Text style={{ paddingVertical: 6, fontFamily: fonts.semibold, color: (vehicleId || booking.vehicleId) === vehicle.id ? colors.saffronDeep : colors.ink }}>
                  {vehicle.registrationNumber} · {vehicle.vehicleType}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
