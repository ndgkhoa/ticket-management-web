import { describe, expect, it } from 'vitest';

import { categoryApi } from '~/features/admin/categories/api/category-api';
import { categoryRows } from '~/mocks/fixtures';

/**
 * The MSW write path end to end: the real feature API (supabase-js → PostgREST
 * POST/PATCH/DELETE) hits the mutable table store and the list reflects the change.
 * This is what lets the admin CRUD screens work in `msw` mode with no backend.
 *
 * Each test starts from the seeded fixtures — the test setup re-seeds the stores after
 * every test, so a create here can't leak into the next.
 */
describe('category CRUD over MSW', () => {
  it('lists the seeded categories', async () => {
    await expect(categoryApi.list()).resolves.toHaveLength(categoryRows.length);
  });

  it('creates a row and returns it, then the list includes it', async () => {
    const created = await categoryApi.create({ name: 'Escalations', description: 'Hot ones' });

    expect(created.id).toBeTruthy();
    expect(created.name).toBe('Escalations');

    const list = await categoryApi.list();
    expect(list).toHaveLength(categoryRows.length + 1);
    expect(list.some((row) => row.id === created.id)).toBe(true);
  });

  it('updates a row', async () => {
    const target = (await categoryApi.list())[0];

    const updated = await categoryApi.update(target.id, {
      name: 'Renamed',
      description: null,
    });

    expect(updated.id).toBe(target.id);
    expect(updated.name).toBe('Renamed');
    expect(updated.description).toBeNull();

    const reread = (await categoryApi.list()).find((row) => row.id === target.id);
    expect(reread?.name).toBe('Renamed');
  });

  it('deletes a row', async () => {
    const target = (await categoryApi.list())[0];

    await categoryApi.remove(target.id);

    const list = await categoryApi.list();
    expect(list).toHaveLength(categoryRows.length - 1);
    expect(list.some((row) => row.id === target.id)).toBe(false);
  });

  it('re-seeds between tests (no leak from the create/delete above)', async () => {
    await expect(categoryApi.list()).resolves.toHaveLength(categoryRows.length);
  });
});
