import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { CallButton } from '../../components/CallButton';
import { EmptyState, FilterChips, Pill, SearchField } from '../../components/ui';
import { formatWhen, inr } from '../../lib/dates';
import { formatPhone } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import { CUSTOMER_STATUSES } from '../../types';

export default function CustomersScreen() {
  const { data } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.customers.filter((customer) => {
      if (status !== 'All' && customer.status !== status) return false;
      if (!needle) return true;
      return `${customer.name} ${customer.mobile} ${customer.email ?? ''} ${customer.city ?? ''} ${customer.assignedTo}`.toLowerCase().includes(needle);
    });
  }, [data.customers, query, status]);
  const spendFor = (id: string) => data.bookings.filter((item) => item.entityId === id).reduce((sum, item) => sum + item.fare, 0);
  const bookingsFor = (id: string) => data.bookings.filter((item) => item.entityId === id).length;
  const lastContact = (mobile: string) => data.calls.find((call) => call.mobile === mobile)?.startedAt;

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Customers</Text>
          <Text style={styles.sub}>{data.customers.length} total · {data.customers.filter((item) => item.status === 'Active').length} active · {data.customers.filter((item) => item.status === 'VIP').length} VIP</Text>
        </View>
        <Pressable onPress={() => router.push('/customer/new')} style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}>
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search name, phone, email" />
      <FilterChips options={['All', ...CUSTOMER_STATUSES]} value={status} onChange={setStatus} />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 12 }}
        ListEmptyComponent={<EmptyState title="No customers in this view" body="Assigned customers show up here. Add one when a caller is new to the service." actionLabel="Add customer" onAction={() => router.push('/customer/new')} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/customer/${item.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.82 }]}>
            <Avatar name={item.name} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{formatPhone(item.mobile)}{item.city ? ` · ${item.city}` : ''}</Text>
              <Text style={styles.route}>{item.assignedTo} · {bookingsFor(item.id)} bookings · {inr(spendFor(item.id))}</Text>
              <Text style={styles.meta}>{lastContact(item.mobile) ? `Last contact ${formatWhen(lastContact(item.mobile) as string)}` : 'No contact yet'}</Text>
              <View style={{ marginTop: 8 }}><Pill label={item.status} /></View>
            </View>
            <CallButton compact target={{ name: item.name, mobile: item.mobile, entityType: 'customer', entityId: item.id }} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 32 },
  sub: { color: colors.muted, fontFamily: fonts.medium, marginTop: 2 },
  add: { height: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  addText: { color: colors.saffron, fontFamily: fonts.bold },
  card: { backgroundColor: colors.paper, borderRadius: 22, padding: 14, flexDirection: 'row', gap: 12, alignItems: 'center' },
  name: { color: colors.ink, fontFamily: fonts.bold, fontSize: 16 },
  meta: { color: colors.muted, fontFamily: fonts.medium, marginTop: 2 },
  route: { color: colors.ink, fontFamily: fonts.regular, marginTop: 2 },
});
