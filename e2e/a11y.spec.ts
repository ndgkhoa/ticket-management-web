import AxeBuilder from '@axe-core/playwright';

import { expect, test, type Page } from './fixtures';

async function signIn(page: Page) {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await page.getByRole('heading', { name: 'Dashboard' }).waitFor();
}

/**
 * Accessibility is asserted in a real browser, deliberately.
 *
 * The jsdom alternative (jest-axe) cannot evaluate anything that needs layout or
 * paint: axe returns `color-contrast` as *incomplete* there, and the matcher only
 * reads `violations` — so unreadable text passes silently. A gate that reports green
 * without having run the check is worse than no gate.
 *
 * WCAG 2.1 AA is the tagged rule set: it is the level most public-sector and
 * enterprise procurement actually asks for, and it excludes the AAA rules that would
 * fail on any conventional design.
 */
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
    // Wait for React to actually paint before scanning. `goto` resolves on `load`,
    // which covers only the HTML and assets — scanning there races the first render, and
    // axe against a half-built DOM finds nothing and reports a false pass. That is what
    // made this test look flaky: it was not intermittent, it was sometimes scanning an
    // empty page.
    //
    // Waits on "404" rather than the button's label: the label is currently a hardcoded
    // Vietnamese string, and localising this page (which is planned) would otherwise
    // break the test for reasons that have nothing to do with accessibility.
    await page.getByText('404').waitFor();

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(
      violations,
      violations.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')
    ).toEqual([]);
  });

  test('the dashboard has no WCAG 2.1 AA violations', async ({ page }) => {
    await signIn(page);
    // Wait for a metric to paint — a KPI value, not just the label — so the scan runs against
    // the resolved dashboard (charts + cards), not its loading skeletons.
    await page.getByText('Open tickets').waitFor();
    await page.getByRole('img', { name: 'Ticket volume' }).waitFor();

    const { violations } = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();

    expect(
      violations,
      violations.map((v) => `${v.id} (${v.impact}): ${v.help}`).join('\n')
    ).toEqual([]);
  });
});
