import { expect, test } from './fixtures';

test('creates a category from the admin screen', async ({ page }) => {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.goto('/admin/categories');
  await expect(page.getByRole('heading', { name: 'List of categories' })).toBeVisible();

  await page.getByRole('button', { name: 'Create category' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Playwright category');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('cell', { name: 'Playwright category' })).toBeVisible();
});
