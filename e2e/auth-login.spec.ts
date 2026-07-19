import { expect, test } from '@playwright/test';

/**
 * The demo build (`VITE_API_MODE=msw`) has no live backend, so sign-in runs entirely
 * against the mock GoTrue + the fixture-backed permission query. This proves the whole
 * loop in a real browser: the SDK persists the mock session, the auth store resolves the
 * permission set, and the guard then admits the user to the app.
 *
 * Credentials are the seeded demo accounts documented in the README; the shared password
 * is fixture data, not a secret.
 */
test.describe('demo sign-in (msw)', () => {
  test('signs in with a demo account and reaches the dashboard', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await page.getByLabel('Email').fill('owner@example.com');
    // exact: the show/hide toggle's "Show password" label also contains "Password".
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
