import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, FlatList, LayoutAnimation, Platform, Pressable, StyleSheet, Text, UIManager, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { CountUp, PressScale, PulseRing, RiseIn, SyncGlyph, Toast } from '../../components/Motion';
import { EmptyState, Field, FilterChips, SearchField } from '../../components/ui';
import { formatDuration, formatWhen } from '../../lib/dates';
import { matchesOnDate, pageRows } from '../../lib/deskFilters';
import { formatPhone } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';
import type { CallDirection } from '../../types';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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
  const [onDate, setOnDate] = useState('');
  const [shown, setShown] = useState(6);
  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(false);
  const [toast, setToast] = useState('');
  const [trackWidth, setTrackWidth] = useState(0);
  const slide = useRef(new Animated.Value(0)).current;
  const segment = trackWidth > 0 ? (trackWidth - 16) / DIRECTIONS.length : 0;
  const directionIndex = Math.max(0, DIRECTIONS.findIndex((item) => item.key === direction));
  const rows = useMemo(() => data.calls.filter((call) => {
    if (direction !== 'all' && call.direction !== direction) return false;
    if (status !== 'All' && call.status !== status) return false;
    if (!matchesOnDate(call.startedAt, onDate)) return false;
    const needle = query.trim().toLowerCase();
    if (!needle) return true;
    return `${call.id} ${call.name} ${call.mobile} ${call.status} ${call.createdBy}`.toLowerCase().includes(needle);
  }), [data.calls, direction, status, query, onDate]);
  const page = pageRows(rows, shown);

  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [direction, status, query, onDate, shown]);

  useEffect(() => {
    Animated.spring(slide, { toValue: directionIndex * (segment + 8), useNativeDriver: true, friction: 7, tension: 90 }).start();
  }, [directionIndex, segment, slide]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.cream }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'flex-end' }}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Call history</Text>
          <Text style={styles.sub}>
            <CountUp value={rows.length} style={styles.sub} /> calls · incoming and outgoing
          </Text>
        </View>
        <Pressable
          onPress={() => {
            if (syncing) return;
            setSynced(false);
            setSyncing(true);
            setTimeout(() => {
              setSyncing(false);
              setSynced(true);
              setToast('Opening call log sync');
              setTimeout(() => router.push('/sync'), 700);
            }, 700);
          }}
          style={({ pressed }) => [styles.sync, pressed && { opacity: 0.7 }]}
        >
          <SyncGlyph spinning={syncing} done={synced} />
          <Text style={styles.syncText}>Sync</Text>
        </Pressable>
      </View>
      <SearchField value={query} onChangeText={setQuery} placeholder="Search call ID, customer, phone" />
      <View style={{ paddingHorizontal: 20 }}>
        <Field label="Date" value={onDate} onChangeText={(value) => { setOnDate(value); setShown(6); }} placeholder="YYYY-MM-DD, optional" />
      </View>
      <View style={styles.dirRow} onLayout={(event) => setTrackWidth(event.nativeEvent.layout.width - 40)}>
        {segment > 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.dirHighlight, { width: segment, transform: [{ translateX: slide }] }]}
          />
        ) : null}
        {DIRECTIONS.map((item) => {
          const selected = direction === item.key;
          return (
            <Pressable
              key={item.key}
              onPress={() => { setDirection(item.key); setShown(6); }}
              hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
              style={({ pressed }) => [styles.dirBtn, selected && { backgroundColor: 'transparent', borderColor: 'transparent' }, pressed && { opacity: 0.65 }]}
            >
              <Ionicons name={item.icon} size={16} color={selected ? colors.moss : colors.muted} />
              <Text style={[styles.dirLabel, { color: selected ? colors.moss : colors.muted }]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <FilterChips options={STATUSES} value={status} onChange={setStatus} />
      <FlatList
        data={page.visible}
        keyExtractor={(item) => item.id}
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: 20, paddingTop: 4, gap: 12 }}
        ListEmptyComponent={<EmptyState title="No calls in this filter" body="Incoming and outgoing calls from the dialer show up here after you log the outcome." />}
        ListFooterComponent={page.hidden > 0 ? (
          <Pressable onPress={() => setShown((count) => count + 6)} style={{ alignItems: 'center', paddingVertical: 8 }}>
            <Text style={{ color: colors.saffron, fontFamily: fonts.bold }}>Show {page.hidden} more</Text>
          </Pressable>
        ) : null}
        renderItem={({ item, index }) => {
          const recorded = data.recordings.some((recording) => recording.callId === item.id && recording.availability !== 'unavailable');
          const incoming = item.direction === 'incoming';
          return (
            <RiseIn>
            <PressScale
              onPress={() => {
                if (item.entityType === 'customer' && item.entityId) router.push(`/customer/${item.entityId}`);
                if (item.entityType === 'lead' && item.entityId) router.push(`/lead/${item.entityId}`);
              }}
              style={styles.card}
            >
              <View style={styles.row}>
                <View style={[styles.dirMark, { backgroundColor: incoming ? colors.mossWash : colors.blueWash }]}>
                  <Ionicons name={incoming ? 'arrow-down' : 'arrow-up'} size={16} color={incoming ? colors.phone : colors.saffron} />
                </View>
                <PulseRing active={item.status === 'Missed'} size={44}>
                  <Avatar name={item.name} />
                </PulseRing>
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
            </PressScale>
            </RiseIn>
          );
        }}
      />
      {toast ? <Toast message={toast} onDone={() => setToast('')} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.ink, fontFamily: fonts.display, fontSize: 32 },
  sub: { color: colors.muted, fontFamily: fonts.medium, marginTop: 2 },
  sync: { height: 36, paddingHorizontal: 12, borderRadius: 12, backgroundColor: colors.paper, justifyContent: 'center', flexDirection: 'row', alignItems: 'center', gap: 6 },
  syncText: { color: colors.saffron, fontFamily: fonts.bold },
  dirRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, marginTop: 4, marginBottom: 10, position: 'relative' },
  dirHighlight: { position: 'absolute', left: 20, top: 0, height: 46, borderRadius: 14, backgroundColor: '#D6F5E8', borderWidth: 1.5, borderColor: colors.moss },
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
