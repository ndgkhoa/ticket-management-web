import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';

import { useAuthStore } from '~/stores/auth';
import { savedViewApi } from '~/features/tickets/api/saved-view-api';
import { savedViewRows } from '~/mocks/fixtures';
import type { TicketSearch } from '~/features/tickets/schemas/ticket-search-schema';

const USER_ID = '00000001-0000-4000-8000-0000000000aa';
const search: TicketSearch = {
  page: 1,
  pageSize: 20,
  sort: 'created_at',
  dir: 'desc',
  smart: false,
  triage: false,
  status: ['open'],
};

/**
 * Saved views CRUD over MSW: the feature api (supabase-js → PostgREST) against the writable
 * `saved_views` handler. The api reads the owner id from the auth store, so the store is
 * seeded with a user for the create path.
 */
describe('savedViewApi over MSW', () => {
  beforeEach(() => useAuthStore.setState({ user: { id: USER_ID } as User }));
  afterEach(() => useAuthStore.setState({ user: null }));

  it('lists the seeded shared views', async () => {
    const views = await savedViewApi.list();
    expect(views.length).toBeGreaterThanOrEqual(savedViewRows.length);
    expect(views.every((view) => view.isShared)).toBe(true);
  });

  it('creates a view owned by the current user and round-trips the search', async () => {
    const created = await savedViewApi.create({ name: 'My open', search, isShared: false });

    expect(created.userId).toBe(USER_ID);
    expect(created.name).toBe('My open');
    expect(created.isShared).toBe(false);
    expect(created.search.status).toEqual(['open']);

    const views = await savedViewApi.list();
    expect(views.some((view) => view.id === created.id)).toBe(true);
  });

  it('toggles sharing', async () => {
    const created = await savedViewApi.create({ name: 'Share me', search, isShared: false });

    const shared = await savedViewApi.setShared(created.id, true);
    expect(shared.isShared).toBe(true);
  });

  it('removes a view', async () => {
    const created = await savedViewApi.create({ name: 'Temp', search, isShared: false });

    await savedViewApi.remove(created.id);

    const views = await savedViewApi.list();
    expect(views.some((view) => view.id === created.id)).toBe(false);
  });
});
