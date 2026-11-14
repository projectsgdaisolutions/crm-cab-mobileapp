import { requireOptionalNativeModule } from 'expo';
import { Linking, Platform } from 'react-native';
import type { DeviceCall } from '../lib/syncCalls';

export interface DiscoveredRecording {
  fileName: string;
  uri: string;
  size: number;
  modifiedAt: number;
}

interface NativeCallSync {
  getCallLogPermissionAsync(): Promise<PermissionResult>;
  requestCallLogPermissionAsync(): Promise<PermissionResult>;
  readCallLog(limit: number): Promise<Array<DeviceCall & { name?: string | null }>>;
  findRecordings(limit: number): Promise<DiscoveredRecording[]>;
}

type PermissionResult = {
  status?: string;
  granted?: boolean;
  canAskAgain?: boolean;
};

export type CallLogPermissionState = 'granted' | 'denied' | 'permanently_denied' | 'unavailable';

export interface CallLogAccess {
  available: boolean;
  granted: boolean;
  canAskAgain: boolean;
  state: CallLogPermissionState;
  detail: string;
}

const DEV_BUILD_DETAIL =
  'Call log reading is included in the Android development build. Expo Go does not include the CallSync module. Install that build on the phone, then allow call logs.';

function nativeModule(): NativeCallSync | null {
  if (Platform.OS !== 'android') return null;
  return requireOptionalNativeModule<NativeCallSync>('CallSync');
}

function isGranted(result: PermissionResult | null | undefined): boolean {
  if (!result) return false;
  if (result.granted) return true;
  return result.status === 'granted';
}

function unavailable(detail: string): CallLogAccess {
  return { available: false, granted: false, canAskAgain: false, state: 'unavailable', detail };
}

function fromPermission(result: PermissionResult | null | undefined): CallLogAccess {
  if (isGranted(result)) {
    return {
      available: true,
      granted: true,
      canAskAgain: true,
      state: 'granted',
      detail: 'Call log permission granted.',
    };
  }
  const canAskAgain = result?.canAskAgain !== false;
  if (!canAskAgain) {
    return {
      available: true,
      granted: false,
      canAskAgain: false,
      state: 'permanently_denied',
      detail: 'Call log permission is blocked. Open Android settings for Vehico CRM and allow Phone and Call logs, then read the log again.',
    };
  }
  return {
    available: true,
    granted: false,
    canAskAgain: true,
    state: 'denied',
    detail: 'Call log permission was denied. Allow it to read recent calls from this phone.',
  };
}

export function openCallLogSettings(): void {
  void Linking.openSettings();
}

export async function inspectCallLogAccess(): Promise<CallLogAccess> {
  const native = nativeModule();
  if (!native) {
    return unavailable(
      Platform.OS === 'android'
        ? DEV_BUILD_DETAIL
        : 'Call history is read on an Android phone using the Vehico CRM development build.',
    );
  }
  try {
    return fromPermission(await native.getCallLogPermissionAsync());
  } catch (error) {
    return {
      available: true,
      granted: false,
      canAskAgain: true,
      state: 'denied',
      detail: error instanceof Error ? error.message : 'Call log permission could not be checked.',
    };
  }
}

export async function requestCallLogAccess(): Promise<CallLogAccess> {
  const native = nativeModule();
  if (!native) return inspectCallLogAccess();
  try {
    const access = fromPermission(await native.requestCallLogPermissionAsync());
    console.log('[CALL LOG]', { state: access.state, available: access.available, granted: access.granted });
    return access;
  } catch (error) {
    return {
      available: true,
      granted: false,
      canAskAgain: true,
      state: 'denied',
      detail: error instanceof Error ? error.message : 'Permission request failed.',
    };
  }
}

export async function readDeviceCallLog(limit = 40): Promise<{ calls: DeviceCall[]; source: 'device' | 'unavailable'; detail: string }> {
  const native = nativeModule();
  if (!native) {
    return {
      calls: [],
      source: 'unavailable',
      detail: Platform.OS === 'android' ? DEV_BUILD_DETAIL : 'Call history is read on an Android phone using the Vehico CRM development build.',
    };
  }
  try {
    const calls = await native.readCallLog(limit);
    const rows = calls.map((call) => ({
      number: call.number ?? '',
      name: call.name,
      direction: call.direction,
      status: call.status,
      startedAt: Number(call.startedAt),
      durationSec: Number(call.durationSec) || 0,
    }));
    console.log('[CALL LOG]', { state: 'read', count: rows.length });
    return {
      calls: rows,
      source: 'device',
      detail: rows.length === 0 ? 'No recent calls were found on this phone.' : `Read ${rows.length} recent calls from this phone.`,
    };
  } catch (error) {
    return {
      calls: [],
      source: 'unavailable',
      detail: error instanceof Error ? error.message : 'The Android call log could not be read.',
    };
  }
}

export async function discoverRecordingFiles(limit = 40): Promise<DiscoveredRecording[]> {
  const native = nativeModule();
  if (!native) return [];
  try {
    return await native.findRecordings(limit);
  } catch {
    return [];
  }
}
