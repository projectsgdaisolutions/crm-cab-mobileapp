import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { Button } from '../components/ui';
import { colors, fonts } from '../theme';

export default function NotFound() {
  const router = useRouter();
  return (
    <View style={{ flex: 1, backgroundColor: colors.cream, padding: 24, justifyContent: 'center' }}>
      <Text style={{ fontFamily: fonts.display, fontSize: 36, color: colors.ink }}>That screen is not on the desk</Text>
      <Text style={{ fontFamily: fonts.medium, color: colors.muted, marginVertical: 12 }}>Go back to the calling desk.</Text>
      <Button label="Open desk" onPress={() => router.replace('/')} />
    </View>
  );
}
