import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field } from '../../components/ui';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { login } = useStore();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 18, paddingBottom: insets.bottom + 20 }]}>
      <View style={styles.brandCard}>
        <Image source={require('../../../assets/vehicocrm-logo.jpg')} style={styles.logo} resizeMode="contain" accessibilityLabel="VehicoCRM" />
        <Text style={styles.brand}>VehicoCRM</Text>
        <Text style={styles.tagline}>Smart CRM for Vehicle Businesses</Text>
      </View>
      <Text style={styles.word}>Welcome back</Text>
      <Text style={styles.lede}>Sign in to manage customers, leads, calls, and bookings.</Text>
      <View style={styles.card}>
        <Field
          label="Email or mobile"
          value={identifier}
          onChangeText={setIdentifier}
          placeholder="name@company.com"
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
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.cream, paddingHorizontal: 22 },
  brandCard: {
    backgroundColor: colors.paper,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    alignItems: 'center',
    marginBottom: 18,
  },
  logo: { width: '100%', height: 108 },
  brand: { color: '#0B2A6B', fontFamily: fonts.display, fontSize: 28, letterSpacing: 0.4, marginTop: 2 },
  tagline: { color: '#F15A24', fontFamily: fonts.semibold, fontSize: 14, marginTop: 2, textAlign: 'center' },
  word: { color: colors.ink, fontFamily: fonts.display, fontSize: 32, marginTop: 2 },
  lede: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14, lineHeight: 21, marginTop: 6, marginBottom: 16 },
  card: { backgroundColor: colors.paper, borderRadius: 22, padding: 16 },
  error: { color: colors.clay, fontFamily: fonts.medium, marginBottom: 10 },
  linkBtn: { alignItems: 'center', paddingTop: 14 },
  link: { color: colors.saffron, fontFamily: fonts.semibold },
});
