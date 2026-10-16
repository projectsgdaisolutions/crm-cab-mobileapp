import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Appearance, StyleSheet, useColorScheme, type ColorSchemeName } from 'react-native';
import { loadThemePreference, saveThemePreference } from './storage/persist';

export type ThemePreference = 'light' | 'dark' | 'system';
export type ColorScheme = 'light' | 'dark';

export const THEME_CHOICES = ['Light Mode', 'Dark Mode', 'System Default'] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];

export const lightColors = {
  forest: '#1E2433',
  forestDeep: '#151A28',
  forestFill: '#1E2433',
  canopy: '#5B4FE8',
  cream: '#F4F6FB',
  paper: '#FFFFFF',
  ink: '#1B2030',
  muted: '#8B91A1',
  faint: '#A0A6B5',
  line: '#E7E9F2',
  saffron: '#5C52E8',
  saffronDeep: '#4338CA',
  clay: '#C24545',
  moss: '#1FA971',
  mossWash: '#E5F8EF',
  gold: '#C47A2C',
  goldWash: '#FFF1E0',
  blue: '#6D5BD0',
  blueWash: '#EEEAFE',
  clayWash: '#FDECEC',
  white: '#FFFFFF',
  mint: '#DDF6EA',
  hero: '#1B2340',
  phone: '#1FA971',
  webChrome: '#E6E9F2',
  webHtml: '#0E2420',
  tabInactive: '#8E93A3',
  filterOn: '#D6F5E8',
  rowIcon: '#E7EFEA',
  inputDisabled: '#F3F5FA',
  selectHover: '#F5F5F5',
  selectActive: '#E7EFEA',
  searchBorder: '#ECEEF5',
  chipOn: '#EEF0F6',
  outlineBorder: '#E3E6F0',
  heroMuted: '#C9D0E4',
  overlay: 'rgba(14,36,32,0.45)',
};

export type ColorTokens = typeof lightColors;

export const darkColors: ColorTokens = {
  forest: '#D2D8E6',
  forestDeep: '#0E121A',
  forestFill: '#2A3348',
  canopy: '#8B83F2',
  cream: '#10141C',
  paper: '#1B2130',
  ink: '#F3F5FA',
  muted: '#9AA3B5',
  faint: '#7E8698',
  line: '#2C3346',
  saffron: '#7B74F0',
  saffronDeep: '#9B95F5',
  clay: '#E06A6A',
  moss: '#3DD68C',
  mossWash: '#163528',
  gold: '#E0A04A',
  goldWash: '#3A2A14',
  blue: '#9B8EF0',
  blueWash: '#2A2550',
  clayWash: '#3A1C1C',
  white: '#FFFFFF',
  mint: '#1E3A30',
  hero: '#141A28',
  phone: '#3DD68C',
  webChrome: '#0B0F16',
  webHtml: '#0B0F16',
  tabInactive: '#8B93A6',
  filterOn: '#163528',
  rowIcon: '#243044',
  inputDisabled: '#161C28',
  selectHover: '#242B3C',
  selectActive: '#243044',
  searchBorder: '#2C3346',
  chipOn: '#242B3C',
  outlineBorder: '#2C3346',
  heroMuted: '#A8B0C4',
  overlay: 'rgba(8,10,16,0.62)',
};

/** Light palette kept for modules that read colors outside React. */
export const colors = lightColors;

export const fonts = {
  display: 'Manrope_700Bold',
  displaySoft: 'Manrope_700Bold',
  regular: 'Manrope_400Regular',
  medium: 'Manrope_500Medium',
  semibold: 'Manrope_600SemiBold',
  bold: 'Manrope_700Bold',
};

export function preferenceFromChoice(choice: ThemeChoice): ThemePreference {
  if (choice === 'Light Mode') return 'light';
  if (choice === 'Dark Mode') return 'dark';
  return 'system';
}

export function choiceFromPreference(preference: ThemePreference): ThemeChoice {
  if (preference === 'light') return 'Light Mode';
  if (preference === 'dark') return 'Dark Mode';
  return 'System Default';
}

export function resolveScheme(preference: ThemePreference, system: ColorSchemeName): ColorScheme {
  if (preference === 'light' || preference === 'dark') return preference;
  return system === 'dark' ? 'dark' : 'light';
}

export function paletteFor(scheme: ColorScheme): ColorTokens {
  return scheme === 'dark' ? darkColors : lightColors;
}

export function toneFor(status: string, palette: ColorTokens = lightColors): { bg: string; fg: string } {
  switch (status) {
    case 'Active':
    case 'Answered':
    case 'Completed':
    case 'Converted':
    case 'Paid':
    case 'Confirmed':
    case 'Assigned':
    case 'available':
    case 'uploaded':
    case 'synced':
    case 'Contacted':
      return { bg: palette.mossWash, fg: palette.moss };
    case 'VIP':
    case 'High':
    case 'Hot':
    case 'Urgent':
    case 'Interested':
    case 'Booking Confirmed':
    case 'Partial':
      return { bg: palette.blueWash, fg: palette.blue };
    case 'Follow-up':
      return { bg: palette.goldWash, fg: palette.gold };
    case 'Missed':
    case 'Lost':
    case 'Cancelled':
    case 'Failed':
    case 'failed':
    case 'Inactive':
    case 'Churned':
    case 'Rejected':
    case 'overdue':
    case 'unavailable':
    case 'permission_denied':
      return { bg: palette.clayWash, fg: palette.clay };
    case 'New':
    case 'Enquiry':
    case 'Pending':
    case 'Busy':
    case 'local':
    case 'Rescheduled':
    case 'Unpaid':
    case 'uploading':
      return { bg: palette.blueWash, fg: palette.blue };
    default:
      return { bg: palette.rowIcon, fg: palette.muted };
  }
}

interface ThemeContextValue {
  preference: ThemePreference;
  scheme: ColorScheme;
  colors: ColorTokens;
  setPreference: (next: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    void loadThemePreference().then((saved) => {
      if (saved) setPreferenceState(saved);
    });
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(() => undefined);
    return () => sub.remove();
  }, []);

  const setPreference = useCallback(async (next: ThemePreference) => {
    setPreferenceState(next);
    await saveThemePreference(next);
  }, []);

  const scheme = resolveScheme(preference, system);
  const palette = paletteFor(scheme);
  const value = useMemo(
    () => ({ preference, scheme, colors: palette, setPreference }),
    [palette, preference, scheme, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const value = useContext(ThemeContext);
  if (!value) {
    return {
      preference: 'system',
      scheme: 'light',
      colors: lightColors,
      setPreference: async () => undefined,
    };
  }
  return value;
}

export function useColors(): ColorTokens {
  return useTheme().colors;
}

export function useThemedStyles<T extends StyleSheet.NamedStyles<T> | StyleSheet.NamedStyles<any>>(
  factory: (palette: ColorTokens) => T,
): T {
  const palette = useColors();
  return useMemo(() => factory(palette), [factory, palette]);
}
