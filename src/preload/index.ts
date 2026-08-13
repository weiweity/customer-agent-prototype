import { contextBridge, ipcRenderer } from 'electron';
import {
  IPC_CHANNELS,
  type CopyTextResult,
  type CustomerAgentApi,
  type PlatformInfo,
} from '../shared/contracts';

const api: CustomerAgentApi = {
  copyText(text: string): Promise<CopyTextResult> {
    if (typeof text !== 'string') {
      return Promise.resolve({ ok: false, message: '复制内容无效' });
    }
    return ipcRenderer.invoke(IPC_CHANNELS.COPY_TEXT, text);
  },
  getPlatform(): Promise<PlatformInfo> {
    return ipcRenderer.invoke(IPC_CHANNELS.GET_PLATFORM);
  },
};

contextBridge.exposeInMainWorld('customerAgent', api);
