import { usePathname, useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CallButton } from '../../components/CallButton';
import { Card, EmptyState, FilterChips, PageHeader, Pill, Screen } from '../../components/ui';
import { formatDay, isOverdueFollowUp, ymd } from '../../lib/dates';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

const FILTERS = ['Today', 'Overdue', 'Upcoming', 'Completed'];

export default function FollowUpsScreen() {
  const { data, saveFollowUp } = useStore();
  const router = useRouter();
  const path = usePathname();
  const [filter, setFilter] = useState('Today');
  const today = ymd(new Date());
  const rows = data.followUps.filter((item) => {
    const open = item.status === 'Pending' || item.status === 'Rescheduled';
    if (filter === 'Completed') return item.status === 'Completed' || item.status === 'Cancelled';
    if (!open) return false;
    if (filter === 'Today') return item.date === today;
    if (filter === 'Overdue') return isOverdueFollowUp(item.date, item.time, item.status);
    return item.date > today;
  });

  return (
    <Screen>
      <PageHeader
        title="Follow-ups"
        subtitle={`${data.followUps.filter((item) => item.date === today && item.status !== 'Completed').length} today · ${data.followUps.filter((item) => isOverdueFollowUp(item.date, item.time, item.status)).length} overdue · ${data.followUps.filter((item) => item.date > today && (item.status === 'Pending' || item.status === 'Rescheduled')).length} upcoming`}
        back={path !== '/followups'}
      />
      <FilterChips options={FILTERS} value={filter} onChange={setFilter} />
      <View style={{ padding: 20, gap: 10 }}>
        {rows.length === 0 ? <EmptyState title={`No ${filter.toLowerCase()} follow-ups`} body="Schedule the next call from a customer or lead so it shows on the desk." /> : null}
        {rows.map((item) => (
          <Card key={item.id}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <Text style={{ flex: 1, fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>{item.entityName}</Text>
              <Pill label={isOverdueFollowUp(item.date, item.time, item.status) ? 'overdue' : item.status} />
            </View>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>
              {formatDay(item.date)} · {item.time} · {item.channel ?? item.type}{item.priority ? ` · ${item.priority}` : ''}{item.assignedTo ? ` · ${item.assignedTo}` : ''}
            </Text>
            <Text style={{ fontFamily: fonts.regular, color: colors.ink, marginTop: 6 }}>{item.remarks}</Text>
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, alignItems: 'center' }}>
              <CallButton compact target={{ name: item.entityName, mobile: item.mobile, entityType: item.entityType, entityId: item.entityId }} />
              {item.status !== 'Completed' ? (
                <Pressable onPress={() => void saveFollowUp({ ...item, status: 'Completed' }, false)} style={[chip, { backgroundColor: colors.saffron, borderColor: colors.saffron }]}>
                  <Text style={[chipText, { color: colors.white }]}>Complete</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => router.push(`/follow-up/new?entityType=${item.entityType}&entityId=${item.entityId}&name=${encodeURIComponent(item.entityName)}&mobile=${encodeURIComponent(item.mobile)}`)} style={chip}>
                <Text style={chipText}>Reschedule</Text>
              </Pressable>
              <Pressable onPress={() => router.push(item.entityType === 'customer' ? `/customer/${item.entityId}` : `/lead/${item.entityId}`)} style={chip}>
                <Text style={chipText}>Open</Text>
              </Pressable>
            </View>
          </Card>
        ))}
      </View>
    </Screen>
  );
}

const chip = { borderWidth: 1, borderColor: '#E3E6F0', borderRadius: 12, paddingHorizontal: 14, height: 40, justifyContent: 'center' as const, backgroundColor: colors.paper };
const chipText = { fontFamily: fonts.bold, color: colors.saffron };
