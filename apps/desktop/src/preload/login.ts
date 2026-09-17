import { contextBridge, ipcRenderer } from 'electron';
import { IPC_CHANNELS } from '../shared/ipc-channels';
import { isLoginWindowCommandResult, type LoginWindowApi } from '../shared/login-window';

const api: LoginWindowApi = {
  async chooseFeishu() {
    try {
      const value: unknown = await ipcRenderer.invoke(IPC_CHANNELS.LOGIN_WINDOW_CHOOSE_FEISHU);
      return isLoginWindowCommandResult(value) ? value : { ok: false, code: 'UNAVAILABLE' };
    } catch {
      return { ok: false, code: 'UNAVAILABLE' };
    }
  },
  async submitAccount(username, password) {
    if (typeof username !== 'string' || typeof password !== 'string') return { ok: false, code: 'INVALID' };
    try {
      const value: unknown = await ipcRenderer.invoke(IPC_CHANNELS.LOGIN_WINDOW_SUBMIT_ACCOUNT, { username, password });
      return isLoginWindowCommandResult(value) ? value : { ok: false, code: 'UNAVAILABLE' };
    } catch {
      return { ok: false, code: 'UNAVAILABLE' };
    }
  },
  async cancel() {
    try { await ipcRenderer.invoke(IPC_CHANNELS.LOGIN_WINDOW_CANCEL); }
    catch { /* Window is already closing. */ }
  },
};

contextBridge.exposeInMainWorld('loginWindow', api);
