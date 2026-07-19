import { expect, test, type Page } from '@playwright/test';

async function signIn(page: Page) {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

/**
 * Create a ticket and work it end to end against the mock backend: the create form lands on
 * the detail page, and a Tiptap reply posts into the conversation. Exercises the writable
 * tickets/messages/events MSW handlers over the shared store.
 */
test('creates a ticket and posts a reply', async ({ page }) => {
  await signIn(page);
  await page.goto('/tickets');
  await page.getByRole('link', { name: 'Create ticket' }).click();

  await page.getByLabel('Subject').fill('E2E smoke ticket');
  await page.getByRole('button', { name: 'Create ticket' }).click();

  // Landed on the detail page for the new ticket.
  await expect(page.getByRole('heading', { name: 'E2E smoke ticket' })).toBeVisible();

  // Post a reply through the Tiptap composer.
  const editor = page.locator('[contenteditable="true"]');
  await editor.click();
  await editor.pressSequentially('Looking into this now');
  await page.getByRole('button', { name: 'Send' }).click();

  await expect(page.getByText('Looking into this now')).toBeVisible();
});

test('a reply in one tab shows in another via realtime', async ({ context }) => {
  const tabA = await context.newPage();
  await signIn(tabA);
  await tabA.goto('/tickets');
  // Open the first ticket's detail.
  await tabA.locator('table tbody tr').first().getByRole('link').click();
  await expect(tabA.locator('[contenteditable="true"]')).toBeVisible();
  const detailUrl = tabA.url();

  // A second tab (same browser context → shared BroadcastChannel) views the same ticket.
  const tabB = await context.newPage();
  await tabB.goto(detailUrl);
  await expect(tabB.locator('[contenteditable="true"]')).toBeVisible();

  // Post from tab A; tab B receives it spliced into the timeline.
  const editor = tabA.locator('[contenteditable="true"]');
  await editor.click();
  await editor.pressSequentially('Realtime cross-tab reply');
  await tabA.getByRole('button', { name: 'Send' }).click();

  await expect(tabB.getByText('Realtime cross-tab reply')).toBeVisible({ timeout: 8000 });
});

test('uploads an attachment', async ({ page }) => {
  await signIn(page);
  await page.goto('/tickets');
  await page.locator('table tbody tr').first().getByRole('link').click();
  await expect(page.getByRole('heading', { name: 'Attachments' })).toBeVisible();

  await page.setInputFiles('input[type="file"]', {
    name: 'runbook.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from('steps to reproduce'),
  });

  await expect(page.getByRole('link', { name: 'runbook.txt' })).toBeVisible();
});
