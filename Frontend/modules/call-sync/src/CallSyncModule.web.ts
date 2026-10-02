import { NativeModule, registerWebModule } from 'expo';

class CallSyncModule extends NativeModule {
  async getCallLogPermissionAsync() {
    return { status: 'undetermined', granted: false };
  }
  async requestCallLogPermissionAsync() {
    return { status: 'undetermined', granted: false };
  }
  async readCallLog() {
    return [];
  }
  async findRecordings() {
    return [];
  }
}

export default registerWebModule(CallSyncModule, 'CallSync');
