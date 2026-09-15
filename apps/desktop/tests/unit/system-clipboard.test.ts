import { spawnSync } from 'node:child_process';
import { describe, expect, it, vi } from 'vitest';

vi.mock('electron', () => ({
  clipboard: { writeText: vi.fn(), readText: vi.fn(() => '') },
}));

import { clipboard } from 'electron';
import { writeSystemClipboard } from '../../src/main/system-clipboard';

describe('system clipboard', () => {
  it('falls back to pbcopy when Electron write does not stick', () => {
    vi.mocked(clipboard.writeText).mockImplementation(() => undefined);
    vi.mocked(clipboard.readText).mockReturnValue('');
    writeSystemClipboard('合成联系卡');
    const pasted = spawnSync('pbpaste', { encoding: 'utf8' });
    expect(pasted.status).toBe(0);
    expect(pasted.stdout).toBe('合成联系卡');
  });
});
