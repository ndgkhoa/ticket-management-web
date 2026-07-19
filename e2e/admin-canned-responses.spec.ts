import { expect, test } from '@playwright/test';

/**
 * Canned-responses admin end to end against the mock backend: sign in as the owner,
 * open the server-side paginated list, and create a row through the dialog — mirrors
 * `admin-categories.spec.ts`, proving the server-side list + form dialog + MSW write
 * path all work together in a real browser.
 */
test('creates a canned response from the admin screen', async ({ page }) => {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.goto('/admin/canned-responses');
  await expect(page.getByRole('heading', { name: 'List of canned responses' })).toBeVisible();

  await page.getByRole('button', { name: 'Create canned response' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Title').fill('Playwright canned response');
  await dialog.getByLabel('Body').fill('Playwright canned response body.');
  await dialog.getByRole('button', { name: 'Save' }).click();

  // The dialog closes and the invalidated list refetches with the new row.
  await expect(dialog).toBeHidden();
  // exact: the body cell starts with the same text, so match the title cell precisely.
  await expect(
    page.getByRole('cell', { name: 'Playwright canned response', exact: true })
  ).toBeVisible();
});
