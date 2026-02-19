import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures';
import { startCall, connectHostAndGuest, newBrowserContext, hostCreateRoom } from '../support/helpers';

Given('I am in an active call', async ({ world }) => {
  world.roomCode = await hostCreateRoom(world.page);
  await startCall(world.page);
});

Given('a host has started a call', async ({ world }) => {
  const { hostContext, hostPage, guestContext, guestPage, roomCode } =
    await connectHostAndGuest(world.browser);
  world.hostContext = hostContext;
  world.hostPage = hostPage;
  world.guestContext = guestContext;
  world.guestPage = guestPage;
  world.roomCode = roomCode;
  await startCall(hostPage);
});

Given('a host and a guest are in an active call', async ({ world }) => {
  const { hostContext, hostPage, guestContext, guestPage, roomCode } =
    await connectHostAndGuest(world.browser);
  world.hostContext = hostContext;
  world.hostPage = hostPage;
  world.guestContext = guestContext;
  world.guestPage = guestPage;
  world.roomCode = roomCode;
  await startCall(hostPage);
  await startCall(guestPage);
});

When('I click the mute button', async ({ world }) => {
  const page = world.hostPage ?? world.page;
  await page.getByRole('button', { name: /mute|unmute/i }).click();
});

When('I click the end-call button', async ({ world }) => {
  const page = world.hostPage ?? world.page;
  await page.getByRole('button', { name: /end call/i }).click();
});

When('the guest ends the call', async ({ world }) => {
  const page = world.guestPage!;
  await page.getByRole('button', { name: /end call/i }).click();
});

Then('I see the mute button in the call controls bar', async ({ world }) => {
  await expect(world.page.getByRole('button', { name: /mute|unmute/i })).toBeVisible();
});

Then('I see the camera toggle button in the call controls bar', async ({ world }) => {
  await expect(
    world.page.getByRole('button', { name: /turn camera/i })
  ).toBeVisible();
});

Then('I see the end-call button in the call controls bar', async ({ world }) => {
  await expect(world.page.getByRole('button', { name: /end call/i })).toBeVisible();
});

Then(/^I see the end-call \(PhoneOff\) button in the call controls bar$/, async ({ world }) => {
  await expect(world.page.getByRole('button', { name: /end call/i })).toBeVisible();
});

Then(/^I see a video tile with "([^"]+)" text/, async ({ world }, text) => {
  await expect(world.page.getByText(text, { exact: false })).toBeVisible({ timeout: 10_000 });
});

Then('the mute icon appears next to my name in the sidebar', async ({ world }) => {
  const page = world.hostPage ?? world.page;
  await expect(page.locator('aside [class*="MicOff"], aside svg').first()).toBeVisible({
    timeout: 5_000,
  });
});

Then('the mute button appears highlighted', async ({ world }) => {
  const page = world.hostPage ?? world.page;
  const muteBtn = page.getByRole('button', { name: /mute|unmute/i });
  await expect(muteBtn).toHaveClass(/bg-red-500/, { timeout: 5_000 });
});

Then(/^the mute button appears highlighted(?:\s+\(active state\))?$/, async ({ world }) => {
  const page = world.hostPage ?? world.page;
  const muteBtn = page.getByRole('button', { name: /mute|unmute/i });
  await expect(muteBtn).toHaveClass(/bg-red-500/, { timeout: 5_000 });
});

Then('the {string} button is visible again', async ({ world }, buttonName) => {
  const page = world.hostPage ?? world.page;
  await expect(
    page.getByRole('button', { name: new RegExp(buttonName, 'i') })
  ).toBeVisible({ timeout: 5_000 });
});

Then('the video grid is hidden', async ({ world }) => {
  const page = world.hostPage ?? world.page;
  await expect(page.getByText('Camera Off')).not.toBeVisible({ timeout: 5_000 });
});

Then('the call controls bar is visible', async ({ world }) => {
  await expect(world.page.getByRole('button', { name: /end call/i })).toBeVisible({ timeout: 10_000 });
});

Then('the call controls bar is not shown', async ({ world }) => {
  await expect(world.page.getByRole('button', { name: /end call/i })).not.toBeVisible({ timeout: 5_000 });
  await expect(world.page.getByRole('button', { name: /mute|unmute/i })).not.toBeVisible({ timeout: 5_000 });
});

Then('the guest sees their own video tile', async ({ world }) => {
  const page = world.guestPage ?? world.page;
  await expect(page.getByText('Camera Off').first()).toBeVisible({ timeout: 10_000 });
});

Then("the guest's video tile is removed from the host's video grid", async ({ world }) => {
  const hostPage = world.hostPage!;
  await expect(hostPage.locator('[data-testid="chat-messages"]')).toBeVisible({ timeout: 10_000 });
  const videoTileCount = await hostPage.getByText('Camera Off').count();
  expect(videoTileCount).toBeLessThanOrEqual(1);
});

Then('the system message {string} appears for the guest', async ({ world }, text) => {
  const page = world.guestPage ?? world.page;
  const searchText = text.replace(/^\* /, '').trim();
  await expect(
    page.locator('[data-testid="system-message"]').filter({
      hasText: new RegExp(searchText, 'i'),
    }).first()
  ).toBeVisible({ timeout: 15_000 });
});

Given('I am in a room with an active error {string}', async ({ world }, _errorMsg) => {
  await world.page.getByRole('button', { name: /host a room/i }).click();
  await expect(world.page.locator('[data-testid="room-code"]')).toHaveText(/^\d{4}$/, {
    timeout: 20_000,
  });
  await world.page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: () =>
          Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
        enumerateDevices: () => Promise.resolve([]),
      },
      writable: true,
    });
  });
  await world.page.getByRole('button', { name: /start call/i }).click();
  await expect(world.page.locator('.bg-red-600')).toBeVisible({ timeout: 10_000 });
});

Given('I am in a room with an active error', async ({ world }) => {
  await world.page.getByRole('button', { name: /host a room/i }).click();
  await expect(world.page.locator('[data-testid="room-code"]')).toHaveText(/^\d{4}$/, {
    timeout: 20_000,
  });
  await world.page.evaluate(() => {
    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: () =>
          Promise.reject(new DOMException('Permission denied', 'NotAllowedError')),
        enumerateDevices: () => Promise.resolve([]),
      },
      writable: true,
    });
  });
  await world.page.getByRole('button', { name: /start call/i }).click();
  await expect(world.page.locator('.bg-red-600')).toBeVisible({ timeout: 10_000 });
});

When('I click the X button on the error banner', async ({ world }) => {
  await world.page.getByRole('button', { name: /dismiss error/i }).click();
});

When('I click the dismiss error button', async ({ world }) => {
  await world.page.getByRole('button', { name: /dismiss error/i }).click();
});

Then('the error banner disappears', async ({ world }) => {
  await expect(world.page.locator('.bg-red-600')).not.toBeVisible({ timeout: 5_000 });
});

Then('the clear error callback is called', async ({ world }) => {
  await expect(world.page.locator('.bg-red-600')).not.toBeVisible({ timeout: 5_000 });
});

When('I double-click {string}', async ({ world }, buttonText) => {
  const btn = world.page.getByRole('button', { name: new RegExp(buttonText, 'i') });
  await btn.dblclick();
});

Then('only one video tile for myself appears', async ({ world }) => {
  await world.page.waitForTimeout(1000);
  const tileCount = await world.page.getByText('Camera Off').count();
  expect(tileCount).toBeLessThanOrEqual(1);
});
