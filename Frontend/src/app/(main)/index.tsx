import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar } from '../../components/Avatar';
import { Notice } from '../../components/ui';
import { formatWhen, greeting, ymd } from '../../lib/dates';
import { formatPhone } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session, data, notice, clearNotice, refresh } = useStore();
  const today = ymd(new Date());
  const pending = data.followUps.filter((item) => item.status === 'Pending' || item.status === 'Rescheduled');
  const missed = data.calls.filter((call) => call.status === 'Missed');
  const todaysCalls = data.calls.filter((call) => call.startedAt.slice(0, 10) === today);
  const newLeads = data.leads.filter((lead) => lead.status === 'New');
  const converted = data.leads.filter((lead) => lead.status === 'Converted' || lead.status === 'Booking Confirmed').length;
  const conversion = data.leads.length ? Math.round((converted / data.leads.length) * 100) : 0;
  const upcomingBookings = data.bookings.filter((item) => item.status === 'Enquiry' || item.status === 'Confirmed' || item.status === 'Assigned').length;
  const teamActive = data.executives.filter((person) => person.active).length;
  const first = session?.name.split(' ')[0] ?? 'there';
  const dateLine = new Date().toLocaleDateString('en-IN', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const actions = [
    { icon: 'person-add-outline' as const, label: 'Add Customer', href: '/customer/new' },
    { icon: 'document-text-outline' as const, label: 'Add Lead', href: '/lead/new' },
    { icon: 'call-outline' as const, label: 'Call Customer', href: '/customers' },
    { icon: 'calendar-outline' as const, label: 'Schedule', href: '/follow-up/new' },
    { icon: 'car-outline' as const, label: 'Booking', href: '/booking/new' },
    { icon: 'checkbox-outline' as const, label: 'Tasks', href: '/tasks' },
    ...(session?.role === 'admin' ? [{ icon: 'people-circle-outline' as const, label: 'Add executive', href: '/team' }] : []),
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.cream }}
      refreshControl={<RefreshControl refreshing={false} onRefresh={() => void refresh()} tintColor={colors.saffron} />}
      contentContainerStyle={{ paddingBottom: 28 }}
    >
      <View style={{ paddingTop: insets.top + 12, paddingHorizontal: 20 }}>
        <View style={styles.topRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.hello}>{greeting()}, {first}</Text>
            <Text style={styles.date}>{dateLine}</Text>
          </View>
          <Pressable accessibilityLabel="Profile" onPress={() => router.push('/profile')} style={({ pressed }) => [styles.profile, pressed && styles.dim]}>
            <Ionicons name="person-outline" size={18} color={colors.ink} />
          </Pressable>
        </View>
        {notice ? <Notice message={notice} onClose={clearNotice} /> : null}
        <View style={styles.pair}>
          <Pressable onPress={() => router.push('/followups')} style={({ pressed }) => [styles.outline, pressed && styles.dim]}>
            <Text style={styles.outlineText}>Follow-ups</Text>
          </Pressable>
          <Pressable onPress={() => router.push('/bookings')} style={({ pressed }) => [styles.outline, pressed && styles.dim]}>
            <Text style={styles.outlineText}>Bookings</Text>
          </Pressable>
        </View>
        <Text style={styles.section}>Quick actions</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingRight: 8 }}>
          {actions.map((action) => (
            <Pressable key={action.label} onPress={() => router.push(action.href as never)} style={({ pressed }) => [styles.chip, pressed && styles.chipOn]}>
              <Ionicons name={action.icon} size={15} color={colors.saffron} />
              <Text style={styles.chipText}>{action.label}</Text>
            </Pressable>
          ))}
        </ScrollView>
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroKicker}>VehicoCRM · Your calling desk</Text>
              <Text style={styles.heroTitle}>Keep the momentum going.</Text>
            </View>
            <Pressable onPress={() => router.push('/calls')} style={({ pressed }) => [styles.heroCall, pressed && styles.dim]}>
              <Ionicons name="call" size={18} color={colors.white} />
            </Pressable>
          </View>
          <View style={styles.heroStats}>
            <HeroStat value={todaysCalls.length} label="Today's calls" />
            <HeroStat value={pending.length} label="Follow-ups" />
            <HeroStat value={missed.length} label="Missed calls" />
          </View>
        </View>
        <Text style={styles.section}>Overview</Text>
        <View style={styles.grid}>
          <Stat icon="people" tint="#1FA971" value={data.customers.length} label="Total customers" onPress={() => router.push('/customers')} />
          <Stat icon="clipboard" tint="#6D5BD0" value={data.leads.length} label="Total leads" onPress={() => router.push('/leads')} />
          <Stat icon="flash" tint="#E07A2F" value={newLeads.length} label="New leads" onPress={() => router.push('/leads')} />
          <Stat icon="call" tint="#1FA971" value={todaysCalls.length} label="Calls today" onPress={() => router.push('/calls')} />
          <Stat icon="calendar" tint="#6D5BD0" value={pending.length} label="Follow-ups due" onPress={() => router.push('/followups')} />
          <Stat icon="car" tint="#E07A2F" value={upcomingBookings} label="Upcoming bookings" onPress={() => router.push('/bookings')} />
          <Stat icon="pulse" tint="#6D5BD0" value={conversion} label="Conversion rate %" onPress={() => router.push('/leads')} />
          <Stat icon="people-circle" tint="#1FA971" value={teamActive} label="Team activity" onPress={() => router.push(session?.role === 'admin' ? '/team' : '/profile')} />
        </View>
        <View style={styles.sectionRow}>
          <Text style={styles.section}>Recent activities</Text>
          <Pressable onPress={() => router.push('/notes')}><Text style={styles.link}>View all</Text></Pressable>
        </View>
        {data.activities.slice(0, 3).map((item) => (
          <View key={item.id} style={styles.activity}>
            <View style={styles.check}><Ionicons name="checkmark" size={14} color="#6D5BD0" /></View>
            <Text style={styles.activityText}>{item.remarks}</Text>
          </View>
        ))}
        <View style={styles.sectionRow}>
          <Text style={styles.section}>Recent calls</Text>
          <Pressable onPress={() => router.push('/calls')}><Text style={styles.link}>View history</Text></Pressable>
        </View>
        {data.calls.slice(0, 3).map((call) => (
          <Pressable key={call.id} onPress={() => router.push('/calls')} style={({ pressed }) => [styles.callRow, pressed && styles.dim]}>
            <View style={styles.dirIcon}>
              <Ionicons name={call.direction === 'incoming' ? 'arrow-down' : 'arrow-up'} size={16} color={call.direction === 'incoming' ? colors.phone : colors.saffron} />
            </View>
            <Avatar name={call.name} size={40} />
            <View style={{ flex: 1 }}>
              <Text style={styles.callName}>{call.name}</Text>
              <Text style={styles.callMeta}>{call.direction === 'incoming' ? 'Incoming' : 'Outgoing'} · {formatPhone(call.mobile)}</Text>
            </View>
            <Text style={styles.callTime}>{formatWhen(call.startedAt).split(',')[0] === 'Today' ? new Date(call.startedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : formatWhen(call.startedAt)}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function HeroStat({ value, label }: { value: number; label: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.heroValue}>{value}</Text>
      <Text style={styles.heroLabel}>{label}</Text>
    </View>
  );
}

function Stat({ icon, tint, value, label, onPress }: { icon: keyof typeof Ionicons.glyphMap; tint: string; value: number; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.stat, pressed && styles.dim]}>
      <Ionicons name={icon} size={18} color={tint} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  topRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  hello: { color: colors.ink, fontFamily: fonts.display, fontSize: 28 },
  date: { color: colors.muted, fontFamily: fonts.medium, marginTop: 4, fontSize: 14 },
  profile: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  pair: { flexDirection: 'row', gap: 12, marginTop: 18 },
  outline: { flex: 1, height: 48, borderRadius: 16, borderWidth: 1, borderColor: '#E3E6F0', backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  outlineText: { color: colors.saffron, fontFamily: fonts.bold, fontSize: 15 },
  section: { color: colors.ink, fontFamily: fonts.bold, fontSize: 18, marginTop: 22, marginBottom: 10 },
  sectionRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  link: { color: colors.saffron, fontFamily: fonts.semibold, marginBottom: 10 },
  chip: { height: 40, paddingHorizontal: 12, borderRadius: 14, backgroundColor: colors.paper, borderWidth: 1, borderColor: '#E6E8F2', flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipOn: { backgroundColor: '#EEF0F6' },
  chipText: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 13 },
  hero: { marginTop: 16, backgroundColor: colors.hero, borderRadius: 24, padding: 18 },
  heroTop: { flexDirection: 'row', alignItems: 'flex-start' },
  heroKicker: { color: '#C9D0E4', fontFamily: fonts.medium, fontSize: 13 },
  heroTitle: { color: colors.white, fontFamily: fonts.display, fontSize: 22, marginTop: 4 },
  heroCall: { width: 42, height: 42, borderRadius: 21, backgroundColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
  heroStats: { flexDirection: 'row', marginTop: 18 },
  heroValue: { color: colors.white, fontFamily: fonts.display, fontSize: 28 },
  heroLabel: { color: '#C9D0E4', fontFamily: fonts.medium, fontSize: 12, marginTop: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  stat: { width: '47%', flexGrow: 1, backgroundColor: colors.paper, borderRadius: 22, padding: 16, minHeight: 118 },
  statValue: { color: colors.ink, fontFamily: fonts.display, fontSize: 30, marginTop: 10 },
  statLabel: { color: colors.muted, fontFamily: fonts.medium, marginTop: 2 },
  activity: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  check: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#EEEAFE', alignItems: 'center', justifyContent: 'center' },
  activityText: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  callRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  callName: { color: colors.ink, fontFamily: fonts.bold, fontSize: 15 },
  callMeta: { color: colors.muted, fontFamily: fonts.medium, marginTop: 2 },
  dirIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  callTime: { color: colors.muted, fontFamily: fonts.medium, fontSize: 12 },
  dim: { opacity: 0.72 },
});
