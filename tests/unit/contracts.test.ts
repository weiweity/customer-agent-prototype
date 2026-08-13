import { describe, expect, it } from 'vitest';
import { IPC_CHANNEL_WHITELIST, IPC_CHANNELS } from '../../src/shared/contracts';

describe('IPC whitelist', () => {
  it('only allows the typed copy and platform channels', () => {
    expect(IPC_CHANNEL_WHITELIST).toEqual([
      IPC_CHANNELS.COPY_TEXT,
      IPC_CHANNELS.GET_PLATFORM,
    ]);
    expect(IPC_CHANNEL_WHITELIST).toHaveLength(2);
  });
});
