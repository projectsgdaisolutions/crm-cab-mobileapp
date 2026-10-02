import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Field, PageHeader, RowLink, Screen } from '../components/ui';
import { useStore } from '../state/store';
import { colors, fonts } from '../theme';

export default function ProfileScreen() {
  const { session, apiBase, setApiBase, logout, restoreSample, mode } = useStore();
  const router = useRouter();
  const [url, setUrl] = useState(apiBase);
  const [saved, setSaved] = useState('');

  return (
    <Screen>
      <PageHeader title="Profile" subtitle={session?.desk} back />
      <View style={{ padding: 20, gap: 14 }}>
        <Card>
          <Text style={{ fontFamily: fonts.display, fontSize: 28, color: colors.ink }}>{session?.name}</Text>
          <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginTop: 4 }}>{session?.role === 'admin' ? 'Admin' : 'Calling executive'}</Text>
          <Text style={{ fontFamily: fonts.medium, color: colors.ink, marginTop: 8 }}>{session?.email}</Text>
          <Text style={{ fontFamily: fonts.medium, color: colors.ink }}>{session?.mobile}</Text>
          <Text style={{ fontFamily: fonts.semibold, color: colors.forest, marginTop: 8 }}>{mode === 'api' ? 'Signed in with the CRM API' : 'Demo session on this phone'}</Text>
        </Card>
        <Field label="CRM API address" value={url} onChangeText={setUrl} placeholder="https://api.example.com" keyboardType="default" />
        {saved ? <Text style={{ fontFamily: fonts.medium, color: colors.forest }}>{saved}</Text> : null}
        <Button
          label="Save API address"
          tone="forest"
          onPress={async () => {
            await setApiBase(url);
            setSaved('Saved. Sign in again to use a live token.');
          }}
        />
        <RowLink icon="document-text-outline" title="Notes" detail="Remarks on this desk" onPress={() => router.push('/notes')} />
        <RowLink icon="mic-outline" title="Recordings" detail="Playback and upload" onPress={() => router.push('/recordings')} />
        <RowLink icon="sync-outline" title="Call log sync" detail="Match the handset log" onPress={() => router.push('/sync')} />
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
