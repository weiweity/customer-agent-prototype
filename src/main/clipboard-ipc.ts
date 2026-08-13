import { clipboard, ipcMain } from 'electron';
import { resolveClipboardWrite } from '../shared/clipboard-write';
import {
  IPC_CHANNELS,
  type CopyTextResult,
  type PlatformInfo,
} from '../shared/contracts';

export function registerClipboardIpc(): void {
  ipcMain.handle(
    IPC_CHANNELS.COPY_TEXT,
    async (_event, text: unknown): Promise<CopyTextResult> => {
      const resolved = resolveClipboardWrite(text);
      if (!resolved.ok) {
        return resolved;
      }

      try {
        clipboard.writeText(resolved.payload);
        return { ok: true };
      } catch {
        return { ok: false, message: '复制失败，请重试' };
      }
    },
  );

  ipcMain.handle(IPC_CHANNELS.GET_PLATFORM, (): PlatformInfo => {
    return { platform: process.platform };
  });
}
