import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text } from 'react-native';
import { Pulse } from './Motion';
import { openNativeDialer } from '../native/dialer';
import { useStore, type CallTarget } from '../state/store';
import { colors, fonts } from '../theme';

export function CallButton({ target, compact = false }: { target: CallTarget; compact?: boolean }) {
  const { beginCall } = useStore();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Call ${target.name}`}
      android_ripple={{ color: 'transparent' }}
      onPress={async () => {
        const result = await openNativeDialer(target.mobile);
        beginCall(target, result.opened);
      }}
      style={({ pressed }) => [styles.btn, compact && styles.compact, pressed && styles.pressed]}
    >
      <Pulse>
        <Ionicons name="call" size={compact ? 20 : 18} color={compact ? colors.phone : colors.white} />
      </Pulse>
      {compact ? null : <Text style={styles.label}>Call</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: colors.saffron,
    borderRadius: 14,
    height: 46,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  compact: {
    width: 40,
    height: 40,
    paddingHorizontal: 0,
    borderRadius: 20,
    backgroundColor: 'transparent',
  },
  pressed: { opacity: 0.55 },
  label: { color: colors.white, fontFamily: fonts.bold, fontSize: 15 },
});
