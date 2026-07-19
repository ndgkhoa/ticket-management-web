import { expect, test } from '@playwright/test';

/**
 * The users admin end to end against the mock backend: sign in as owner, open a user's
 * role dialog, and toggle a role. Exercises the server-side users list + the user_roles
 * assignment write path (the same shared store the permission query reads).
 */
test('assigns a role to a user through the dialog', async ({ page }) => {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.goto('/admin/users');
  await expect(page.getByRole('heading', { name: 'List of users' })).toBeVisible();

  // Open the role dialog for the first user row.
  await page.getByRole('button', { name: 'roles of user' }).first().click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Toggle the 'agent' role and confirm the checkbox flips and sticks.
  const checkbox = dialog.locator('li', { hasText: 'agent' }).getByRole('checkbox');
  const before = await checkbox.isChecked();
  await checkbox.click();
  await expect(checkbox).toBeChecked({ checked: !before });
});
