import { expect, test } from '@playwright/test';

/**
 * The role permission matrix end to end against the mock backend: sign in as owner, open
 * a role's permissions, and grant one it lacks. Exercises the matrix dialog + the
 * composite-key `role_permissions` write path in a real browser.
 */
test('grants a permission to a role through the matrix', async ({ page }) => {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();

  await page.goto('/admin/roles');
  await expect(page.getByRole('heading', { name: 'List of roles' })).toBeVisible();

  // Open the matrix for the agent role.
  const agentRow = page.getByRole('row').filter({ hasText: 'agent' });
  await agentRow.getByRole('button', { name: 'permissions of role' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // The agent role deliberately lacks user.read.all — grant it and confirm it sticks.
  const permissionRow = dialog.locator('li', { hasText: 'user.read.all' });
  const checkbox = permissionRow.getByRole('checkbox');
  await expect(checkbox).not.toBeChecked();

  await checkbox.click();
  await expect(checkbox).toBeChecked();
});
