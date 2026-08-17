import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { BrowserWindow } from 'electron';

const mocks = vi.hoisted(() => ({
  createDashboardBrowserWindow: vi.fn(),
  loadRenderer: vi.fn(),
  lockRendererWindow: vi.fn(),
}));

vi.mock('electron', () => ({
  app: {
    isReady: () => true,
  },
  BrowserWindow: {
    getAllWindows: () => [],
  },
  globalShortcut: {
    register: vi.fn(),
    unregister: vi.fn(),
  },
  screen: {
    getCursorScreenPoint: () => ({ x: 0, y: 0 }),
    getDisplayNearestPoint: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }),
    getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }),
    getPrimaryDisplay: () => ({ workArea: { x: 0, y: 0, width: 1440, height: 900 } }),
  },
  systemPreferences: {
    getUserDefault: () => false,
  },
}));

vi.mock('../../src/main/dashboard-window', () => ({
  createDashboardBrowserWindow: mocks.createDashboardBrowserWindow,
  readDashboardWindowSnapshot: vi.fn(),
}));

vi.mock('../../src/main/overlay-renderer-loader', () => ({
  loadRenderer: mocks.loadRenderer,
}));

vi.mock('../../src/main/window-security', () => ({
  lockRendererWindow: mocks.lockRendererWindow,
}));

vi.mock('../../src/main/overlay-test-harness', () => ({
  attachTestHarness: vi.fn(),
}));

import { OverlayController } from '../../src/main/overlay-controller';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

function createWindowFixture() {
  let destroyed = false;
  const listeners = new Map<string, () => void>();
  const win = {
    close: vi.fn(() => {
      destroyed = true;
      listeners.get('closed')?.();
    }),
    destroy: vi.fn(() => {
      destroyed = true;
      listeners.get('closed')?.();
    }),
    focus: vi.fn(),
    isDestroyed: vi.fn(() => destroyed),
    isMinimized: vi.fn(() => false),
    on: vi.fn((event: string, listener: () => void) => {
      listeners.set(event, listener);
      return win;
    }),
    restore: vi.fn(),
    show: vi.fn(),
    webContents: {
      id: 91,
      isDestroyed: () => destroyed,
    },
  };
  return win as unknown as BrowserWindow & {
    destroy: ReturnType<typeof vi.fn>;
    focus: ReturnType<typeof vi.fn>;
    show: ReturnType<typeof vi.fn>;
  };
}

describe('OverlayController dashboard opening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('awaits one renderer load before showing a singleton dashboard', async () => {
    const load = deferred<'loaded' | 'cancelled'>();
    const win = createWindowFixture();
    mocks.createDashboardBrowserWindow.mockReturnValue(win);
    mocks.loadRenderer.mockReturnValue(load.promise);
    const controller = new OverlayController();
    const dismissSpy = vi.spyOn(controller, 'dismiss');

    const first = controller.openDashboard();
    const second = controller.openDashboard();

    expect(mocks.createDashboardBrowserWindow).toHaveBeenCalledOnce();
    expect(mocks.loadRenderer).toHaveBeenCalledOnce();
    expect(win.show).not.toHaveBeenCalled();
    expect(win.focus).not.toHaveBeenCalled();
    expect(dismissSpy).not.toHaveBeenCalled();

    load.resolve('loaded');
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
    expect(dismissSpy).toHaveBeenCalledOnce();
    expect(win.show).toHaveBeenCalledOnce();
    expect(win.focus).toHaveBeenCalledOnce();
  });

  it('rejects every concurrent caller and destroys the hidden window when loading fails', async () => {
    const load = deferred<'loaded' | 'cancelled'>();
    const win = createWindowFixture();
    mocks.createDashboardBrowserWindow.mockReturnValue(win);
    mocks.loadRenderer.mockReturnValue(load.promise);
    const controller = new OverlayController();
    const dismissSpy = vi.spyOn(controller, 'dismiss');

    const first = controller.openDashboard();
    const second = controller.openDashboard();
    expect(dismissSpy).not.toHaveBeenCalled();
    load.reject(new Error('renderer failed'));

    await expect(first).rejects.toThrow('renderer failed');
    await expect(second).rejects.toThrow('renderer failed');
    expect(dismissSpy).not.toHaveBeenCalled();
    expect(win.destroy).toHaveBeenCalledOnce();
    expect(win.show).not.toHaveBeenCalled();

    const retryLoad = deferred<'loaded' | 'cancelled'>();
    const retryWin = createWindowFixture();
    mocks.createDashboardBrowserWindow.mockReturnValueOnce(retryWin);
    mocks.loadRenderer.mockReturnValueOnce(retryLoad.promise);
    const retry = controller.openDashboard();

    expect(mocks.createDashboardBrowserWindow).toHaveBeenCalledTimes(2);
    expect(mocks.loadRenderer).toHaveBeenCalledTimes(2);
    expect(retryWin.show).not.toHaveBeenCalled();
    expect(dismissSpy).not.toHaveBeenCalled();

    retryLoad.resolve('loaded');
    await expect(retry).resolves.toBeUndefined();
    expect(dismissSpy).toHaveBeenCalledOnce();
    expect(retryWin.show).toHaveBeenCalledOnce();
    expect(retryWin.focus).toHaveBeenCalledOnce();
  });
});
