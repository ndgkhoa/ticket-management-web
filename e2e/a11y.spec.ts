import AxeBuilder from '@axe-core/playwright';

import { expect, test, type Page } from './fixtures';

async function signIn(page: Page) {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
}

const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

test.describe('accessibility', () => {
  test('sign-in has no WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/auth/sign-in');
    await page.getByRole('button', { name: 'Login' }).waitFor();

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(
      violations,
      violations.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')
    ).toEqual([]);
  });

  test('the not-found page has no WCAG 2.1 AA violations', async ({ page }) => {
    await page.goto('/this-route-does-not-exist');
    await page.getByText('404').waitFor();

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(
      violations,
      violations.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')
    ).toEqual([]);
  });

  test('the dashboard has no WCAG 2.1 AA violations', async ({ page }) => {
    await signIn(page);
    await page.getByText('Open tickets').waitFor();
    await page.getByRole('img', { name: 'Ticket volume' }).waitFor();

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(
      violations,
      violations.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')
    ).toEqual([]);
  });
});
