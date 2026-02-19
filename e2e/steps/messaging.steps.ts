import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures';
import { sendMessage } from '../support/helpers';

When('the host types {string} in the message input and presses Enter', async ({ world }, message) => {
  const page = world.hostPage ?? world.page;
  await sendMessage(page, message);
});

When('the guest types {string} in the message input and presses Enter', async ({ world }, message) => {
  const page = world.guestPage ?? world.page;
  await sendMessage(page, message);
});

When('I type {string} in the message input and press Enter', async ({ world }, message) => {
  await sendMessage(world.page, message);
});

Then('the guest sees {string} in the chat', async ({ world }, message) => {
  const page = world.guestPage ?? world.page;
  await expect(
    page.locator('[data-testid="chat-messages"]').getByText(message, { exact: false })
  ).toBeVisible({ timeout: 10_000 });
});

Then('the host sees {string} in the chat', async ({ world }, message) => {
  const page = world.hostPage ?? world.page;
  await expect(
    page.locator('[data-testid="chat-messages"]').getByText(message, { exact: false })
  ).toBeVisible({ timeout: 10_000 });
});

Then('the host sees {string} in the chat with self-alignment', async ({ world }, message) => {
  const page = world.hostPage ?? world.page;
  const selfMsg = page
    .locator('[data-testid="chat-messages"] .flex-row-reverse')
    .filter({ hasText: message });
  await expect(selfMsg).toBeVisible({ timeout: 10_000 });
});

Then('the guest sees {string} in the chat with self-alignment', async ({ world }, message) => {
  const page = world.guestPage ?? world.page;
  const selfMsg = page
    .locator('[data-testid="chat-messages"] .flex-row-reverse')
    .filter({ hasText: message });
  await expect(selfMsg).toBeVisible({ timeout: 10_000 });
});

Then('the send handler is not called', async ({ world }) => {
  await world.page.waitForTimeout(300);
  const messageCount = await world.page
    .locator('[data-testid="chat-messages"] .break-words')
    .count();
  expect(messageCount).toBe(0);
});

Then('no new message appears in the chat', async ({ world }) => {
  await world.page.waitForTimeout(300);
  const messageCount = await world.page
    .locator('[data-testid="chat-messages"] .break-words')
    .count();
  expect(messageCount).toBe(0);
});

When('the host sends the message {string}', async ({ world }, message) => {
  const page = world.hostPage ?? world.page;
  await sendMessage(page, message);
});

Then('the guest sees the raw text {string} in the chat', async ({ world }, text) => {
  const page = world.guestPage ?? world.page;
  await expect(
    page.locator('[data-testid="chat-messages"]').getByText(text, { exact: true })
  ).toBeVisible({ timeout: 10_000 });
});

Then('no script is executed in the browser', async ({ world }) => {
  const page = world.guestPage ?? world.page;
  const alertFired = await page.evaluate(() => (window as any).__xssAlertFired ?? false);
  expect(alertFired).toBe(false);
});

When('the host sends a 500-character message', async ({ world }) => {
  const longMessage = 'A'.repeat(500);
  const page = world.hostPage ?? world.page;
  await sendMessage(page, longMessage);
});

Then("the message is fully displayed in the guest's chat", async ({ world }) => {
  const page = world.guestPage ?? world.page;
  const msgEl = page.locator('[data-testid="chat-messages"] .break-words').first();
  await expect(msgEl).toBeVisible({ timeout: 10_000 });
  const overflowWrap = await msgEl.evaluate(
    (el) => window.getComputedStyle(el).overflowWrap
  );
  expect(overflowWrap).toBe('break-word');
});

When('the host sends 20 messages in sequence', async ({ world }) => {
  const page = world.hostPage ?? world.page;
  for (let i = 1; i <= 20; i++) {
    await sendMessage(page, `Message ${i}`);
  }
});

Then("the last message is visible in the guest's chat", async ({ world }) => {
  const page = world.guestPage ?? world.page;
  await expect(
    page.locator('[data-testid="chat-messages"]').getByText('Message 20', { exact: false })
  ).toBeVisible({ timeout: 15_000 });
});

Then('the system message has a different visual style than user messages', async ({ world }) => {
  const page = world.hostPage ?? world.page;
  const systemMsgEl = page.locator('[data-testid="system-message"]').first();
  await expect(systemMsgEl).toBeVisible({ timeout: 10_000 });
  const classes = await systemMsgEl.getAttribute('class');
  expect(classes).toContain('uppercase');
  expect(classes).toContain('tracking-wider');
});
