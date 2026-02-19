import { expect } from '@playwright/test';
import { Given, When, Then } from '../fixtures';

Then('I see the tagline {string}', async ({ world }, tagline) => {
  await expect(world.page.getByText(tagline)).toBeVisible();
});

Then('I see a {string} section with a 4-digit code input', async ({ world }, sectionName) => {
  await expect(world.page.getByRole('heading', { name: sectionName, level: 2 })).toBeVisible();
  await expect(world.page.getByPlaceholder('Enter 4-digit code')).toBeVisible();
});

Then('I see a {string} section with an arrow button', async ({ world }, _sectionName) => {
  await expect(world.page.getByRole('button', { name: /host a room/i })).toBeVisible();
});

Then('the {string} button is disabled', async ({ world }, buttonText) => {
  await expect(
    world.page.getByRole('button', { name: new RegExp(buttonText, 'i') })
  ).toBeDisabled();
});

Then('the {string} button is enabled', async ({ world }, buttonText) => {
  await expect(
    world.page.getByRole('button', { name: new RegExp(buttonText, 'i') })
  ).toBeEnabled();
});

When('I type {string} in the room code input', async ({ world }, code) => {
  const actualCode = world.roomCode ?? code;
  await world.page.getByPlaceholder('Enter 4-digit code').fill(actualCode);
});

Then('the input value is {string}', async ({ world }, value) => {
  await expect(world.page.getByPlaceholder('Enter 4-digit code')).toHaveValue(value);
});

When('I press Enter on the room code input', async ({ world }) => {
  await world.page.getByPlaceholder('Enter 4-digit code').press('Enter');
});
