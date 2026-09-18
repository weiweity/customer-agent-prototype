import { contextBridge, ipcRenderer } from 'electron';
import { isDashboardWordingResult, type DashboardWordingApi } from '../shared/dashboard-wording';

// Keep this literal aligned with IPC_CHANNELS. Do not import ipc-channels.ts:
// a second preload entry would split a shared chunk that sandboxed overlay
// preloads cannot load, and Query stays parked (Windows smoke).
const LIST = 'dashboard:wording-list';

const api: DashboardWordingApi = {
  async list() {
    try {
      const value: unknown = await ipcRenderer.invoke(LIST);
      return isDashboardWordingResult(value) ? value : { ok: false, code: 'UNAVAILABLE' };
    } catch {
      return { ok: false, code: 'UNAVAILABLE' };
    }
  },
};

contextBridge.exposeInMainWorld('dashboardWording', api);
