import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { CallButton } from '../../components/CallButton';
import { EmptyState, FilterChips, Pill, SearchField } from '../../components/ui';
import { formatPhone } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

export default function LeadsScreen() {
  const { data } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [stage, setStage] = useState('All');
  const stages = ['All', 'New', 'Contacted', 'Follow-up', 'Interested', 'Booking Confirmed'];
  const rows = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.leads.filter((lead) => {
      if (stage !== 'All' && lead.status !== stage) return false;
      if (!needle) return true;
      return `${lead.name} ${lead.mobile} ${lead.pickup} ${lead.drop} ${lead.requirement} ${lead.status} ${lead.source}`.toLowerCase().includes(needle);
    });
  }, [data.leads, query, stage]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Leads</Text>
          <Text style={styles.sub}>{data.leads.length} assigned leads</Text>
        </View>
        <Pressable onPress={() => router.push('/lead/new')} style={({ pressed }) => [styles.add, pressed && { opacity: 0.7 }]}>
          <Text style={styles.addText}>Add</Text>
        </Pressable>
      </View>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search name, phone, ID" />
      <FilterChips options={stages} value={stage} onChange={setStage} />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 4, paddingBottom: 24, gap: 12 }}
        ListEmptyComponent={<EmptyState title="No leads match" body="New assignments from the CRM appear here." actionLabel="Add lead" onAction={() => router.push('/lead/new')} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => router.push(`/lead/${item.id}`)} style={({ pressed }) => [styles.card, pressed && { opacity: 0.82 }]}>
            <Avatar name={item.name} />
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{formatPhone(item.mobile)}</Text>
              <Text style={styles.route}>{item.requirement} · {item.source} · {item.assignedTo}</Text>
              {item.estimatedValue != null ? <Text style={styles.meta}>Est. ₹{item.estimatedValue}</Text> : null}
              <View style={styles.pillRow}>
                <Pill label={item.status} />
                <Text style={styles.follow}>Follow-up {item.travelDate.slice(5)}</Text>
              </View>
            </View>
            <CallButton compact target={{ name: item.name, mobile: item.mobile, entityType: 'lead', entityId: item.id }} />
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
  pillRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 },
  follow: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
});
