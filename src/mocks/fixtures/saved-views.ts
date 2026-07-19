import { fixtureUuid } from './fixture-uuid';
import { demoUserByRole } from './people';
import type { SavedViewRow } from './row-types';

/**
 * A couple of shared saved views so the demo's "Shared views" section isn't empty on first
 * load — owned by staff other than the signed-in user, which is the case a single-user demo
 * can't produce on its own. Their `search` is a valid TicketSearch object (the shape the URL
 * carries), stored as jsonb.
 */
const SEED_CREATED_AT = '2025-11-05T09:00:00.000Z';

export const savedViewRows: SavedViewRow[] = [
  {
    id: fixtureUuid('savedView', 1),
    user_id: demoUserByRole.get('agent')!.id,
    name: 'Open tickets',
    search: { page: 1, pageSize: 20, sort: 'created_at', dir: 'desc', status: ['open'] },
    is_shared: true,
    created_at: SEED_CREATED_AT,
  },
  {
    id: fixtureUuid('savedView', 2),
    user_id: demoUserByRole.get('admin')!.id,
    name: 'Urgent & high priority',
    search: { page: 1, pageSize: 20, sort: 'priority', dir: 'desc', priority: ['urgent', 'high'] },
    is_shared: true,
    created_at: SEED_CREATED_AT,
  },
];
