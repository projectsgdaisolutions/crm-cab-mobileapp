import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field } from '../../components/ui';
import { DEMO_EMAIL } from '../../data/seed';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useStore();
  const [identifier, setIdentifier] = useState(DEMO_EMAIL);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 28, paddingBottom: insets.bottom + 20 }]}>
      <Text style={styles.brand}>VEHICOCRM</Text>
      <Text style={styles.word}>Welcome back</Text>
      <Text style={styles.tagline}>Smart CRM for Vehicle Businesses</Text>
      <Text style={styles.lede}>Sign in to your calling desk to manage customers, leads, and bookings.</Text>
      <View style={styles.card}>
        <Field
          label="Email or mobile"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="priya.sharma@gdaisolutions.com"
          keyboardType="email-address"
        />
        <Field label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Button
          label="Sign in"
          onPress={async () => {
            setError('');
            try {
              await login(identifier, password);
              router.replace('/');
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Sign in failed.');
            }
          }}
        />
        <Pressable onPress={() => router.push('/(auth)/forgot-password')} style={styles.linkBtn}>
          <Text style={styles.link}>Forgot password</Text>
        </Pressable>
      </View>
      <View style={styles.hint}>
        <Text style={styles.hintText}>
          Used only when the CRM API is not configured. Live sign-in uses the executive account from the API.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 22 },
  brand: { color: colors.saffron, fontFamily: fonts.semibold, letterSpacing: 2, fontSize: 11, textTransform: 'uppercase' },
  word: { color: colors.ink, fontFamily: fonts.display, fontSize: 38, marginTop: 6 },
  tagline: { color: colors.saffron, fontFamily: fonts.semibold, fontSize: 14, marginTop: 2, marginBottom: 6 },
  lede: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, marginTop: 4, marginBottom: 22 },
  card: { backgroundColor: colors.paper, borderRadius: 22, padding: 16 },
  error: { color: colors.clay, fontFamily: fonts.medium, marginBottom: 10 },
  linkBtn: { alignItems: 'center', paddingTop: 14 },
  link: { color: colors.saffron, fontFamily: fonts.semibold },
  hint: { marginTop: 20, paddingHorizontal: 4 },
  hintText: { color: colors.faint, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, textAlign: 'center' },
});
