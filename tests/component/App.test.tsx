import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/renderer/App';
import { SYNTHETIC_SCRIPTS } from '../../src/renderer/data/synthetic-scripts';
import * as searchService from '../../src/renderer/features/search/search-service';
import * as delayModule from '../../src/renderer/lib/delay';
import {
  COPY_SUCCESS_MESSAGE,
  MAX_QUERY_CHARS,
  QUERY_TOO_LONG_MESSAGE,
} from '../../src/shared/contracts';

const copyText = vi.fn();
const getPlatform = vi.fn();

async function searchLamp(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByTestId('question-input'), '青岚智能灯怎么调节亮度');
  await user.click(screen.getByTestId('search-button'));
  await screen.findByTestId('copy-button-1');
}

describe('App', () => {
  beforeEach(() => {
    copyText.mockReset();
    getPlatform.mockReset();
    copyText.mockResolvedValue({ ok: true });
    getPlatform.mockResolvedValue({ platform: 'darwin' });
    window.customerAgent = {
      copyText,
      getPlatform,
    };
  });

  it('copies original answer text through the preload API and only says 已复制到剪贴板', async () => {
    const user = userEvent.setup();
    const lamp = SYNTHETIC_SCRIPTS.find((item) => item.scriptId === 'syn-prod-001');
    expect(lamp).toBeDefined();

    render(<App />);
    await searchLamp(user);

    const copyButton = screen.getByTestId('copy-button-1');
    expect(screen.getByTestId('script-card-1')).toHaveTextContent(lamp?.answerText ?? '');
    await user.click(copyButton);

    await waitFor(() => {
      expect(copyText).toHaveBeenCalledWith(lamp?.answerText);
    });
    expect(await screen.findByText(COPY_SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(screen.queryByText('已发送')).not.toBeInTheDocument();
    expect(screen.queryByText('已采纳')).not.toBeInTheDocument();

    const status = screen.getByRole('status');
    expect(status).toHaveTextContent(COPY_SUCCESS_MESSAGE);
    expect(within(status).queryByRole('button')).not.toBeInTheDocument();
    expect(screen.getByTestId('toast-close')).toBeInTheDocument();
  });

  it('does not copy with 1/2/3 while the question input is focused', async () => {
    const user = userEvent.setup();
    render(<App />);
    await searchLamp(user);
    await user.click(screen.getByTestId('edit-question-button'));

    const input = screen.getByTestId('question-input');
    input.focus();
    expect(input).toHaveFocus();
    fireEvent.keyDown(input, { key: '1' });
    expect(copyText).not.toHaveBeenCalled();
  });

  it('does not copy with 1/2/3 while a button is focused', async () => {
    const user = userEvent.setup();
    render(<App />);
    await searchLamp(user);

    const copyButton = screen.getByTestId('copy-button-1');
    copyButton.focus();
    expect(copyButton).toHaveFocus();
    fireEvent.keyDown(copyButton, { key: '2' });
    expect(copyText).not.toHaveBeenCalled();

    fireEvent.keyDown(document.body, { key: '1' });
    await waitFor(() => {
      expect(copyText).toHaveBeenCalledTimes(1);
    });
  });

  it('collapses the question after results and restores it when editing', async () => {
    const user = userEvent.setup();
    render(<App />);
    await searchLamp(user);

    expect(screen.getByTestId('question-summary')).toHaveTextContent('青岚智能灯怎么调节亮度');
    expect(screen.queryByTestId('question-input')).not.toBeInTheDocument();

    await user.click(screen.getByTestId('edit-question-button'));
    expect(screen.getByTestId('question-input')).toHaveValue('青岚智能灯怎么调节亮度');
  });

  it('returns focus to the copy button after the toast is dismissed', async () => {
    const user = userEvent.setup();
    render(<App />);
    await searchLamp(user);
    await user.click(screen.getByTestId('copy-button-1'));
    await screen.findByTestId('toast');
    await user.click(screen.getByTestId('toast-close'));
    await waitFor(() => {
      expect(screen.getByTestId('copy-button-1')).toHaveFocus();
    });
  });

  it('shows an explicit no-hit upgrade path without fabricated candidates', async () => {
    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByTestId('question-input'), '今天中午虚构星球食堂有没有排骨汤');
    await user.click(screen.getByTestId('search-button'));

    expect(await screen.findByTestId('no-hit')).toHaveTextContent('未找到可用话术');
    expect(screen.getByTestId('no-hit')).toHaveTextContent('未接通真实飞书');
    expect(screen.queryByTestId('result-list')).not.toBeInTheDocument();
    expect(screen.queryByTestId('script-card-1')).not.toBeInTheDocument();
  });

  it('shows a visible retry when copy fails', async () => {
    const user = userEvent.setup();
    copyText.mockResolvedValue({ ok: false, message: '复制失败，请重试' });
    render(<App />);
    await searchLamp(user);
    await user.click(screen.getByTestId('copy-button-1'));

    expect(await screen.findByText('复制失败，请重试')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '重试' })).toBeInTheDocument();
    expect(copyText).toHaveBeenCalledTimes(1);
  });

  it('swallows getPlatform rejection and keeps the default shortcut', async () => {
    const unhandled: PromiseRejectionEvent[] = [];
    const onUnhandled = (event: PromiseRejectionEvent) => {
      unhandled.push(event);
    };
    window.addEventListener('unhandledrejection', onUnhandled);
    getPlatform.mockRejectedValue(new Error('platform unavailable'));

    render(<App />);
    await waitFor(() => {
      expect(getPlatform).toHaveBeenCalled();
    });
    await Promise.resolve();
    await Promise.resolve();

    expect(unhandled).toHaveLength(0);
    expect(screen.getAllByText(/Ctrl \+ Enter/).length).toBeGreaterThan(0);
    window.removeEventListener('unhandledrejection', onUnhandled);
  });

  it('ignores a second copy while the first preload call is in flight', async () => {
    let release!: (value: { ok: true }) => void;
    const deferred = new Promise<{ ok: true }>((resolve) => {
      release = resolve;
    });
    copyText.mockImplementation(() => deferred);

    const user = userEvent.setup();
    render(<App />);
    await searchLamp(user);

    fireEvent.click(screen.getByTestId('copy-button-1'));
    await waitFor(() => {
      expect(copyText).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('copy-button-2'));
    screen.getByTestId('copy-button-1').blur();
    fireEvent.keyDown(document.body, { key: '2' });
    expect(copyText).toHaveBeenCalledTimes(1);

    release({ ok: true });
    expect(await screen.findByText(COPY_SUCCESS_MESSAGE)).toBeInTheDocument();
    expect(copyText).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('tab', { name: '近期记录' }));
    const copiedFacts = within(screen.getByTestId('recent-list'))
      .getAllByRole('listitem')
      .filter((item) => item.textContent?.includes('已复制'));
    expect(copiedFacts).toHaveLength(1);
  });

  it('ignores a second search while the first delay is in flight', async () => {
    let release!: () => void;
    const delaySpy = vi.spyOn(delayModule, 'delay').mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    );
    const searchSpy = vi.spyOn(searchService, 'searchScripts');

    const user = userEvent.setup();
    render(<App />);
    await user.type(screen.getByTestId('question-input'), '青岚智能灯怎么调节亮度');
    fireEvent.click(screen.getByTestId('search-button'));
    await waitFor(() => {
      expect(delaySpy).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByTestId('search-button'));
    fireEvent.keyDown(screen.getByTestId('question-input'), {
      key: 'Enter',
      metaKey: true,
    });
    fireEvent.keyDown(screen.getByTestId('question-input'), {
      key: 'Enter',
      ctrlKey: true,
    });

    expect(delaySpy).toHaveBeenCalledTimes(1);
    expect(searchSpy).not.toHaveBeenCalled();

    try {
      release();
      await screen.findByTestId('copy-button-1');
      expect(searchSpy).toHaveBeenCalledTimes(1);

      await user.click(screen.getByRole('tab', { name: '近期记录' }));
      expect(within(screen.getByTestId('recent-list')).getAllByRole('listitem')).toHaveLength(1);
    } finally {
      delaySpy.mockRestore();
      searchSpy.mockRestore();
    }
  });

  it('rejects a programmatically injected 2001-character query without searching', async () => {
    const searchSpy = vi.spyOn(searchService, 'searchScripts');
    const user = userEvent.setup();
    render(<App />);

    fireEvent.change(screen.getByTestId('question-input'), {
      target: { value: '啊'.repeat(MAX_QUERY_CHARS + 1) },
    });
    fireEvent.click(screen.getByTestId('search-button'));

    expect(await screen.findByTestId('validation-error')).toHaveTextContent(
      QUERY_TOO_LONG_MESSAGE,
    );
    expect(searchSpy).not.toHaveBeenCalled();

    await user.click(screen.getByRole('tab', { name: '近期记录' }));
    expect(screen.getByTestId('recent-empty')).toBeInTheDocument();
    searchSpy.mockRestore();
  });

  it('does not reject an exact 2000-character query for length', async () => {
    const searchSpy = vi.spyOn(searchService, 'searchScripts');
    render(<App />);

    fireEvent.change(screen.getByTestId('question-input'), {
      target: { value: '啊'.repeat(MAX_QUERY_CHARS) },
    });
    fireEvent.click(screen.getByTestId('search-button'));

    await waitFor(() => {
      expect(searchSpy).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(QUERY_TOO_LONG_MESSAGE)).not.toBeInTheDocument();
    searchSpy.mockRestore();
  });
});
