import { test as base } from 'playwright-bdd';
import { Browser, BrowserContext, Page } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

export interface PeerChatWorld {
  page: Page;
  browser: Browser;
  hostPage: Page | null;
  hostContext: BrowserContext | null;
  guestPage: Page | null;
  guestContext: BrowserContext | null;
  guest2Page: Page | null;
  guest2Context: BrowserContext | null;
  roomCode: string | null;
  originalName: string | null;
}

export const test = base.extend<{ world: PeerChatWorld }>({
  world: async ({ page, browser }, use) => {
    const world: PeerChatWorld = {
      page,
      browser,
      hostPage: null,
      hostContext: null,
      guestPage: null,
      guestContext: null,
      guest2Page: null,
      guest2Context: null,
      roomCode: null,
      originalName: null,
    };
    await use(world);
    await world.guest2Context?.close();
    await world.guestContext?.close();
    await world.hostContext?.close();
  },
});

export const { Given, When, Then, Before, After } = createBdd(test);
