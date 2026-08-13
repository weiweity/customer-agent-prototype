import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test, type ElectronApplication, type Page, _electron as electron } from '@playwright/test';
import { SYNTHETIC_SCRIPTS } from '../../src/renderer/data/synthetic-scripts';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const mainEntry = path.join(repoRoot, 'out/main/index.js');
const screenshotDir = path.join(repoRoot, '.gstack/qa-reports/screenshots');

// Intentionally matches both the product and pre-sale synthetic fixtures so
// the two-card visual contract has a comfortable score margin.
const LAMP_QUERY = '青岚智能灯';
const NO_HIT_QUERY = '今天中午虚构星球食堂有没有排骨汤';
const VERBATIM_TAIL = '合成原文保留尾部空格与换行  \n\n';

const lamp = SYNTHETIC_SCRIPTS.find((item) => item.scriptId === 'syn-prod-001');
if (!lamp) {
  throw new Error('missing syn-prod-001 fixture');
}

async function launchApp(): Promise<ElectronApplication> {
  return electron.launch({
    cwd: repoRoot,
    args: [mainEntry],
    timeout: 60_000,
  });
}

async function setOuterSize(
  app: ElectronApplication,
  width: number,
  height: number,
): Promise<void> {
  await app.evaluate(async ({ BrowserWindow }, size) => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) {
      throw new Error('no browser window');
    }
    win.setMinimumSize(480, 640);
    win.setSize(size.width, size.height);
  }, { width, height });
}

async function readMainClipboard(app: ElectronApplication): Promise<string> {
  return app.evaluate(({ clipboard }) => clipboard.readText());
}

async function writeMainClipboard(app: ElectronApplication, text: string): Promise<void> {
  await app.evaluate(({ clipboard }, value) => {
    clipboard.writeText(value);
  }, text);
}

async function restoreClipboard(
  app: ElectronApplication,
  original: string,
): Promise<void> {
  try {
    await writeMainClipboard(app, original);
  } catch {
    // Window may already be tearing down.
  }
}

async function maybeScreenshot(page: Page, filename: string): Promise<void> {
  const dest = path.join(screenshotDir, filename);
  if (fs.existsSync(dest)) {
    return;
  }
  await page.screenshot({ path: dest });
}

async function search(page: Page, query: string): Promise<void> {
  const input = page.getByTestId('question-input');
  const button = page.getByTestId('search-button');
  await input.fill(query);
  await button.focus();
  await expect(input).toHaveValue(query);
  await button.click();
}

async function expectFirstTwoCardsAboveFooter(page: Page): Promise<void> {
  const footer = page.locator('.app-footer');
  const footerBox = await footer.boundingBox();
  expect(footerBox).toBeTruthy();

  for (const rank of [1, 2] as const) {
    const card = page.getByTestId(`script-card-${rank}`);
    const copy = page.getByTestId(`copy-button-${rank}`);
    await expect(card.locator('.rank')).toBeVisible();
    await expect(page.getByTestId(`risk-${rank}`)).toBeVisible();
    await expect(page.getByTestId(`answer-text-${rank}`)).toBeVisible();
    await expect(copy).toBeVisible();

    const copyBox = await copy.boundingBox();
    expect(copyBox).toBeTruthy();
    expect((copyBox?.y ?? 0) + (copyBox?.height ?? 0)).toBeLessThanOrEqual((footerBox?.y ?? 0) + 1);
  }
}

test.beforeAll(() => {
  fs.mkdirSync(screenshotDir, { recursive: true });
});

test('opens the demo window, copies verbatim text, and does not persist recent facts', async () => {
  const app = await launchApp();
  let savedClipboard = '';

  try {
    const page = await app.firstWindow();
    savedClipboard = await readMainClipboard(app);
    await setOuterSize(app, 520, 760);
    await expect(page.getByTestId('env-badges')).toContainText('DEMO');
    await expect(page.getByTestId('env-badges')).toContainText('MOCK AUTH');
    await expect(page.getByTestId('env-badges')).toContainText('SYNTHETIC DATA');

    await search(page, LAMP_QUERY);
    await expect(page.getByTestId('script-card-1')).toBeVisible();
    await expectFirstTwoCardsAboveFooter(page);
    await maybeScreenshot(page, '520x760-results.png');

    const cardBefore = await page.getByTestId('script-card-1').boundingBox();
    const scrollBefore = await page.getByTestId('result-pane').evaluate((node) => node.scrollTop);

    await page.getByTestId('copy-button-1').click();
    await expect(page.getByTestId('toast')).toHaveText('已复制到剪贴板');
    expect(await readMainClipboard(app)).toBe(lamp.answerText);
    await expect(page.getByText('已发送')).toHaveCount(0);
    await expect(page.getByRole('status').getByRole('button')).toHaveCount(0);

    const cardDuring = await page.getByTestId('script-card-1').boundingBox();
    const scrollDuring = await page.getByTestId('result-pane').evaluate((node) => node.scrollTop);
    expect(cardDuring).toEqual(cardBefore);
    expect(scrollDuring).toBe(scrollBefore);
    await maybeScreenshot(page, '520x760-copied.png');

    await page.getByTestId('toast-close').click();
    await expect(page.getByTestId('copy-button-1')).toBeFocused();
    const cardAfter = await page.getByTestId('script-card-1').boundingBox();
    const scrollAfter = await page.getByTestId('result-pane').evaluate((node) => node.scrollTop);
    expect(cardAfter).toEqual(cardBefore);
    expect(scrollAfter).toBe(scrollBefore);

    await page.evaluate(async (text) => {
      const api = window.customerAgent;
      if (!api) {
        throw new Error('missing customerAgent');
      }
      const result = await api.copyText(text);
      if (!result.ok) {
        throw new Error(result.message);
      }
    }, VERBATIM_TAIL);
    expect(await readMainClipboard(app)).toBe(VERBATIM_TAIL);

    await page.getByTestId('copy-button-1').focus();
    await page.keyboard.press('2');
    expect(await readMainClipboard(app)).toBe(VERBATIM_TAIL);

    await page.getByRole('tab', { name: '近期记录' }).click();
    await expect(page.getByTestId('recent-list')).toBeVisible();
    await expect(page.getByTestId('recent-list')).toHaveCSS('list-style-type', 'none');
    await expect(page.getByTestId('recent-empty')).toHaveCount(0);
  } finally {
    await restoreClipboard(app, savedClipboard);
    await app.close();
  }

  const restarted = await launchApp();
  try {
    const page = await restarted.firstWindow();
    await setOuterSize(restarted, 480, 640);
    await page.getByRole('tab', { name: '近期记录' }).click();
    await expect(page.getByTestId('recent-empty')).toBeVisible();
    await maybeScreenshot(page, '480x640-recent-after-restart.png');

    await page.getByRole('tab', { name: '话术浮窗' }).click();
    await search(page, LAMP_QUERY);
    await expect(page.getByTestId('script-card-1')).toBeVisible();
    await expectFirstTwoCardsAboveFooter(page);
    await maybeScreenshot(page, '480x640-results.png');

    await page.getByTestId('copy-button-1').click();
    await expect(page.getByTestId('toast')).toHaveText('已复制到剪贴板');
    expect(await readMainClipboard(restarted)).toBe(lamp.answerText);
    await maybeScreenshot(page, '480x640-copied.png');

    await page.getByTestId('edit-question-button').click();
    await expect(page.getByTestId('question-input')).toHaveValue(LAMP_QUERY);
    await page.getByTestId('question-input').fill(NO_HIT_QUERY);
    await page.getByTestId('search-button').click();
    await expect(page.getByTestId('no-hit')).toBeVisible();
    await expect(page.getByTestId('no-hit')).toContainText('未找到可用话术');
    await maybeScreenshot(page, '480x640-no-hit.png');
  } finally {
    await restoreClipboard(restarted, savedClipboard);
    await restarted.close();
  }
});
