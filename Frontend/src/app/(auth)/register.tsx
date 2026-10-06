import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Field } from '../../components/ui';
import { isPlausibleMobile } from '../../lib/phone';
import { useStore } from '../../state/store';
import { colors, fonts } from '../../theme';

export default function RegisterScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { registerAccount } = useStore();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  return (
    <View style={[styles.screen, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 20 }]}>
      <Pressable onPress={() => router.back()}><Text style={styles.back}>Back</Text></Pressable>
      <Text style={styles.word}>Create account</Text>
      <Text style={styles.lede}>Public registration creates an active Calling Executive on the CRM API. Sign in after the account is created.</Text>
      <View style={styles.card}>
        <Field label="Full name *" value={name} onChangeText={setName} placeholder="Jordan Example" />
        <Field label="Email *" value={email} onChangeText={setEmail} placeholder="jordan@example.test" keyboardType="email-address" />
        <Field label="Phone *" value={phone} onChangeText={setPhone} placeholder="9123456789" keyboardType="phone-pad" />
        <Field label="Password *" value={password} onChangeText={setPassword} placeholder="At least 12 characters" secureTextEntry />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.message}>{message}</Text> : null}
        <Button
          label="Register"
          onPress={async () => {
            setError('');
            setMessage('');
            if (!name.trim() || !email.includes('@') || !isPlausibleMobile(phone) || password.length < 12) {
              setError('Name, a valid email, phone, and a 12-character password are required.');
              return;
            }
            try {
              setMessage(await registerAccount({ name: name.trim(), email: email.trim(), phone: phone.trim(), password }));
            } catch (err) {
              setError(err instanceof Error ? err.message : 'Registration failed.');
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
  word: { color: colors.ink, fontFamily: fonts.display, fontSize: 36 },
  lede: { color: colors.muted, fontFamily: fonts.medium, lineHeight: 22, marginVertical: 12 },
  card: { backgroundColor: colors.paper, borderRadius: 22, padding: 16 },
  error: { color: colors.clay, fontFamily: fonts.medium, marginBottom: 8 },
  message: { color: colors.forest, fontFamily: fonts.medium, lineHeight: 20, marginBottom: 12 },
});
