import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { formatDay, formatDuration, formatWhen, inr, isOverdueFollowUp } from '../lib/dates';
import { formatPhone } from '../lib/phone';
import { useStore } from '../state/store';
import type { EntityType } from '../types';
import { colors, fonts } from '../theme';
import { CallButton } from './CallButton';
import { Card, Muted, Pill, SectionLabel } from './ui';

export function HistorySections({
  entityType,
  entityId,
  name,
  mobile,
}: {
  entityType: EntityType;
  entityId: string;
  name: string;
  mobile: string;
}) {
  const { data } = useStore();
  const router = useRouter();
  const notes = data.notes.filter((item) => item.entityType === entityType && item.entityId === entityId);
  const followUps = data.followUps.filter((item) => item.entityType === entityType && item.entityId === entityId);
  const bookings = data.bookings.filter((item) => item.entityType === entityType && item.entityId === entityId);
  const calls = data.calls.filter((item) => item.entityType === entityType && item.entityId === entityId);
  const activities = data.activities.filter((item) => item.entityType === entityType && item.entityId === entityId);
  const query = `entityType=${entityType}&entityId=${entityId}&name=${encodeURIComponent(name)}&mobile=${encodeURIComponent(mobile)}`;

  return (
    <View>
      <View style={styles.actions}>
        <View style={{ flex: 1 }}>
          <CallButton target={{ name, mobile, entityType, entityId }} />
        </View>
        <Pressable style={styles.action} onPress={() => router.push(`/note/new?${query}`)}>
          <Text style={styles.actionText}>Note</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => router.push(`/follow-up/new?${query}`)}>
          <Text style={styles.actionText}>Follow-up</Text>
        </Pressable>
        <Pressable style={styles.action} onPress={() => router.push(`/booking/new?${query}`)}>
          <Text style={styles.actionText}>Book</Text>
        </Pressable>
      </View>

      <SectionLabel>Notes</SectionLabel>
      {notes.length === 0 ? <Muted style={styles.empty}>No notes yet.</Muted> : notes.map((note) => (
        <Card key={note.id} style={styles.card}>
          <Text style={styles.body}>{note.body}</Text>
          <Muted style={{ marginTop: 8 }}>{note.createdBy} · {formatWhen(note.createdAt)}</Muted>
        </Card>
      ))}

      <SectionLabel>Follow-ups</SectionLabel>
      {followUps.length === 0 ? <Muted style={styles.empty}>Nothing scheduled.</Muted> : followUps.map((item) => (
        <Card key={item.id} style={styles.card}>
          <View style={styles.line}>
            <Text style={styles.strong}>{formatDay(item.date)} · {item.time}</Text>
            <Pill label={isOverdueFollowUp(item.date, item.time, item.status) ? 'overdue' : item.status} />
          </View>
          <Muted>{item.type} · {item.remarks}</Muted>
        </Card>
      ))}

      <SectionLabel>Bookings</SectionLabel>
      {bookings.length === 0 ? <Muted style={styles.empty}>No cab bookings linked.</Muted> : bookings.map((item) => (
        <Pressable key={item.id} onPress={() => router.push(`/booking/${item.id}`)}>
          <Card style={styles.card}>
            <View style={styles.line}>
              <Text style={styles.strong}>{item.pickup} → {item.drop}</Text>
              <Pill label={item.status} />
            </View>
            <Muted>{formatDay(item.travelDate)} {item.travelTime} · {item.vehicleType} · {inr(item.fare)}</Muted>
          </Card>
        </Pressable>
      ))}

      <SectionLabel>Call history</SectionLabel>
      {calls.length === 0 ? <Muted style={styles.empty}>No calls synced for this record.</Muted> : calls.map((call) => (
        <Card key={call.id} style={styles.card}>
          <View style={styles.line}>
            <Text style={styles.strong}>{call.direction === 'incoming' ? 'Incoming' : 'Outgoing'}</Text>
            <Pill label={call.status} />
          </View>
          <Muted>{formatWhen(call.startedAt)} · {formatDuration(call.durationSec)} · {formatPhone(call.mobile)}</Muted>
          {call.remarks ? <Text style={[styles.body, { marginTop: 6 }]}>{call.remarks}</Text> : null}
        </Card>
      ))}

      <SectionLabel>Activity</SectionLabel>
      {activities.length === 0 ? <Muted style={styles.empty}>Activity will collect here.</Muted> : activities.map((item) => (
        <View key={item.id} style={styles.activity}>
          <Text style={styles.strong}>{item.type}</Text>
          <Text style={styles.body}>{item.remarks}</Text>
          <Muted>{formatWhen(item.at)} · {item.actor}</Muted>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: 'row', gap: 8, marginHorizontal: 20, marginTop: 16, alignItems: 'center' },
  action: {
    height: 46,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: { color: colors.forest, fontFamily: fonts.bold, fontSize: 13 },
  card: { marginHorizontal: 20, marginBottom: 10 },
  empty: { marginHorizontal: 20, marginBottom: 8 },
  line: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, alignItems: 'center', marginBottom: 4 },
  strong: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 15, flex: 1 },
  body: { color: colors.ink, fontFamily: fonts.regular, fontSize: 14, lineHeight: 20 },
  activity: { marginHorizontal: 20, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.line },
});
