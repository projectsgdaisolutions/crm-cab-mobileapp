import { useRouter } from 'expo-router';
import { ScrollView } from 'react-native';
import { PageHeader, RowLink } from '../../components/ui';
import { useStore } from '../../state/store';

export default function MoreScreen() {
  const router = useRouter();
  const { data, session } = useStore();
  const pending = data.followUps.filter((item) => item.status === 'Pending' || item.status === 'Rescheduled').length;
  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 28 }}>
      <PageHeader title="More" subtitle="Follow-ups, bookings, recordings" />
      <ViewSpacer />
      <RowLink icon="alarm-outline" title="Follow-ups" detail={`${pending} still open`} onPress={() => router.push('/follow-ups')} />
      <RowLink icon="car-outline" title="Bookings" detail={`${data.bookings.length} on this desk`} onPress={() => router.push('/bookings')} />
      <RowLink icon="document-text-outline" title="Notes" detail={`${data.notes.length} remarks`} onPress={() => router.push('/notes')} />
      <RowLink icon="mic-outline" title="Recordings" detail="Availability, playback, upload" onPress={() => router.push('/recordings')} />
      <RowLink icon="sync-outline" title="Call log sync" detail="Match the handset log to customers" onPress={() => router.push('/sync')} />
      {session?.role === 'admin' ? (
        <RowLink icon="people-outline" title="Team & Users" detail="Add executive, Activate or Deactivate" onPress={() => router.push('/team?create=1')} />
      ) : null}
      <RowLink icon="person-outline" title="Profile" detail="Account, API address, sign out" onPress={() => router.push('/profile')} />
    </ScrollView>
  );
}

function ViewSpacer() {
  return null;
}
