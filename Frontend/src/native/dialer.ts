import * as Linking from 'expo-linking';
import { Platform } from 'react-native';
import { telUri } from '../lib/phone';

export interface DialerResult {
  opened: boolean;
  message: string;
}

export async function openNativeDialer(phone: string): Promise<DialerResult> {
  const url = telUri(phone);
  if (Platform.OS === 'web') {
    return {
      opened: false,
      message: `On an Android phone this opens the native dialer for ${url}. Log the outcome here after the call.`,
    };
  }
  try {
    const supported = await Linking.canOpenURL(url);
    if (!supported) {
      return { opened: false, message: 'This device did not open the phone dialer.' };
    }
    await Linking.openURL(url);
    return { opened: true, message: 'Native dialer opened. The call uses this phone’s SIM.' };
  } catch {
    return { opened: false, message: 'The dialer could not be opened.' };
  }
}
