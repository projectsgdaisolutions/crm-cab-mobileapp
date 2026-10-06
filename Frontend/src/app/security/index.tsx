import { useState } from 'react';
import { Text, View } from 'react-native';
import { Button, Card, Field, PageHeader, Screen } from '../../components/ui';
import { DEMO_PASSWORD } from '../../data/seed';
import { loadLocalPasswords, saveLocalPassword } from '../../lib/localAccount';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

export default function SecurityScreen() {
  const { session } = useStore();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');

  return (
    <Screen>
      <PageHeader title="Account security" subtitle="Change the password on this phone" back />
      <View style={{ padding: 20 }}>
        <Card>
          <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginBottom: 12, lineHeight: 20 }}>
            {session?.email}. The new password is saved on this phone. It is not sent to the CRM API.
          </Text>
          <Field label="Current password" value={current} onChangeText={setCurrent} secureTextEntry placeholder="Current password" />
          <Field label="New password" value={next} onChangeText={setNext} secureTextEntry placeholder="At least 12 characters" />
          <Field label="Confirm password" value={confirm} onChangeText={setConfirm} secureTextEntry placeholder="Repeat the new password" />
          {error ? <Text style={{ color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 }}>{error}</Text> : null}
          {saved ? <Text style={{ color: colors.moss, fontFamily: fonts.semibold, marginBottom: 8 }}>{saved}</Text> : null}
          <Button
            label="Update password"
            onPress={async () => {
              setSaved('');
              if (!session?.email) {
                setError('Sign in again before changing the password.');
                return;
              }
              const stored = await loadLocalPasswords();
              const expected = stored[session.email.toLowerCase()] ?? DEMO_PASSWORD;
              if (current !== expected) {
                setError('Current password does not match the one saved on this phone.');
                return;
              }
              if (next.length < 12) {
                setError('Use at least 12 characters.');
                return;
              }
              if (next !== confirm) {
                setError('New password and confirmation do not match.');
                return;
              }
              await saveLocalPassword(session.email, next);
              setCurrent('');
              setNext('');
              setConfirm('');
              setError('');
              setSaved('Password updated on this phone.');
            }}
          />
        </Card>
      </View>
    </Screen>
  );
}
