import { beforeEach, describe, expect, it } from 'vitest';

import { useSavedViewsStore } from '~/stores/saved-views';
import type { TicketSearch } from '~/features/tickets/schemas/ticket-search-schema';

const search: TicketSearch = {
  page: 1,
  pageSize: 20,
  sort: 'created_at',
  dir: 'desc',
  status: ['open'],
};

describe('saved views store', () => {
  beforeEach(() => useSavedViewsStore.setState({ views: [] }));

  it('adds a named snapshot of the search', () => {
    useSavedViewsStore.getState().addView('My open', search);

    const [view] = useSavedViewsStore.getState().views;
    expect(view.name).toBe('My open');
    expect(view.search).toEqual(search);
    expect(view.id).toBeTruthy();
  });

  it('trims the name and removes by id', () => {
    useSavedViewsStore.getState().addView('  Spaced  ', search);
    const [view] = useSavedViewsStore.getState().views;
    expect(view.name).toBe('Spaced');

    useSavedViewsStore.getState().removeView(view.id);
    expect(useSavedViewsStore.getState().views).toHaveLength(0);
  });
});
