import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useStore } from '../state/store';
import { colors } from '../theme';

export default function Gate() {
  const { ready, session } = useStore();
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={colors.gold} />
      </View>
    );
  }
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(main)" />;
}
