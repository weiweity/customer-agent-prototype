import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { IpcMainInvokeEvent, WebContents } from 'electron';
import type { OverlayController } from '../../src/main/overlay-controller';
import { registerOverlayIpc } from '../../src/main/overlay-ipc';
import { IPC_CHANNELS } from '../../src/shared/contracts';
import {
  isQueryLayoutAck,
  type QueryLayoutAck,
  type QueryLayoutRequest,
  type QueryResizeRequest,
} from '../../src/shared/query-layout';
import type { RendererRole } from '../../src/shared/overlay-events';

type CapturedHandler = (event: IpcMainInvokeEvent, payload: unknown) => unknown;

const electronMocks = vi.hoisted(() => {
  const handlers = new Map<string, CapturedHandler>();
  const handle = vi.fn((channel: string, handler: CapturedHandler) => {
    handlers.set(channel, handler);
  });
  return { handle, handlers };
});

vi.mock('electron', () => ({
  ipcMain: {
    handle: electronMocks.handle,
  },
}));

const DEV_SERVER_URL = 'http://127.0.0.1:5173/';

type SenderFixture = {
  sender: WebContents;
  event: IpcMainInvokeEvent;
};

function createSender(
  id: number,
  role: RendererRole,
  options: { subframe?: boolean } = {},
): SenderFixture {
  const mainFrame = { parent: null };
  const sender = {
    id,
    isDestroyed: () => false,
    getURL: () => `${DEV_SERVER_URL}?role=${role}`,
    mainFrame,
  } as unknown as WebContents;
  const senderFrame = options.subframe ? { parent: mainFrame } : mainFrame;
  return {
    sender,
    event: {
      sender,
      senderFrame,
    } as unknown as IpcMainInvokeEvent,
  };
}

function acceptedAck(
  sessionId: number,
  sequence: number,
  height: number,
): QueryLayoutAck {
  return {
    ok: true,
    sessionId,
    sequence,
    phase: 'RESULTS',
    resultCount: 3,
    height,
    resizeEdge: 'bottom',
  };
}

function createControllerFixture() {
  const query = createSender(7, 'query');
  const fox = createSender(8, 'fox');
  const dashboard = createSender(9, 'dashboard');
  const roleById = new Map<number, RendererRole>([
    [query.sender.id, 'query'],
    [fox.sender.id, 'fox'],
    [dashboard.sender.id, 'dashboard'],
  ]);
  const reportQueryLayout = vi.fn((request: QueryLayoutRequest) =>
    acceptedAck(request.sessionId, request.sequence, request.desiredHeight),
  );
  const resizeQueryHeight = vi.fn((request: QueryResizeRequest) =>
    acceptedAck(request.sessionId, request.sequence, 360),
  );
  const controller = {
    rendererDevServerUrl: DEV_SERVER_URL,
    trustedContents: () => [query.sender, fox.sender, dashboard.sender],
    overlayRoleOf: (sender: WebContents) => roleById.get(sender.id) ?? null,
    reportQueryLayout,
    resizeQueryHeight,
  } as unknown as OverlayController;

  return {
    controller,
    dashboard,
    fox,
    query,
    reportQueryLayout,
    resizeQueryHeight,
  };
}

function capturedHandler(channel: string): CapturedHandler {
  const handler = electronMocks.handlers.get(channel);
  expect(handler).toBeTypeOf('function');
  return handler as CapturedHandler;
}

function expectRejectedAck(
  value: unknown,
  expectedIds: { sessionId: number; sequence: number },
): void {
  expect(isQueryLayoutAck(value)).toBe(true);
  expect(value).toMatchObject({ ok: false, ...expectedIds });
}

describe('overlay query layout IPC handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    electronMocks.handlers.clear();
  });

  it('forwards a valid layout report from the trusted query main frame', () => {
    const fixture = createControllerFixture();
    registerOverlayIpc(() => fixture.controller);
    const request: QueryLayoutRequest = {
      sessionId: 11,
      sequence: 3,
      phase: 'RESULTS',
      resultCount: 3,
      desiredHeight: 344,
    };

    const result = capturedHandler(IPC_CHANNELS.REPORT_QUERY_LAYOUT)(
      fixture.query.event,
      request,
    );

    expect(result).toEqual(acceptedAck(11, 3, 344));
    expect(fixture.reportQueryLayout).toHaveBeenCalledOnce();
    expect(fixture.reportQueryLayout).toHaveBeenCalledWith(request);
    expect(fixture.resizeQueryHeight).not.toHaveBeenCalled();
  });

  it('forwards a valid resize request from the trusted query main frame', () => {
    const fixture = createControllerFixture();
    registerOverlayIpc(() => fixture.controller);
    const request: QueryResizeRequest = {
      type: 'update',
      sessionId: 11,
      sequence: 4,
      deltaY: 24,
    };

    const result = capturedHandler(IPC_CHANNELS.RESIZE_QUERY_HEIGHT)(
      fixture.query.event,
      request,
    );

    expect(result).toEqual(acceptedAck(11, 4, 360));
    expect(fixture.resizeQueryHeight).toHaveBeenCalledOnce();
    expect(fixture.resizeQueryHeight).toHaveBeenCalledWith(request);
    expect(fixture.reportQueryLayout).not.toHaveBeenCalled();
  });

  it.each([
    ['fox', (fixture: ReturnType<typeof createControllerFixture>) => fixture.fox.event],
    ['dashboard', (fixture: ReturnType<typeof createControllerFixture>) => fixture.dashboard.event],
    [
      'query subframe',
      () => createSender(7, 'query', { subframe: true }).event,
    ],
    ['untrusted renderer', () => createSender(99, 'query').event],
  ])('rejects layout reports from a %s without calling the controller', (_label, eventFor) => {
    const fixture = createControllerFixture();
    registerOverlayIpc(() => fixture.controller);
    const request: QueryLayoutRequest = {
      sessionId: 21,
      sequence: 8,
      phase: 'RESULTS',
      resultCount: 3,
      desiredHeight: 420,
    };

    const result = capturedHandler(IPC_CHANNELS.REPORT_QUERY_LAYOUT)(eventFor(fixture), request);

    expectRejectedAck(result, { sessionId: 21, sequence: 8 });
    expect(fixture.reportQueryLayout).not.toHaveBeenCalled();
    expect(fixture.resizeQueryHeight).not.toHaveBeenCalled();
  });

  it.each([
    ['fox', (fixture: ReturnType<typeof createControllerFixture>) => fixture.fox.event],
    ['dashboard', (fixture: ReturnType<typeof createControllerFixture>) => fixture.dashboard.event],
    [
      'query subframe',
      () => createSender(7, 'query', { subframe: true }).event,
    ],
    ['untrusted renderer', () => createSender(99, 'query').event],
  ])('rejects resize requests from a %s without calling the controller', (_label, eventFor) => {
    const fixture = createControllerFixture();
    registerOverlayIpc(() => fixture.controller);
    const request: QueryResizeRequest = {
      type: 'begin',
      sessionId: 22,
      sequence: 9,
    };

    const result = capturedHandler(IPC_CHANNELS.RESIZE_QUERY_HEIGHT)(eventFor(fixture), request);

    expectRejectedAck(result, { sessionId: 22, sequence: 9 });
    expect(fixture.resizeQueryHeight).not.toHaveBeenCalled();
    expect(fixture.reportQueryLayout).not.toHaveBeenCalled();
  });

  it('fails closed for malformed layout and resize payloads', () => {
    const fixture = createControllerFixture();
    registerOverlayIpc(() => fixture.controller);

    const layoutResult = capturedHandler(IPC_CHANNELS.REPORT_QUERY_LAYOUT)(
      fixture.query.event,
      {
        sessionId: 30,
        sequence: 10,
        phase: 'RESULTS',
        resultCount: 3,
        desiredHeight: Number.POSITIVE_INFINITY,
      },
    );
    const resizeResult = capturedHandler(IPC_CHANNELS.RESIZE_QUERY_HEIGHT)(
      fixture.query.event,
      {
        type: 'update',
        sessionId: 30,
        sequence: 11,
        deltaY: 4097,
      },
    );

    expectRejectedAck(layoutResult, { sessionId: 0, sequence: 0 });
    expectRejectedAck(resizeResult, { sessionId: 0, sequence: 0 });
    expect(fixture.reportQueryLayout).not.toHaveBeenCalled();
    expect(fixture.resizeQueryHeight).not.toHaveBeenCalled();
  });

  it('returns protocol-valid rejected acknowledgements while the controller is unavailable', () => {
    registerOverlayIpc(() => null);
    const query = createSender(7, 'query');
    const layout = capturedHandler(IPC_CHANNELS.REPORT_QUERY_LAYOUT)(query.event, {
      sessionId: 40,
      sequence: 12,
      phase: 'RESULTS',
      resultCount: 3,
      desiredHeight: 360,
    });
    const resize = capturedHandler(IPC_CHANNELS.RESIZE_QUERY_HEIGHT)(query.event, {
      type: 'begin',
      sessionId: 40,
      sequence: 13,
    });

    expectRejectedAck(layout, { sessionId: 0, sequence: 0 });
    expectRejectedAck(resize, { sessionId: 0, sequence: 0 });
  });
});
