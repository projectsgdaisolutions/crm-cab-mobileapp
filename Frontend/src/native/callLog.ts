import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';
import type { DeviceCall } from '../lib/syncCalls';

export interface DiscoveredRecording {
  fileName: string;
  uri: string;
  size: number;
  modifiedAt: number;
}

interface NativeCallSync {
  getCallLogPermissionAsync(): Promise<{ status?: string; granted?: boolean }>;
  requestCallLogPermissionAsync(): Promise<{ status?: string; granted?: boolean }>;
  readCallLog(limit: number): Promise<Array<DeviceCall & { name?: string | null }>>;
  findRecordings(limit: number): Promise<DiscoveredRecording[]>;
}

export interface CallLogAccess {
  available: boolean;
  granted: boolean;
  detail: string;
}

function nativeModule(): NativeCallSync | null {
  if (Platform.OS !== 'android') return null;
  return requireOptionalNativeModule<NativeCallSync>('CallSync');
}

function granted(result: { status?: string; granted?: boolean } | null | undefined): boolean {
  if (!result) return false;
  if (result.granted) return true;
  return result.status === 'granted';
}

export async function inspectCallLogAccess(): Promise<CallLogAccess> {
  const native = nativeModule();
  if (!native) {
    return {
      available: false,
      granted: false,
      detail:
        Platform.OS === 'android'
          ? 'Call log reading ships in the Android development build. Expo Go does not include the CallSync module.'
          : 'The handset call log is read on Android. This preview can still match a sample log against the desk.',
    };
  }
  try {
    const status = await native.getCallLogPermissionAsync();
    return {
      available: true,
      granted: granted(status),
      detail: granted(status)
        ? 'Call log permission is on. Sync will read recent calls from this phone.'
        : 'Allow call log access so completed calls can be matched to customers and leads.',
    };
  } catch (error) {
    return {
      available: true,
      granted: false,
      detail: error instanceof Error ? error.message : 'Call log permission could not be checked.',
    };
  }
}

export async function requestCallLogAccess(): Promise<CallLogAccess> {
  const native = nativeModule();
  if (!native) return inspectCallLogAccess();
  try {
    const status = await native.requestCallLogPermissionAsync();
    return {
      available: true,
      granted: granted(status),
      detail: granted(status) ? 'Call log permission granted.' : 'Call log permission was not granted.',
    };
  } catch (error) {
    return {
      available: true,
      granted: false,
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
      detail: 'Device call log is not available in this runtime.',
    };
  }
  const calls = await native.readCallLog(limit);
  return {
    calls: calls.map((call) => ({
      number: call.number ?? '',
      name: call.name,
      direction: call.direction,
      status: call.status,
      startedAt: Number(call.startedAt),
      durationSec: Number(call.durationSec) || 0,
    })),
    source: 'device',
    detail: `Read ${calls.length} recent calls from this phone.`,
  };
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
