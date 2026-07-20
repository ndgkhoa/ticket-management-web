import { expect, test } from './fixtures';

/**
 * Admin CRUD end to end against the mock backend: sign in as the owner, open the SLA policies
 * screen, and create a row through the dialog. Priority defaults to the first enum value; the
 * two response-time fields are required. Proves the table + form dialog + MSW write path work
 * together in a real browser.
 */
test('creates an SLA policy from the admin screen', async ({ page }) => {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.goto('/admin/sla-policies');
  await expect(page.getByRole('heading', { name: 'List of SLA policies' })).toBeVisible();

  await page.getByRole('button', { name: 'Create SLA policy' }).click();

  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Name').fill('Playwright SLA');
  await dialog.getByLabel('First response (min)').fill('60');
  await dialog.getByLabel('Resolution (min)').fill('480');
  await dialog.getByRole('button', { name: 'Save' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('cell', { name: 'Playwright SLA' })).toBeVisible();
});
