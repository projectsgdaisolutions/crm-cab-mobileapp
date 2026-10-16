import { Fraunces_500Medium, Fraunces_600SemiBold } from '@expo-google-fonts/fraunces';
import { Manrope_400Regular, Manrope_500Medium, Manrope_600SemiBold, Manrope_700Bold } from '@expo-google-fonts/manrope';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { DispositionSheet } from '../components/DispositionSheet';
import { StoreProvider, useStore } from '../state/store';
import { ThemeProvider, useColors, useTheme, useThemedStyles, type ColorTokens } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => undefined);

function ApiSessionGuard() {
  const { ready, session, csrfToken } = useStore();
  const segments = useSegments();
  const router = useRouter();
  const inAuth = segments[0] === '(auth)';
  const live = Boolean(session && csrfToken && csrfToken !== 'demo');

  useEffect(() => {
    if (!ready) return;
    if (!live && !inAuth) {
      router.replace('/(auth)/login');
    }
  }, [inAuth, live, ready, router]);

  return null;
}

function ThemedShell() {
  const { scheme } = useTheme();
  const colors = useColors();
  const styles = useThemedStyles(makeShellStyles);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof document === 'undefined') return;
    const style = document.createElement('style');
    style.textContent = `html,body,#root{height:100%;margin:0;background:${colors.webHtml}}`;
    document.head.appendChild(style);
    document.documentElement.style.backgroundColor = colors.webHtml;
    document.body.style.backgroundColor = colors.webHtml;
    return () => {
      style.remove();
    };
  }, [colors.webHtml]);

  return (
    <View style={Platform.OS === 'web' ? styles.webBg : styles.fill}>
      <View style={Platform.OS === 'web' ? styles.phone : styles.fill}>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />
        <DispositionSheet />
      </View>
    </View>
  );
}

function makeShellStyles(colors: ColorTokens) {
  return StyleSheet.create({
    fill: { flex: 1, backgroundColor: colors.cream },
    webBg: { flex: 1, backgroundColor: colors.webChrome, alignItems: 'center' },
    phone: {
      flex: 1,
      width: '100%',
      maxWidth: 440,
      backgroundColor: colors.cream,
      overflow: 'hidden',
    },
  });
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Manrope_400Regular,
    Manrope_500Medium,
    Manrope_600SemiBold,
    Manrope_700Bold,
    Fraunces_500Medium,
    Fraunces_600SemiBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => undefined);
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StoreProvider>
          <ApiSessionGuard />
          <ThemedShell />
        </StoreProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
