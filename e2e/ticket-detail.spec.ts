import { expect, test, type Page } from './fixtures';

async function signIn(page: Page) {
  await page.goto('/auth/sign-in');
  await page.getByLabel('Email').fill('owner@example.com');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Login' }).click();
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

test('creates a ticket and posts a reply', async ({ page }) => {
  await signIn(page);
  await page.goto('/tickets');
  await page.getByRole('link', { name: 'Create ticket' }).click();

  await page.getByLabel('Subject').fill('E2E smoke ticket');
  await page.getByRole('button', { name: 'Create ticket' }).click();

  await expect(page.getByRole('heading', { name: 'E2E smoke ticket' })).toBeVisible();

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
  await tabA.locator('table tbody tr').first().getByRole('link').click();
  await expect(tabA.locator('[contenteditable="true"]')).toBeVisible();
  const detailUrl = tabA.url();

  const tabB = await context.newPage();
  await tabB.goto(detailUrl);
  await expect(tabB.locator('[contenteditable="true"]')).toBeVisible();

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
