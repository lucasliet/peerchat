import { expect, Browser, BrowserContext, Page } from '@playwright/test';

export const BASE_URL = 'http://localhost:5174';

/**
 * Creates a new isolated browser context with media permissions granted and navigates to the app.
 * Fake media devices are provided by Chromium's --use-fake-device-for-media-stream flag.
 */
export async function newBrowserContext(
  browser: Browser,
  options?: { permissions?: string[]; offline?: boolean }
): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({
    permissions: options?.permissions ?? [
      'microphone',
      'camera',
      'clipboard-read',
      'clipboard-write',
    ],
  });
  if (options?.offline) await context.setOffline(true);
  const page = await context.newPage();
  await page.goto(BASE_URL);
  return { context, page };
}

/**
 * Clicks "Host a Room", waits for the PeerJS connection, and returns the generated 4-digit room code.
 */
export async function hostCreateRoom(page: Page): Promise<string> {
  await page.getByRole('button', { name: /host a room/i }).click();
  await expect(page.locator('[data-testid="room-code"]')).toHaveText(/^\d{4}$/, {
    timeout: 25_000,
  });
  return (await page.locator('[data-testid="room-code"]').textContent() ?? '').trim();
}

/**
 * Fills in the room code input, clicks "Join Room", and waits until the user count reaches the expected value.
 */
export async function guestJoinRoom(
  page: Page,
  roomCode: string,
  expectedUserCount = 2
): Promise<void> {
  await page.getByPlaceholder('Enter 4-digit code').fill(roomCode);
  await page.getByRole('button', { name: /join room/i }).click();
  await expect(page.locator('[data-testid="user-count"]')).toContainText(
    String(expectedUserCount),
    { timeout: 25_000 }
  );
}

/**
 * Sets up a connected host + guest pair in separate browser contexts.
 * Returns both contexts, pages, and the actual room code.
 */
export async function connectHostAndGuest(browser: Browser): Promise<{
  hostContext: BrowserContext;
  hostPage: Page;
  guestContext: BrowserContext;
  guestPage: Page;
  roomCode: string;
}> {
  const host = await newBrowserContext(browser);
  const roomCode = await hostCreateRoom(host.page);

  const guest = await newBrowserContext(browser);
  await guestJoinRoom(guest.page, roomCode);

  await expect(host.page.locator('[data-testid="user-count"]')).toContainText('2', {
    timeout: 25_000,
  });

  return {
    hostContext: host.context,
    hostPage: host.page,
    guestContext: guest.context,
    guestPage: guest.page,
    roomCode,
  };
}

/**
 * Mocks navigator.mediaDevices.getUserMedia on a page to throw a NotAllowedError.
 */
export async function denyMediaAccess(page: Page): Promise<void> {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: () =>
          Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
        enumerateDevices: () => Promise.resolve([]),
      },
      writable: true,
    });
  });
}

/**
 * Types a message in the chat input and submits it.
 */
export async function sendMessage(page: Page, text: string): Promise<void> {
  await page.getByPlaceholder('Message your peers...').fill(text);
  await page.getByPlaceholder('Message your peers...').press('Enter');
}

/**
 * Starts a call on the given page and waits for the call controls bar to appear.
 * Relies on the fake MediaStream injected by the page initScript.
 */
export async function startCall(page: Page): Promise<void> {
  await page.getByRole('button', { name: /start call/i }).click();
  await expect(page.getByRole('button', { name: /mute|unmute/i })).toBeVisible({
    timeout: 15_000,
  });
}
