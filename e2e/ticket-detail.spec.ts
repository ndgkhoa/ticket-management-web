import { expect, test } from '@playwright/test';

/**
 * Create a ticket and work it end to end against the mock backend: the create form lands on
 * the detail page, and a Tiptap reply posts into the conversation. Exercises the writable
 * tickets/messages/events MSW handlers over the shared store.
 */
test('creates a ticket and posts a reply', async ({ page }) => {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@demo.local');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Welcome to Our Platform' })).toBeVisible();

  await page.goto('/tickets');
  await page.getByRole('link', { name: 'Create ticket' }).click();

  await page.getByLabel('Subject').fill('E2E smoke ticket');
  await page.getByRole('button', { name: 'Create ticket' }).click();

  // Landed on the detail page for the new ticket.
  await expect(page.getByRole('heading', { name: 'E2E smoke ticket' })).toBeVisible();

  // Post a reply through the Tiptap composer.
  const editor = page.locator('[contenteditable="true"]');
  await editor.click();
  await editor.pressSequentially('Looking into this now');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText('Looking into this now')).toBeVisible();
});
