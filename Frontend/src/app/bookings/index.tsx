import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Card, EmptyState, Field, FilterChips, PageHeader, Pill, Screen } from '../../components/ui';
import { formatDay, inr } from '../../lib/dates';
import { matchesOnDate, matchesQuery } from '../../lib/deskFilters';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { BOOKING_STATUSES } from '../../types';

export default function BookingsScreen() {
  const { data } = useStore();
  const router = useRouter();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const [onDate, setOnDate] = useState('');
  const rows = data.bookings.filter((item) => (filter === 'All' || item.status === filter) && matchesOnDate(item.travelDate, onDate) && matchesQuery(`${item.customerName} ${item.mobile} ${item.pickup} ${item.drop} ${item.id} ${item.driver ?? ''}`, query));
  return (
    <Screen>
      <PageHeader
        title="Bookings"
        subtitle="Cab reservations"
        back
        right={<Pressable onPress={() => router.push('/booking/new')}><Text style={{ color: colors.saffron, fontFamily: fonts.bold }}>Add</Text></Pressable>}
      />
      <View style={{ height: 12 }} />
      <FilterChips options={['All', ...BOOKING_STATUSES]} value={filter} onChange={setFilter} />
      <View style={{ paddingHorizontal: 20 }}>
        <Field label="Search" value={query} onChangeText={setQuery} placeholder="Customer, route, or booking id" />
        <Field label="Travel date" value={onDate} onChangeText={setOnDate} placeholder="YYYY-MM-DD, optional" />
      </View>
      <View style={{ padding: 20, gap: 10 }}>
        {rows.length === 0 ? <EmptyState title="No bookings in this status" body="Create a booking from a confirmed lead or an existing customer." actionLabel="New booking" onAction={() => router.push('/booking/new')} /> : null}
        {rows.map((item) => (
          <Pressable key={item.id} onPress={() => router.push(`/booking/${item.id}`)}>
            <Card>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                <Text style={{ flex: 1, fontFamily: fonts.semibold, fontSize: 16, color: colors.ink }}>{item.customerName}</Text>
                <Pill label={item.status} />
              </View>
              <Text style={{ fontFamily: fonts.medium, color: colors.ink, marginTop: 6 }}>{item.pickup} → {item.drop}</Text>
              <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>{formatDay(item.travelDate)} {item.travelTime} · {item.vehicleType} · {item.passengers} passengers · {inr(item.fare)} · {item.paymentStatus}</Text>
              <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 2 }}>{item.id} · {item.createdBy}{item.driver ? ` · ${item.driver}` : ''}</Text>
            </Card>
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}
