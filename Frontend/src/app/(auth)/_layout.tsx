import { Redirect, Stack } from 'expo-router';
import { useStore } from '../../state/store';
import { colors } from '../../theme';

export default function AuthLayout() {
  const { ready, session } = useStore();
  if (ready && session) return <Redirect href="/(main)" />;
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />;
}
