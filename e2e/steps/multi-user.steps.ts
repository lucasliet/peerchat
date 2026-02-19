import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures';
import {
  connectHostAndGuest,
  newBrowserContext,
  guestJoinRoom,
  sendMessage,
} from '../support/helpers';

Given('a host and two guests are connected in the same room', async ({ world }) => {
  const { hostContext, hostPage, guestContext, guestPage, roomCode } =
    await connectHostAndGuest(world.browser);
  world.hostContext = hostContext;
  world.hostPage = hostPage;
  world.guestContext = guestContext;
  world.guestPage = guestPage;
  world.roomCode = roomCode;

  const guest2 = await newBrowserContext(world.browser);
  await guestJoinRoom(guest2.page, roomCode, 3);
  world.guest2Page = guest2.page;
  world.guest2Context = guest2.context;

  await expect(hostPage.locator('[data-testid="user-count"]')).toContainText('3', {
    timeout: 25_000,
  });
});

Then('all three participants see {string} in the header', async ({ world }, text) => {
  const pages = [world.hostPage!, world.guestPage!, world.guest2Page!].filter(Boolean);
  await Promise.all(
    pages.map((page) =>
      expect(page.locator('[data-testid="user-count"]')).toContainText(
        new RegExp(text, 'i'),
        { timeout: 15_000 }
      )
    )
  );
});

Then('all three participants are listed in the sidebar', async ({ world }) => {
  const pages = [world.hostPage!, world.guestPage!, world.guest2Page!].filter(Boolean);
  await Promise.all(
    pages.map((page) =>
      expect(page.locator('[data-testid="user-count"]')).toContainText('3', {
        timeout: 10_000,
      })
    )
  );
});

When('the first guest types {string} in the message input and presses Enter', async ({ world }, message) => {
  await sendMessage(world.guestPage!, message);
});

Then('the second guest also sees {string} in the chat', async ({ world }, message) => {
  await expect(
    world.guest2Page!.locator('[data-testid="chat-messages"]').getByText(message, {
      exact: false,
    })
  ).toBeVisible({ timeout: 15_000 });
});

When('the first guest clicks {string}', async ({ world }, buttonText) => {
  await world.guestPage!
    .getByRole('button', { name: new RegExp(buttonText, 'i') })
    .first()
    .click();
});

Then('the remaining participants see {string} in the header', async ({ world }, text) => {
  await Promise.all(
    [world.hostPage!, world.guest2Page!].filter(Boolean).map((page) =>
      expect(page.locator('[data-testid="user-count"]')).toContainText(
        new RegExp(text, 'i'),
        { timeout: 15_000 }
      )
    )
  );
});

Then('a system message {string} appears for all', async ({ world }, text) => {
  const pages = [world.hostPage!, world.guestPage!, world.guest2Page!].filter(Boolean);
  await Promise.all(
    pages.map((page) =>
      expect(
        page.locator('[data-testid="system-message"]').filter({
          hasText: new RegExp(text.replace(/^\* /, '').trim(), 'i'),
        })
      ).toBeVisible({ timeout: 15_000 })
    )
  );
});

Then('a system message {string} appears for remaining users', async ({ world }, text) => {
  await Promise.all(
    [world.hostPage!, world.guest2Page!].filter(Boolean).map((page) =>
      expect(
        page.locator('[data-testid="system-message"]').filter({
          hasText: new RegExp(text, 'i'),
        })
      ).toBeVisible({ timeout: 15_000 })
    )
  );
});
