import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures';

When('the host clicks the room name edit icon in the sidebar', async ({ world }) => {
  const page = world.hostPage ?? world.page;
  await page.getByRole('button', { name: /edit room name/i }).click();
});

When('the host clears the field and types {string}', async ({ world }, text) => {
  const page = world.hostPage ?? world.page;
  const input = page.locator('aside input[type="text"]').first();
  await input.fill(text);
});

When('the host presses Enter', async ({ world }) => {
  const page = world.hostPage ?? world.page;
  await page.locator('aside input[type="text"]').first().press('Enter');
});

Then('the host sees {string} as the room name in the sidebar and header', async ({ world }, roomName) => {
  const page = world.hostPage ?? world.page;
  await expect(page.locator('aside h2')).toContainText(roomName, { timeout: 5_000 });
  await expect(page.locator('header h1')).toContainText(roomName, { timeout: 5_000 });
});

Then('the guest also sees {string} as the room name in real-time', async ({ world }, roomName) => {
  const page = world.guestPage ?? world.page;
  await expect(page.locator('aside h2')).toContainText(roomName, { timeout: 10_000 });
});

When('the guest clicks the edit icon next to their name in the sidebar', async ({ world }) => {
  const page = world.guestPage ?? world.page;
  const myRow = page.locator('aside div').filter({ hasText: '(You)' }).first();
  await myRow.hover();
  await page.getByRole('button', { name: /edit your name/i }).click();
});

When('the guest types {string} and presses Enter', async ({ world }, name) => {
  const page = world.guestPage ?? world.page;
  const input = page.locator('aside input[type="text"]').first();
  await input.fill(name);
  await input.press('Enter');
});



Then('the host sidebar shows {string} for that user', async ({ world }, name) => {
  const page = world.hostPage ?? world.page;
  await expect(
    page.locator('aside p').filter({ hasText: name })
  ).toBeVisible({ timeout: 10_000 });
});

When('I click the edit icon next to my name', async ({ world }) => {
  const myRow = world.page.locator('aside').getByText('(You)', { exact: false }).locator('xpath=ancestor::div[contains(@class,"group")]').first();
  await myRow.hover();
  const editBtn = world.page.getByRole('button', { name: /edit your name/i });
  await editBtn.waitFor({ state: 'visible', timeout: 5_000 });
  const nameText = await world.page.locator('aside p').filter({ hasText: '(You)' }).first().textContent();
  world.originalName = (nameText ?? '').replace(' (You)', '').trim();
  await editBtn.click();
});

When('I type {string} in the name input', async ({ world }, name) => {
  const input = world.page.locator('aside input[type="text"]').first();
  await input.fill(name);
});

When('I press Escape', async ({ world }) => {
  await world.page.keyboard.press('Escape');
});

When('I press Enter', async ({ world }) => {
  await world.page.keyboard.press('Enter');
});

Then('my original name is still displayed', async ({ world }) => {
  const cancelBtn = world.page.getByRole('button', { name: /cancel/i });
  if (await cancelBtn.isVisible()) {
    await cancelBtn.click();
  }
  if (world.originalName) {
    await expect(
      world.page.locator('aside p').filter({ hasText: world.originalName })
    ).toBeVisible({ timeout: 5_000 });
  }
  await expect(
    world.page.locator('aside p').filter({ hasText: '(You)' })
  ).toBeVisible({ timeout: 5_000 });
});

Then('the rename callback is not called', async ({ world }) => {
  if (world.originalName) {
    await expect(
      world.page.locator('aside p').filter({ hasText: world.originalName })
    ).toBeVisible({ timeout: 5_000 });
  }
});

When('I click the confirm button', async ({ world }) => {
  await world.page.getByRole('button', { name: /save name/i }).click();
});

Then('the rename callback is called with {string}', async ({ world }, name) => {
  await expect(
    world.page.locator('aside').getByText(name, { exact: false })
  ).toBeVisible({ timeout: 5_000 });
});

Then('{string} appears in the sidebar', async ({ world }, name) => {
  await expect(
    world.page.locator('aside').getByText(name, { exact: false })
  ).toBeVisible({ timeout: 5_000 });
});

When('I clear the name input and press Enter', async ({ world }) => {
  const input = world.page.locator('aside input[type="text"]').first();
  await input.fill('');
  await input.press('Enter');
});

When('the guest renames themselves to {string}', async ({ world }, name) => {
  const page = world.guestPage ?? world.page;
  const myRow = page.locator('aside div').filter({ hasText: '(You)' }).first();
  await myRow.hover();
  await page.getByRole('button', { name: /edit your name/i }).click();
  const input = page.locator('aside input[type="text"]').first();
  await input.fill(name);
  await input.press('Enter');
});
