import { expect, test } from './fixtures';

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

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole('cell', { name: 'Playwright canned response', exact: true })
  ).toBeVisible();
});
