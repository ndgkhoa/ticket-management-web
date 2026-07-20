import { describe, expect, it } from 'vitest';

import { cannedResponseApi } from '~/features/admin/canned-responses/api/canned-response-api';
import { cannedResponseRows } from '~/mocks/fixtures';

describe('canned response list over MSW', () => {
  it('lists every seeded row on a page large enough to hold them all', async () => {
    const result = await cannedResponseApi.list({ page: 1, pageSize: 100, filters: {} });
    expect(result.totalCount).toBe(cannedResponseRows.length);
    expect(result.rows).toHaveLength(cannedResponseRows.length);
  });

  it('narrows by a keyword found in a known title', async () => {
    const [firstWord] = cannedResponseRows[0].title.split(' ');
    const result = await cannedResponseApi.list({
      page: 1,
      pageSize: 100,
      q: firstWord,
      filters: {},
    });
    expect(result.totalCount).toBeGreaterThan(0);
    expect(result.totalCount).toBeLessThanOrEqual(cannedResponseRows.length);
  });
});

describe('canned response CRUD over MSW', () => {
  it('creates a canned response with server-defaulted id and created_at', async () => {
    const before = await cannedResponseApi.list({ page: 1, pageSize: 100, filters: {} });

    const created = await cannedResponseApi.create({ title: 'X', body: 'Y' });
    expect(created.id).toBeTruthy();
    expect(created.createdAt).toBeTruthy();

    const after = await cannedResponseApi.list({ page: 1, pageSize: 100, filters: {} });
    expect(after.totalCount).toBe(before.totalCount + 1);
  });

  it('updates then deletes a canned response', async () => {
    const created = await cannedResponseApi.create({ title: 'Temp', body: 'Temp body' });

    const updated = await cannedResponseApi.update(created.id, {
      title: 'Temp renamed',
      body: 'Temp body renamed',
    });
    expect(updated.title).toBe('Temp renamed');
    expect(updated.body).toBe('Temp body renamed');

    await cannedResponseApi.remove(created.id);
    const after = await cannedResponseApi.list({ page: 1, pageSize: 100, filters: {} });
    expect(after.rows.some((row) => row.id === created.id)).toBe(false);
  });
});
