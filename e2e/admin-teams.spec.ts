import { expect, test } from './fixtures';

/**
 * Admin CRUD end to end against the mock backend: sign in as the owner, open the teams screen,
 * and create a row through the dialog. Proves the teams table + form dialog + MSW write path
 * work together in a real browser.
 */
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
