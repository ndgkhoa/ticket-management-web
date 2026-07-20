import { expect, test } from './fixtures';

/**
 * The cheapest test that would have caught the most expensive bug so far.
 *
 * antd v5 renders its static message/notification APIs through the ReactDOM.render
 * that React 19 removed, so the 401/403 notices silently rendered nothing —
 * typecheck, lint and the unit suite were all green. Only booting the real bundle
 * showed it. That is what this file is for: proving the app *runs*, not that it
 * compiles.
 */
test.describe('smoke', () => {
  test('boots and renders the sign-in shell with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

    await page.goto('/auth/sign-in');

    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    // React 19 hoists <title> natively — this is what replaced react-helmet-async.
    await expect(page).toHaveTitle('Login');

    expect(errors, `console errors on boot:\n${errors.join('\n')}`).toEqual([]);
  });

  test('renders translated copy rather than raw i18n keys', async ({ page }) => {
    await page.goto('/auth/sign-in');

    // A missing key renders as the key itself, which is how "Validation.Username"
    // reached real users.
    await expect(page.locator('body')).not.toContainText(/\b(Common|Login|Fields|Validation)\./);
  });

  test('redirects an unauthenticated visitor away from a protected route', async ({ page }) => {
    await page.goto('/admin/users');

    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('keeps the chosen language after a reload', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await expect(page).toHaveTitle('Login');

    // The language detector persists under this key; the store used to mirror it and
    // drift, so a reload showed English while the stored choice was Vietnamese.
    await page.evaluate(() => localStorage.setItem('language', 'vi'));
    await page.reload();

    await expect(page).toHaveTitle('Đăng nhập');
  });
});
