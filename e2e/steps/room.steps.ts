import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures';
import {
  connectHostAndGuest,
  hostCreateRoom,
  guestJoinRoom,
  newBrowserContext,
  BASE_URL,
} from '../support/helpers';

Given('I am the host of a room', async ({ world }) => {
  world.roomCode = await hostCreateRoom(world.page);
});

Given('I am in a room', async ({ world }) => {
  world.roomCode = await hostCreateRoom(world.page);
});

Given('I am in a room with no messages', async ({ world }) => {
  world.roomCode = await hostCreateRoom(world.page);
});

Given('I am in a room with no error', async ({ world }) => {
  world.roomCode = await hostCreateRoom(world.page);
});

Given('a host has created a room', async ({ world }) => {
  const host = await newBrowserContext(world.browser);
  world.roomCode = await hostCreateRoom(host.page);
  world.hostPage = host.page;
  world.hostContext = host.context;
});

Given('a host has created a room with code {string}', async ({ world }, _code) => {
  const host = await newBrowserContext(world.browser);
  world.roomCode = await hostCreateRoom(host.page);
  world.hostPage = host.page;
  world.hostContext = host.context;
});

Given('a host and a guest are connected in the same room', async ({ world }) => {
  const { hostContext, hostPage, guestContext, guestPage, roomCode } =
    await connectHostAndGuest(world.browser);
  world.hostContext = hostContext;
  world.hostPage = hostPage;
  world.guestContext = guestContext;
  world.guestPage = guestPage;
  world.roomCode = roomCode;
});

Given('a host is in a room', async ({ world }) => {
  const host = await newBrowserContext(world.browser);
  world.roomCode = await hostCreateRoom(host.page);
  world.hostPage = host.page;
  world.hostContext = host.context;
});

When('a guest joins the room', async ({ world }) => {
  const guest = await newBrowserContext(world.browser);
  await guestJoinRoom(guest.page, world.roomCode!);
  world.guestPage = guest.page;
  world.guestContext = guest.context;
});

When('a second guest joins the room', async ({ world }) => {
  const guest2 = await newBrowserContext(world.browser);
  await guestJoinRoom(guest2.page, world.roomCode!, 3);
  world.guest2Page = guest2.page;
  world.guest2Context = guest2.context;
  await expect(world.hostPage!.locator('[data-testid="user-count"]')).toContainText('3', {
    timeout: 25_000,
  });
});

When('a guest joins the room from a third context', async ({ world }) => {
  const guest = await newBrowserContext(world.browser);
  await guestJoinRoom(guest.page, world.roomCode!, 2);
  world.guestPage = guest.page;
  world.guestContext = guest.context;
});

When('the guest clicks {string}', async ({ world }, buttonText) => {
  const page = world.guestPage ?? world.page;
  await page.getByRole('button', { name: new RegExp(buttonText, 'i') }).first().click();
});

When('the host clicks {string}', async ({ world }, buttonText) => {
  const page = world.hostPage ?? world.page;
  await page.getByRole('button', { name: new RegExp(buttonText, 'i') }).first().click();
});

Then('I see a 4-digit room code in the sidebar', async ({ world }) => {
  await expect(world.page.locator('[data-testid="room-code"]')).toHaveText(/^\d{4}$/, {
    timeout: 10_000,
  });
});

Then('my username is listed with {string} label in the sidebar', async ({ world }, label) => {
  await expect(
    world.page.locator('aside p').filter({ hasText: label })
  ).toBeVisible();
});

Then('both the host and I are listed in the sidebar', async ({ world }) => {
  await expect(world.page.locator('[data-testid="user-count"]')).toContainText('2', {
    timeout: 10_000,
  });
});

Then('there is no room code input visible on the screen', async ({ world }) => {
  await expect(world.page.getByPlaceholder('Enter 4-digit code')).not.toBeVisible();
});

Then('the guest is returned to the landing page', async ({ world }) => {
  const page = world.guestPage ?? world.page;
  await expect(
    page.getByRole('heading', { name: 'PeerChat', level: 1 })
  ).toBeVisible({ timeout: 10_000 });
});

Then('the host sees {string} in the header', async ({ world }, text) => {
  const page = world.hostPage ?? world.page;
  await expect(page.locator('[data-testid="user-count"]')).toContainText(
    new RegExp(text, 'i'),
    { timeout: 15_000 }
  );
});

Then('the guest sees {string} in the header', async ({ world }, text) => {
  const page = world.guestPage ?? world.page;
  await expect(page.locator('[data-testid="user-count"]')).toContainText(
    new RegExp(text, 'i'),
    { timeout: 15_000 }
  );
});

Then('the host sees a system message containing {string}', async ({ world }, text) => {
  const page = world.hostPage ?? world.page;
  await expect(
    page.locator('[data-testid="system-message"]').filter({
      hasText: new RegExp(text, 'i'),
    }).first()
  ).toBeVisible({ timeout: 30_000 });
});

Then('the host sees {string}', async ({ world }, text) => {
  const page = world.hostPage ?? world.page;
  await expect(page.locator('[data-testid="user-count"]')).toContainText(
    new RegExp(text, 'i'),
    { timeout: 15_000 }
  );
});

Then('the guest sees {string}', async ({ world }, text) => {
  const page = world.guestPage ?? world.page;
  await expect(page.locator('[data-testid="user-count"]')).toContainText(
    new RegExp(text, 'i'),
    { timeout: 15_000 }
  );
});

Then('the guest sees the {string} heading', async ({ world }, heading) => {
  const page = world.guestPage ?? world.page;
  await expect(page.getByRole('heading', { name: heading })).toBeVisible({ timeout: 10_000 });
});

Then('the guest sees the error {string}', async ({ world }, errorText) => {
  const page = world.guestPage ?? world.page;
  const banner = page
    .locator('[class*="red"]')
    .filter({ hasText: new RegExp(errorText, 'i') });
  await expect(banner.first()).toBeVisible({ timeout: 35_000 });
});

Given('the host has renamed the room to {string}', async ({ world }, roomName) => {
  const page = world.hostPage ?? world.page;
  await page.getByRole('button', { name: /edit room name/i }).click();
  const input = page.locator('aside input[type="text"]').first();
  await input.fill(roomName);
  await input.press('Enter');
  await expect(page.locator('aside h2')).toContainText(roomName, { timeout: 5_000 });
});

Then('the second guest sees the room name as {string}', async ({ world }, roomName) => {
  const page = world.guest2Page ?? world.guestPage ?? world.page;
  await expect(page.locator('aside h2')).toContainText(roomName, { timeout: 10_000 });
});

Then('the guest does not see the room name edit button', async ({ world }) => {
  const page = world.guestPage ?? world.page;
  await expect(
    page.getByRole('button', { name: /edit room name/i })
  ).not.toBeVisible();
});

Then('the guest sidebar shows {string}', async ({ world }, text) => {
  const page = world.guestPage ?? world.page;
  await expect(page.locator('aside').getByText(text, { exact: false })).toBeVisible({
    timeout: 10_000,
  });
});

Then('the host sidebar shows {string}', async ({ world }, text) => {
  const page = world.hostPage ?? world.page;
  await expect(page.locator('aside').getByText(text, { exact: false })).toBeVisible({
    timeout: 10_000,
  });
});


