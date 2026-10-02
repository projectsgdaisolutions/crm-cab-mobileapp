import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field } from '../../components/ui';
import { DEMO_EMAIL, DEMO_PASSWORD } from '../../data/seed';
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
      <Text style={styles.brand}>GD AI SOLUTIONS</Text>
      <Text style={styles.word}>Cab CRM</Text>
      <Text style={styles.lede}>Calling desk for assigned customers, leads, and the handset dialer.</Text>
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
      <View style={styles.demo}>
        <Text style={styles.demoTitle}>Demo desk</Text>
        <Text style={styles.demoBody}>{DEMO_EMAIL}</Text>
        <Text style={styles.demoBody}>Password {DEMO_PASSWORD}</Text>
        <Text style={styles.demoNote}>Used only when the CRM API is not configured. Live sign-in uses the executive account from the API.</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 22 },
  brand: { color: colors.saffron, fontFamily: fonts.semibold, letterSpacing: 1.6, fontSize: 12 },
  word: { color: colors.ink, fontFamily: fonts.display, fontSize: 42, marginTop: 8 },
  lede: { color: colors.muted, fontFamily: fonts.medium, fontSize: 15, lineHeight: 22, marginTop: 8, marginBottom: 22 },
  card: { backgroundColor: colors.paper, borderRadius: 22, padding: 16 },
  error: { color: colors.clay, fontFamily: fonts.medium, marginBottom: 10 },
  linkBtn: { alignItems: 'center', paddingTop: 14 },
  link: { color: colors.saffron, fontFamily: fonts.semibold },
  demo: { marginTop: 18, padding: 14, borderRadius: 16, backgroundColor: colors.paper },
  demoTitle: { color: colors.ink, fontFamily: fonts.semibold, marginBottom: 4 },
  demoBody: { color: colors.ink, fontFamily: fonts.medium, fontSize: 14 },
  demoNote: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, lineHeight: 18, marginTop: 8 },
});
