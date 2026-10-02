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
import type { CallDirection } from '../../types';

const STATUSES = ['All', 'Answered', 'Missed', 'Busy', 'Rejected', 'Failed'];
const DIRECTIONS: Array<{ key: 'all' | CallDirection; label: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'all', label: 'All', icon: 'swap-vertical' },
  { key: 'incoming', label: 'Incoming', icon: 'arrow-down' },
  { key: 'outgoing', label: 'Outgoing', icon: 'arrow-up' },
];

export default function CallsScreen() {
  const { data } = useStore();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [direction, setDirection] = useState<'all' | CallDirection>('all');
  const [status, setStatus] = useState('All');
  const [query, setQuery] = useState('');
  const rows = useMemo(() => data.calls.filter((call) => {
    if (direction !== 'all' && call.direction !== direction) return false;
    if (status !== 'All' && call.status !== status) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${call.id} ${call.name} ${call.mobile} ${call.status} ${call.createdBy}`.toLowerCase().includes(needle);
  }), [data.calls, direction, status, query]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Call history</Text>
          <Text style={styles.sub}>{rows.length} calls · incoming and outgoing</Text>
        </View>
        <Pressable onPress={() => router.push('/sync')} style={({ pressed }) => [styles.sync, pressed && { opacity: 0.7 }]}>
          <Text style={styles.syncText}>Sync</Text>
        </Pressable>
      </View>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search call ID, customer, phone" />
      <View style={styles.dirRow}>
        {DIRECTIONS.map((item) => {
          const selected = direction === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => setDirection(item.key)}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              style={({ pressed }) => [
                styles.dirBtn,
                selected && styles.dirBtnOn,
                pressed && { opacity: 0.65, transform: [{ scale: 0.97 }] },
              ]}
            >
              <Ionicons name={item.icon} size={16} color={selected ? colors.moss : colors.muted} />
              <Text style={[styles.dirLabel, { color: selected ? colors.moss : colors.muted }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FilterChips options={STATUSES} value={status} onChange={setStatus} />
      <FlatList
        data={rows}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 12 }}
        ListEmptyComponent={<EmptyState title="No calls in this filter" body="Incoming and outgoing calls from the dialer show up here after you log the outcome." />}
        renderItem={({ item }) => {
          const recorded = data.recordings.some((recording) => recording.callId === item.id && recording.availability !== 'unavailable');
          const incoming = item.direction === 'incoming';
          return (
            <Pressable
              onPress={() => {
                if (item.entityType === 'customer' && item.entityId) router.push(`/customer/${item.entityId}`);
                if (item.entityType === 'lead' && item.entityId) router.push(`/lead/${item.entityId}`);
              }}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.84 }]}
            >
              <View style={styles.row}>
                <View style={[styles.dirMark, { backgroundColor: incoming ? colors.mossWash : colors.blueWash }]}>
                  <Ionicons name={incoming ? 'arrow-down' : 'arrow-up'} size={16} color={incoming ? colors.phone : colors.saffron} />
                </View>
                <Avatar name={item.name} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{formatPhone(item.mobile)}</Text>
                </View>
                <Ionicons name={recorded ? 'play' : 'mic-off-outline'} size={18} color={recorded ? colors.phone : colors.faint} />
              </View>
              <Text style={styles.line}>
                {incoming ? 'Incoming' : 'Outgoing'} · {item.status} · {item.durationSec ? formatDuration(item.durationSec) : '–'} · {item.createdBy}
              </Text>
              <Text style={styles.meta}>{item.id} · {formatWhen(item.startedAt)}</Text>
              {item.remarks ? <Text style={styles.note}>{item.remarks}</Text> : null}
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
  dirRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 4, marginBottom: 10 },
  dirBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: colors.paper,
    borderWidth: 1.5,
    borderColor: colors.line,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  dirBtnOn: { backgroundColor: '#D6F5E8', borderColor: colors.moss },
  dirLabel: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13, includeFontPadding: false },
  card: { backgroundColor: colors.paper, borderRadius: 22, padding: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dirMark: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  name: { color: colors.ink, fontFamily: fonts.bold, fontSize: 16 },
  meta: { color: colors.muted, fontFamily: fonts.medium, marginTop: 2 },
  line: { color: colors.ink, fontFamily: fonts.medium, marginTop: 10 },
  note: { fontFamily: fonts.semibold, marginTop: 6, fontSize: 13, color: colors.ink },
});
