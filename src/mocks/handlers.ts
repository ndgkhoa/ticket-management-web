import type { RequestHandler } from 'msw';

import { authHandlers } from '~/mocks/handlers/auth-handlers';
import { userRolesHandlers } from '~/mocks/handlers/user-roles-handlers';
import { rpcHandlers } from '~/mocks/handlers/rpc-handlers';
import { dashboardHandlers } from '~/mocks/handlers/dashboard-handlers';
import { aiHandlers } from '~/mocks/handlers/ai-handlers';
import { teamMembersHandlers } from '~/mocks/handlers/team-members-handlers';
import { restHandlers } from '~/mocks/handlers/rest-handlers';

export const handlers: RequestHandler[] = [
  ...authHandlers,
  ...userRolesHandlers,
  ...rpcHandlers,
  ...dashboardHandlers,
  ...aiHandlers,
  ...teamMembersHandlers,
  ...restHandlers,
];
