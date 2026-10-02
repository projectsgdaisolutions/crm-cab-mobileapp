import { StyleSheet, Text, View } from 'react-native';
import { fonts } from '../theme';

const WASHES = ['#E7E4FB', '#E5F4EA', '#FDECDC', '#E7F0FB', '#F8E8F4'];
const INKS = ['#6D5BD0', '#1F8A5B', '#C47A2C', '#3D6CB5', '#A14D86'];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0] ?? '');
  return letters.join('').toUpperCase() || '?';
}

export function Avatar({ name, size = 44 }: { name: string; size?: number }) {
  const index = name.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % WASHES.length;
  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: WASHES[index] }]}>
      <Text style={[styles.text, { color: INKS[index], fontSize: size * 0.32 }]}>{initials(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: 'center', justifyContent: 'center' },
  text: { fontFamily: fonts.bold },
});
