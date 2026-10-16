import { Redirect, Stack } from 'expo-router';
import { useStore } from '../../state/store';
import { useColors } from '../../theme';

export default function AuthLayout() {
  const colors = useColors();
  const { ready, session, csrfToken } = useStore();
  if (ready && session && csrfToken && csrfToken !== 'demo') return <Redirect href="/(main)" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />;
}
