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
      <PageHeader title="More" subtitle="Follow-ups, bookings, fleet, recordings" />
      <ViewSpacer />
      <RowLink icon="notifications-outline" title="Notifications" detail="Follow-ups, leads, bookings, missed calls" onPress={() => router.push('/notifications')} />
      <RowLink icon="alarm-outline" title="Follow-ups" detail={`${pending} still open`} onPress={() => router.push('/follow-ups')} />
      <RowLink icon="car-outline" title="Bookings" detail={`${data.bookings.length} on this desk`} onPress={() => router.push('/bookings')} />
      <RowLink icon="bus-outline" title="Fleet" detail={`${data.drivers.length} drivers · ${data.vehicles.length} vehicles`} onPress={() => router.push('/fleet')} />
      <RowLink icon="person-circle-outline" title="Drivers" detail={`${data.drivers.length} captains`} onPress={() => router.push('/drivers')} />
      <RowLink icon="car-sport-outline" title="Vehicles" detail={`${data.vehicles.length} cars`} onPress={() => router.push('/vehicles')} />
      <RowLink icon="document-text-outline" title="Notes" detail={`${data.notes.length} remarks`} onPress={() => router.push('/notes')} />
      <RowLink icon="mic-outline" title="Recordings" detail="Availability, playback, upload" onPress={() => router.push('/recordings')} />
      <RowLink icon="sync-outline" title="Call log sync" detail="Match the handset log to customers" onPress={() => router.push('/sync')} />
      {session?.role === 'admin' ? (
        <>
          <RowLink icon="people-outline" title="Team & Users" detail="Add executive, Activate or Deactivate" onPress={() => router.push('/team?create=1')} />
          <RowLink icon="download-outline" title="Export report" detail="CSV from the CRM API" onPress={() => router.push('/reports/export')} />
        </>
      ) : null}
      {session?.role === 'admin' ? (
        <RowLink icon="key-outline" title="Access" detail="Permissions saved on this phone" onPress={() => router.push('/access')} />
      ) : null}
      <RowLink icon="person-outline" title="Profile" detail="Account, API address, sign out" onPress={() => router.push('/profile')} />
    </ScrollView>
  );
}

function ViewSpacer() {
  return null;
}
