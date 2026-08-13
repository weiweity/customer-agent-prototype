export const IPC_CHANNELS = {
  COPY_TEXT: 'clipboard:copy-text',
  GET_PLATFORM: 'app:get-platform',
} as const;

export type IpcChannel = (typeof IPC_CHANNELS)[keyof typeof IPC_CHANNELS];

export const IPC_CHANNEL_WHITELIST: readonly IpcChannel[] = Object.freeze(
  Object.values(IPC_CHANNELS),
);

export type CopyTextResult =
  | { ok: true }
  | { ok: false; message: string };

export type PlatformName = 'darwin' | 'win32' | 'linux' | string;

export type PlatformInfo = {
  platform: PlatformName;
};

export type CustomerAgentApi = {
  copyText: (text: string) => Promise<CopyTextResult>;
  getPlatform: () => Promise<PlatformInfo>;
};

export const COPY_SUCCESS_MESSAGE = '已复制到剪贴板';
export const FORBIDDEN_COPY_PHRASES = ['已发送', '已采纳', '已解决'] as const;

export const MAX_QUERY_CHARS = 2000;
export const QUERY_TOO_LONG_MESSAGE = '客户问题最多 2000 字，请精简后再查找';
