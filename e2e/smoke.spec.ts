import { expect, test } from './fixtures';

test.describe('smoke', () => {
  test('boots and renders the sign-in shell with no console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => msg.type() === 'error' && errors.push(msg.text()));
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));

    await page.goto('/auth/sign-in');

    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    await expect(page).toHaveTitle('Login');

    expect(errors, `console errors on boot:\n${errors.join('\n')}`).toEqual([]);
  });

  test('renders translated copy rather than raw i18n keys', async ({ page }) => {
    await page.goto('/auth/sign-in');

    await expect(page.locator('body')).not.toContainText(/\b(Common|Login|Fields|Validation)\./);
  });

  test('redirects an unauthenticated visitor away from a protected route', async ({ page }) => {
    await page.goto('/admin/users');

    await expect(page).toHaveURL(/\/auth\/sign-in/);
  });

  test('keeps the chosen language after a reload', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await expect(page).toHaveTitle('Login');

    await page.evaluate(() => localStorage.setItem('language', 'vi'));
    await page.reload();

    await expect(page).toHaveTitle('Đăng nhập');
  });
});
