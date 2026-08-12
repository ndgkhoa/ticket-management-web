import { expect, test } from './fixtures';

test('creates a team from the admin screen', async ({ page }) => {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.goto('/admin/teams');
  await expect(page.getByRole('heading', { name: 'List of teams' })).toBeVisible();

  await page.getByRole('button', { name: 'Create team' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Playwright team');
  await dialog.getByLabel('Description').fill('Team created by the e2e suite');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('cell', { name: 'Playwright team' })).toBeVisible();
});
