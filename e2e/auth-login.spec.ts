import { expect, test } from './fixtures';

test.describe('demo sign-in (msw)', () => {
  test('signs in with a demo account and reaches the dashboard', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await page.getByLabel('Email').fill('owner@example.com');
    await page.getByLabel('Password', { exact: true }).fill('password123');
    await page.getByRole('button', { name: 'Login' }).click();

    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('the Google button signs in as the demo user', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await page.getByRole('button', { name: /google/i }).click();

    await expect(page).not.toHaveURL(/sign-in/);
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });
});
