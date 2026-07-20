import { uuid } from './uuid';
import { demoUserByRole } from './people';
import type { SavedViewRow } from './row-types';

const SEED_CREATED_AT = '2025-11-05T09:00:00.000Z';

export const savedViewRows: SavedViewRow[] = [
  {
    id: uuid('savedView', 1),
    user_id: demoUserByRole.get('agent')!.id,
    name: 'Open tickets',
    search: { page: 1, pageSize: 20, sort: 'created_at', dir: 'desc', status: ['open'] },
    is_shared: true,
    created_at: SEED_CREATED_AT,
  },
  {
    id: uuid('savedView', 2),
    user_id: demoUserByRole.get('admin')!.id,
    name: 'Urgent & high priority',
    search: { page: 1, pageSize: 20, sort: 'priority', dir: 'desc', priority: ['urgent', 'high'] },
    is_shared: true,
    created_at: SEED_CREATED_AT,
  },
];
