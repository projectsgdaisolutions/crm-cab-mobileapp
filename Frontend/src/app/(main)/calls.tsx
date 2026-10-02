import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { EmptyState, FilterChips, SearchField } from '../../components/ui';
import { formatDuration, formatWhen } from '../../lib/dates';
import { formatPhone } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

const FILTERS = ['All', 'Incoming', 'Outgoing', 'Answered', 'Missed'];

export default function CallsScreen() {
  const { data } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [filter, setFilter] = useState('All');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => data.calls.filter((call) => {
    if (filter === 'Incoming' && call.direction !== 'incoming') return false;
    if (filter === 'Outgoing' && call.direction !== 'outgoing') return false;
    if ((filter === 'Answered' || filter === 'Missed') && call.status !== filter) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${call.name} ${call.mobile} ${call.status}`.toLowerCase().includes(needle);
  }), [data.calls, filter, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Call history</Text>
          <Text style={styles.sub}>{data.calls.length} local CRM activities</Text>
        </View>
        <Pressable onPress={() => router.push('/sync')} style={({ pressed }) => [styles.sync, pressed && { opacity: 0.7 }]}>
          <Text style={styles.syncText}>Sync</Text>
        </Pressable>
      </View>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search calls" />
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 20, gap: 12 }}
        ListEmptyComponent={<EmptyState title="No calls in this filter" body="Place a call from a customer or lead, then log the outcome." />}
        renderItem={({ item }) => {
          const recorded = data.recordings.some((recording) => recording.callId === item.id && recording.availability !== 'unavailable');
          return (
            <Pressable
              onPress={() => {
                if (item.entityType === 'customer' && item.entityId) router.push(`/customer/${item.entityId}`);
                if (item.entityType === 'lead' && item.entityId) router.push(`/lead/${item.entityId}`);
              }}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.84 }]}
            >
              <View style={styles.row}>
                <Avatar name={item.name} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{formatPhone(item.mobile)}</Text>
                </View>
                <Ionicons name={recorded ? 'play' : 'mic-off-outline'} size={18} color={recorded ? colors.phone : colors.faint} />
              </View>
              <Text style={styles.line}>
                {item.direction === 'incoming' ? 'Incoming' : 'Outgoing'} · {item.status} · {item.durationSec ? formatDuration(item.durationSec) : '–'}
              </Text>
              <Text style={styles.meta}>{formatWhen(item.startedAt)}</Text>
              <Text style={[styles.note, { color: recorded ? colors.phone : colors.muted }]}>
                {recorded ? 'Recording available' : 'Recording not available from this device.'}
              </Text>
            </Pressable>
          );
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 32 },
  sub: { color: colors.muted, fontFamily: fonts.medium, marginTop: 2 },
  sync: { height: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.paper, justifyContent: 'center' },
  syncText: { color: colors.saffron, fontFamily: fonts.bold },
  card: { backgroundColor: colors.paper, borderRadius: 22, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { color: colors.ink, fontFamily: fonts.bold, fontSize: 16 },
  meta: { color: colors.muted, fontFamily: fonts.medium, marginTop: 2 },
  line: { color: colors.ink, fontFamily: fonts.medium, marginTop: 10 },
  note: { fontFamily: fonts.semibold, marginTop: 6, fontSize: 13 },
});
