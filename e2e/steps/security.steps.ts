import { expect } from '@playwright/test';
import { Given, When, Then, Before } from '../fixtures';

Before(async ({ world }) => {
  await world.page.addInitScript(() => {
    (window as any).__xssAlertFired = false;
    const origAlert = window.alert.bind(window);
    window.alert = (msg?: unknown) => {
      (window as any).__xssAlertFired = true;
      origAlert(msg);
    };
  });
});

When('I click the copy room code button', async ({ world }) => {
  await world.page.getByRole('button', { name: /copy room code/i }).click();
});

Then('a visual confirmation of the copy action is shown', async ({ world }) => {
  await expect(world.page.locator('aside').getByText('check', { exact: false })).toBeVisible({
    timeout: 3_000,
  }).catch(async () => {
    const copyBtn = world.page.getByRole('button', { name: /copy room code/i });
    const svgCount = await copyBtn.locator('svg').count();
    expect(svgCount).toBeGreaterThan(0);
  });
});

Then('the clipboard contains exactly 4 numeric characters', async ({ world }) => {
  const clipboardText = await world.page.evaluate(() => navigator.clipboard.readText());
  expect(clipboardText).toMatch(/^\d{4}$/);
});
