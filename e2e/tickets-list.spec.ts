import { expect, test, type Page } from './fixtures';

/**
 * The ticket list end to end against the mock backend: a faceted filter reflected in the
 * URL, and a page-scoped bulk status change. Exercises the server-side list + the
 * `bulk_update_tickets` RPC over the shared MSW ticket store.
 */
async function signInAsOwner(page: Page) {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test('narrows the list with the status facet and reflects it in the URL', async ({ page }) => {
  await signInAsOwner(page);
  await page.goto('/tickets');
  await expect(page.getByRole('heading', { name: 'List of tickets' })).toBeVisible();

  // The faceted filters are collapsed behind the "Filters" button; reveal them first.
  await page.getByRole('button', { name: 'Filters' }).click();
  // Now the toolbar's 'Status' facet trigger precedes the sortable 'Status' column header.
  await page.getByRole('button', { name: 'Status' }).first().click();
  await page.getByRole('option', { name: 'open', exact: true }).click();
  await page.keyboard.press('Escape');

  await expect(page).toHaveURL(/status/);
});

test('saves the current view and lists it', async ({ page }) => {
  await signInAsOwner(page);
  await page.goto('/tickets');
  await expect(page.getByRole('heading', { name: 'List of tickets' })).toBeVisible();

  await page.getByRole('button', { name: 'Saved views' }).click();
  await page.getByRole('menuitem', { name: 'Save current view' }).click();

  await page.getByLabel('View name').fill('My e2e view');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // Reopen the menu — the new view is listed under "My views".
  await page.getByRole('button', { name: 'Saved views' }).click();
  await expect(page.getByRole('menuitem', { name: 'My e2e view' })).toBeVisible();
});

test('bulk-updates the selected page of tickets', async ({ page }) => {
  await signInAsOwner(page);
  await page.goto('/tickets');
  await expect(page.getByRole('heading', { name: 'List of tickets' })).toBeVisible();

  // Select this page's rows → the bulk bar appears.
  await page.getByRole('checkbox', { name: 'Select all rows on this page' }).click();
  await expect(page.getByRole('button', { name: 'Set status' })).toBeVisible();

  // Apply a status; on success the selection clears and the bar disappears.
  await page.getByRole('button', { name: 'Set status' }).click();
  await page.getByRole('menuitem', { name: 'solved', exact: true }).click();

  await expect(page.getByRole('button', { name: 'Set status' })).toBeHidden();
});
