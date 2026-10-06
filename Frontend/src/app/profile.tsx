import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { RiseIn } from '../components/Motion';
import { Button, Card, ChoiceRow, Field, PageHeader, RowLink, Screen } from '../components/ui';
import { useStore } from '../state/store';
import { colors, fonts } from '../theme';

const PREFS_KEY = 'cabcrm.prefs.v1';
const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'America/New_York', 'Europe/London'];

export default function ProfileScreen() {
  const { session, apiBase, setApiBase, logout, mode, loadPreferences, savePreferences, updateAdminProfile } = useStore();
  const { session, logout, restoreSample, mode, data } = useStore();
  const router = useRouter();
  const [company, setCompany] = useState('VehicoCRM');
  const [timezone, setTimezone] = useState('Asia/Kolkata');
  const [bio, setBio] = useState('');
  const [reminders, setReminders] = useState(true);
  const [leadAlerts, setLeadAlerts] = useState(true);
  const [bookingAlerts, setBookingAlerts] = useState(true);

  useEffect(() => {
    if (session?.timezone) setTimezone(session.timezone);
    if (session?.bio) setBio(session.bio);
    void (async () => {
      const raw = await AsyncStorage.getItem(PREFS_KEY);
      if (raw) {
        try {
          const prefs = JSON.parse(raw) as { company?: string; timezone?: string; bio?: string; reminders?: boolean; leadAlerts?: boolean; bookingAlerts?: boolean };
          if (prefs.company) setCompany(prefs.company);
          if (prefs.timezone) setTimezone(prefs.timezone);
          if (prefs.bio) setBio(prefs.bio);
          if (typeof prefs.reminders === 'boolean') setReminders(prefs.reminders);
          if (typeof prefs.leadAlerts === 'boolean') setLeadAlerts(prefs.leadAlerts);
          if (typeof prefs.bookingAlerts === 'boolean') setBookingAlerts(prefs.bookingAlerts);
        } catch {
          // Ignore a damaged local preference file.
        }
      }
      if (mode !== 'api') return;
      try {
        const remote = await loadPreferences();
        if (typeof remote.company === 'string') setCompany(remote.company);
        if (typeof remote.timezone === 'string') setTimezone(remote.timezone);
        if (typeof remote.bio === 'string') setBio(remote.bio);
        if (typeof remote.reminders === 'boolean') setReminders(remote.reminders);
        if (typeof remote.leadAlerts === 'boolean') setLeadAlerts(remote.leadAlerts);
        if (typeof remote.bookingAlerts === 'boolean') setBookingAlerts(remote.bookingAlerts);
      } catch {
        // Keep the values already saved on this phone.
      }
    })();
  }, [loadPreferences, mode, session?.bio, session?.timezone]);

  return (
    <Screen>
      <PageHeader title="Profile" subtitle={session?.desk} back />
      <View style={{ padding: 20, gap: 14 }}>
        <RiseIn>
        <Card>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink }}>{session?.name}</Text>
          <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>{session?.role === 'admin' ? 'Admin' : 'Calling executive'}</Text>
          <Text style={{ fontFamily: fonts.medium, color: colors.ink, marginTop: 8 }}>{session?.email}</Text>
          <Text style={{ fontFamily: fonts.medium, color: colors.ink }}>{session?.mobile}</Text>
          <Text style={{ fontFamily: fonts.semibold, color: colors.forest, marginTop: 8 }}>{mode === 'api' ? 'Signed in with the CRM API' : 'Not signed in to the CRM API'}</Text>
        </Card>
        <Field label="CRM API address" value={url} onChangeText={setUrl} placeholder="https://api.example.com" keyboardType="default" />
        {saved ? <Text style={{ fontFamily: fonts.medium, color: colors.forest }}>{saved}</Text> : null}
        <Button
          label="Save API address"
          tone="forest"
          onPress={async () => {
            await setApiBase(url);
            setSaved('Saved. Sign in again to use the CRM API.');
          }}
        />
        </RiseIn>
        <RiseIn delay={80}>
        {session?.role === 'admin' ? (
          <Card>
            <Text style={{ fontFamily: fonts.display, fontSize: 22, color: colors.ink }}>Team & Users</Text>
            <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4, marginBottom: 12, lineHeight: 20 }}>
              Add a calling executive, or activate and deactivate accounts.
            </Text>
            <Button label="Add executive" onPress={() => router.push('/team?create=1')} />
            <View style={{ height: 8 }} />
            <Button label="Open Team & Users" tone="ghost" onPress={() => router.push('/team')} />
            <View style={{ height: 8 }} />
            <Button label="Export CSV report" tone="ghost" onPress={() => router.push('/reports/export')} />
          </Card>
        ) : null}
        <RowLink icon="bus-outline" title="Fleet" detail="Drivers and vehicles" onPress={() => router.push('/fleet')} />
        <RowLink icon="checkbox-outline" title="Tasks" detail="Due work for the desk" onPress={() => router.push('/tasks')} />
        <RowLink icon="document-text-outline" title="Notes" detail="Remarks on this desk" onPress={() => router.push('/notes')} />
        <RowLink icon="mic-outline" title="Recordings" detail="Playback and upload" onPress={() => router.push('/recordings')} />
        <RowLink icon="sync-outline" title="Call log sync" detail="Match the handset log" onPress={() => router.push('/sync')} />
        <RowLink icon="person-circle-outline" title="Drivers" detail={`${data.drivers.length} captains`} onPress={() => router.push('/drivers')} />
        <RowLink icon="car-sport-outline" title="Vehicles" detail={`${data.vehicles.length} cars`} onPress={() => router.push('/vehicles')} />
        <RowLink icon="lock-closed-outline" title="Account security" detail="Change the password on this phone" onPress={() => router.push('/security')} />
        <RowLink icon="phone-portrait-outline" title="This device" detail="Local reminder registration" onPress={() => router.push('/device')} />
        {session?.role === 'admin' ? (
          <RowLink icon="key-outline" title="Access" detail="Permissions saved on this phone" onPress={() => router.push('/access')} />
        ) : null}
        </RiseIn>
        <RiseIn delay={140}>
        <Card>
          <Text style={{ fontFamily: fonts.semibold, color: colors.ink, fontSize: 16 }}>CRM preferences</Text>
          <Text style={{ fontFamily: fonts.regular, color: colors.muted, marginTop: 4, marginBottom: 8 }}>
            {mode === 'api' ? 'Saved to this account on the CRM API.' : 'Saved on this phone. Nothing is sent until an API address is set.'}
          </Text>
          <Field label="Company" value={company} onChangeText={setCompany} />
          <ChoiceRow label="Timezone" options={TIMEZONES} value={timezone} onChange={setTimezone} />
          <Field label="Bio" value={bio} onChangeText={setBio} multiline placeholder="How this desk should be described" />
          <Toggle label="Follow-up reminders" on={reminders} onPress={() => setReminders((value) => !value)} />
          <Toggle label="New lead assignment" on={leadAlerts} onPress={() => setLeadAlerts((value) => !value)} />
          <Toggle label="Booking updates" on={bookingAlerts} onPress={() => setBookingAlerts((value) => !value)} />
          <Button
            label="Save preferences"
            tone="forest"
            onPress={async () => {
              const prefs = { company, timezone, bio, reminders, leadAlerts, bookingAlerts };
              await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
              if (mode === 'api' && session) {
                try {
                  await updateAdminProfile({
                    name: session.name,
                    email: session.email,
                    phone: session.mobile,
                    timezone,
                    bio,
                  });
                  await savePreferences(prefs);
                  setSaved('Preferences saved to the CRM API.');
                  return;
                } catch (error) {
                  setSaved(error instanceof Error ? error.message : 'Could not save to the CRM API.');
                  return;
                }
              }
              setSaved('Preferences saved on this phone.');
            }}
          />
        </Card>
              await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ company, timezone, bio, reminders, leadAlerts, bookingAlerts }));
            }}
          />
        </Card>
        </RiseIn>
        <Button label="Restore sample desk" tone="ghost" onPress={async () => restoreSample()} />
        <Button
          label="Sign out"
          onPress={async () => {
            await logout();
            router.replace('/');
          }}
        />
      </View>
    </Screen>
  );
}

function Toggle({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8 }}>
      <Text style={{ fontFamily: fonts.medium, color: colors.ink }}>{label}</Text>
      <Text style={{ fontFamily: fonts.bold, color: on ? colors.moss : colors.muted }}>{on ? 'On' : 'Off'}</Text>
    </Pressable>
  );
}
