import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures';

Given('the PeerChat application is running at {string}', async ({ world }, url) => {
  await world.page.goto(url);
});

Given('I am on the landing page', async ({ world }) => {
  await expect(world.page.getByRole('heading', { name: 'PeerChat', level: 1 })).toBeVisible();
});

Given('I am on the landing page as a guest', async ({ world }) => {
  await expect(world.page.getByRole('heading', { name: 'PeerChat', level: 1 })).toBeVisible();
});

When('I click {string}', async ({ world }, text) => {
  await world.page.getByRole('button', { name: new RegExp(text, 'i') }).first().click();
});

Then('I see the {string} heading', async ({ world }, heading) => {
  await expect(world.page.getByRole('heading', { name: heading })).toBeVisible();
});

Then('I am taken to the chat room view', async ({ world }) => {
  await expect(world.page.getByRole('button', { name: /leave room/i })).toBeVisible({
    timeout: 20_000,
  });
});

Then('I am returned to the landing page', async ({ world }) => {
  await expect(
    world.page.getByRole('heading', { name: 'PeerChat', level: 1 })
  ).toBeVisible({ timeout: 10_000 });
});

Then('I see {string} in the header', async ({ world }, text) => {
  await expect(world.page.locator('[data-testid="user-count"]')).toContainText(
    new RegExp(text, 'i'),
    { timeout: 15_000 }
  );
});

Then('I see a system message containing {string}', async ({ world }, text) => {
  await expect(
    world.page.locator('[data-testid="system-message"]').filter({
      hasText: new RegExp(text, 'i'),
    }).first()
  ).toBeVisible({ timeout: 15_000 });
});

Then('I see a system message {string}', async ({ world }, text) => {
  const searchText = text.replace(/^\* /, '').trim();
  await expect(
    world.page.locator('[data-testid="system-message"]').filter({
      hasText: new RegExp(searchText, 'i'),
    }).first()
  ).toBeVisible({ timeout: 15_000 });
});

Then('I see the error banner {string}', async ({ world }, errorText) => {
  const banner = world.page
    .locator('.bg-red-600, .text-red-200, [class*="red"]')
    .filter({ hasText: new RegExp(errorText, 'i') });
  await expect(banner.first()).toBeVisible({ timeout: 20_000 });
});

Then('I see {string}', async ({ world }, text) => {
  await expect(world.page.getByText(text)).toBeVisible();
});

Then('I see the footer {string}', async ({ world }, footerText) => {
  await expect(world.page.getByText(footerText, { exact: false })).toBeVisible();
});

Then('I see a {string} button', async ({ world }, buttonName) => {
  await expect(
    world.page.getByRole('button', { name: new RegExp(buttonName, 'i') })
  ).toBeVisible();
});

Then('no error banner is visible', async ({ world }) => {
  await expect(world.page.locator('.bg-red-600')).not.toBeVisible();
});
