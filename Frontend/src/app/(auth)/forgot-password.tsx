import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field } from '../../components/ui';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

export default function ForgotPasswordScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { forgotPassword } = useStore();
  const [identifier, setIdentifier] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
      <Text style={styles.word}>Reset access</Text>
      <Text style={styles.lede}>Enter the email or mobile on the calling executive account. The CRM API sends the reset. This app does not store a new password itself.</Text>
      <View style={styles.card}>
        <Field label="Email or mobile" value={identifier} onChangeText={setIdentifier} keyboardType="email-address" />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Button
          label="Request reset"
          onPress={async () => {
            setError('');
            setMessage('');
            try {
              setMessage(await forgotPassword(identifier));
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Request failed.');
            }
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 22 },
  back: { color: colors.saffron, fontFamily: fonts.semibold, marginBottom: 18 },
  word: { color: colors.ink, fontFamily: fonts.display, fontSize: 40 },
  lede: { color: colors.muted, fontFamily: fonts.medium, lineHeight: 22, marginVertical: 12 },
  card: { backgroundColor: colors.paper, borderRadius: 22, padding: 16 },
  error: { color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 },
  message: { color: colors.forest, fontFamily: fonts.medium, lineHeight: 20, marginBottom: 12 },
});
