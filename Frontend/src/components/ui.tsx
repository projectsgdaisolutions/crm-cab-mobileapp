import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts, toneFor } from '../theme';

export function Screen({
  children,
  scroll = true,
  footer,
  tint = colors.cream,
}: {
  children: ReactNode;
  scroll?: boolean;
  footer?: ReactNode;
  tint?: string;
}) {
  const insets = useSafeAreaInsets();
  const body = scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: footer ? 28 : insets.bottom + 28 }}
      keyboardShouldPersistTaps="handled"
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1 }}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: tint }}>
      {body}
      {footer ? <View style={{ paddingBottom: Math.max(insets.bottom, 10), backgroundColor: colors.paper }}>{footer}</View> : null}
    </View>
  );
}

export function PageHeader({
  title,
  subtitle,
  back,
  right,
}: {
  title: string;
  subtitle?: string;
  back?: boolean;
  right?: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <View style={styles.headerRow}>
        {back ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
            style={styles.iconBtn}
          >
            <Ionicons name="chevron-back" size={22} color={colors.ink} />
          </Pressable>
        ) : (
          <View style={{ width: 8 }} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.headerTitle}>{title}</Text>
          {subtitle ? <Text style={styles.headerSub}>{subtitle}</Text> : null}
        </View>
        {right}
      </View>
    </View>
  );
}

export function Title({ children, style }: { children: string; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.title, style]}>{children}</Text>;
}

export function Body({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, style]}>{children}</Text>;
}

export function Muted({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.muted, style]}>{children}</Text>;
}

export function Pill({ label }: { label: string }) {
  const tone = toneFor(label);
  return (
    <View style={[styles.pill, { backgroundColor: tone.bg }]}>
      <Text style={[styles.pillText, { color: tone.fg }]}>{label}</Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  secureTextEntry,
  multiline,
  error,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad' | 'number-pad';
  secureTextEntry?: boolean;
  multiline?: boolean;
  error?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoCapitalize={keyboardType === 'email-address' ? 'none' : 'sentences'}
        style={[styles.input, multiline && { minHeight: 96, textAlignVertical: 'top' }, error && { borderColor: colors.clay }]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

export function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly T[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.choiceWrap}>
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              style={[styles.choice, selected && styles.choiceOn]}
            >
              <Text style={[styles.choiceText, selected && styles.choiceTextOn]}>{option}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function Button({
  label,
  onPress,
  tone = 'saffron',
  disabled,
  icon,
}: {
  label: string;
  onPress: () => void;
  tone?: 'saffron' | 'forest' | 'ghost';
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || busy}
      onPress={async () => {
        setBusy(true);
        try {
          await onPress();
        } finally {
          setBusy(false);
        }
      }}
      style={({ pressed }) => [
        styles.button,
        tone === 'saffron' && { backgroundColor: colors.saffron },
        tone === 'forest' && { backgroundColor: colors.forest },
        tone === 'ghost' && { backgroundColor: colors.paper, borderWidth: 1, borderColor: colors.line },
        pressed && { opacity: 0.82 },
        (disabled || busy) && { opacity: 0.55 },
      ]}
    >
      {busy ? <ActivityIndicator color={tone === 'ghost' ? colors.forest : colors.white} /> : null}
      {!busy && icon ? <Ionicons name={icon} size={18} color={tone === 'ghost' ? colors.forest : colors.white} /> : null}
      <Text style={[styles.buttonText, tone === 'ghost' && { color: colors.forest }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyState({ title, body, actionLabel, onAction }: { title: string; body: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <Card style={{ margin: 20, alignItems: 'flex-start' }}>
      <Text style={styles.title}>{title}</Text>
      <Text style={[styles.body, { marginTop: 6 }]}>{body}</Text>
      {actionLabel && onAction ? (
        <View style={{ marginTop: 14, alignSelf: 'stretch' }}>
          <Button label={actionLabel} onPress={onAction} />
        </View>
      ) : null}
    </Card>
  );
}

export function SearchField({ value, onChangeText, placeholder }: { value: string; onChangeText: (value: string) => void; placeholder: string }) {
  return (
    <View style={styles.search}>
      <Ionicons name="search" size={18} color={colors.faint} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.faint}
        style={styles.searchInput}
      />
    </View>
  );
}

export function FilterChips({ options, value, onChange }: { options: string[]; value: string; onChange: (value: string) => void }) {
  return (
    <View style={styles.filterRow}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, gap: 8, alignItems: 'center' }}
      >
        {options.map((option) => {
          const selected = option === value;
          return (
            <Pressable
              key={option}
              onPress={() => onChange(option)}
              android_ripple={{ color: 'transparent' }}
              style={({ pressed }) => [
                styles.filter,
                selected && styles.filterOn,
                pressed && !selected && styles.filterPressed,
              ]}
            >
              <Text style={[styles.filterText, selected && styles.filterTextOn]}>{option}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function Notice({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <Pressable onPress={onClose} style={styles.notice}>
      <Ionicons name="information-circle" size={18} color={colors.forest} />
      <Text style={styles.noticeText}>{message}</Text>
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  return <Text style={styles.section}>{children}</Text>;
}

export function RowLink({
  icon,
  title,
  detail,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  detail: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.rowLink}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={18} color={colors.forest} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.muted}>{detail}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.cream,
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
  kicker: {
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: 11,
  },
  headerTitle: {
    color: colors.ink,
    fontFamily: fonts.display,
    fontSize: 32,
  },
  headerSub: { color: colors.muted, fontFamily: fonts.medium, fontSize: 14, marginTop: 2 },
  title: { color: colors.ink, fontFamily: fonts.displaySoft, fontSize: 22 },
  body: { color: colors.ink, fontFamily: fonts.regular, fontSize: 15, lineHeight: 22 },
  muted: { color: colors.muted, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  label: { color: colors.muted, fontFamily: fonts.semibold, fontSize: 12, marginBottom: 6, letterSpacing: 0.3 },
  input: {
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontFamily: fonts.medium,
    fontSize: 16,
  },
  error: { color: colors.clay, fontFamily: fonts.medium, fontSize: 12, marginTop: 4 },
  pill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  pillText: { fontFamily: fonts.semibold, fontSize: 12 },
  card: {
    backgroundColor: colors.paper,
    borderRadius: 22,
    padding: 16,
    borderWidth: 0,
    shadowColor: '#1B2340',
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 2,
  },
  button: {
    minHeight: 50,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
  },
  buttonText: { color: colors.white, fontFamily: fonts.bold, fontSize: 16 },
  search: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 12,
    backgroundColor: colors.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ECEEF5',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 8,
  },
  searchInput: { flex: 1, height: 46, color: colors.ink, fontFamily: fonts.medium, fontSize: 15 },
  filterRow: {
    height: 52,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  filter: {
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  filterOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  filterPressed: { opacity: 0.72 },
  filterText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.muted },
  filterTextOn: { color: colors.ink },
  choiceWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: colors.paper,
    borderWidth: 1,
    borderColor: colors.line,
  },
  choiceOn: { backgroundColor: colors.mint, borderColor: colors.mint },
  choiceText: { fontFamily: fonts.semibold, fontSize: 13, color: colors.ink },
  choiceTextOn: { color: colors.ink },
  notice: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: colors.goldWash,
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  noticeText: { flex: 1, color: colors.ink, fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  section: {
    marginTop: 22,
    marginBottom: 8,
    marginHorizontal: 20,
    color: colors.muted,
    fontFamily: fonts.semibold,
    fontSize: 12,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  rowLink: {
    marginHorizontal: 20,
    marginBottom: 10,
    backgroundColor: colors.paper,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#E7EFEA',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowTitle: { color: colors.ink, fontFamily: fonts.semibold, fontSize: 16 },
});
