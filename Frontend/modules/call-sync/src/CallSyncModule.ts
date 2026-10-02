import { NativeModule, requireNativeModule } from 'expo';

export type DeviceCallRow = {
  number: string;
  name?: string | null;
  direction: 'incoming' | 'outgoing';
  status: 'Answered' | 'Missed' | 'Busy' | 'Failed';
  startedAt: number;
  durationSec: number;
};

type PermissionResult = {
  status?: string;
  granted?: boolean;
};

declare class CallSyncModule extends NativeModule {
  getCallLogPermissionAsync(): Promise<PermissionResult>;
  requestCallLogPermissionAsync(): Promise<PermissionResult>;
  readCallLog(limit: number): Promise<DeviceCallRow[]>;
  findRecordings(limit: number): Promise<Array<{ fileName: string; uri: string; size: number; modifiedAt: number }>>;
}

export default requireNativeModule<CallSyncModule>('CallSync');
