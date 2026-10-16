import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useStore } from '../state/store';
import { useColors } from '../theme';

export default function Gate() {
  const colors = useColors();
  const { ready, session, csrfToken } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.cream, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.saffron} />
      </View>
    );
  }
  if (!session || !csrfToken || csrfToken === 'demo') return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(main)" />;
}
