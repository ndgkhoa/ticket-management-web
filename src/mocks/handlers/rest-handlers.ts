import {
  cannedResponseRows,
  categoryRows,
  permissionRows,
  roleRows,
  rolePermissionRows,
  slaPolicyRows,
  tagRows,
  teamRows,
  ticketRows,
  ticketTagRows,
  userRows,
} from '~/mocks/fixtures';
import { ticketListConfig } from '~/mocks/config/ticket-list-config';
import { profileListConfig } from '~/mocks/config/profile-list-config';
import { cannedResponseListConfig } from '~/mocks/config/canned-response-list-config';
import { makeTableHandler } from '~/mocks/handlers/make-table-handler';
import { makeJunctionHandler } from '~/mocks/handlers/make-junction-handler';
import { ticketStore } from '~/mocks/stores/ticket-store';

/**
 * PostgREST table handlers for every `/rest/v1/*` read the app makes today, plus writes
 * for the admin lookup tables.
 *
 * `tickets` carries a list config so its paginated + searchable list runs through the
 * parity-tested applier; the admin lookup tables are plain reads with full CRUD. Each
 * `makeTableHandler` returns the GET/POST/PATCH/DELETE set, flattened into one registry.
 */

// The `profiles` table is a profile, not the seed's auth+profile row — drop the seed-only
// password so it never rides the wire, even though the domain schema would strip it.
const profileRows = userRows.map(({ password: _password, ...profile }) => profile);

export const restHandlers = [
  makeTableHandler({
    table: 'tickets',
    rows: ticketRows,
    applyConfig: ticketListConfig,
    store: ticketStore,
  }),
  makeTableHandler({ table: 'profiles', rows: profileRows, applyConfig: profileListConfig }),
  makeTableHandler({ table: 'roles', rows: roleRows, writable: true }),
  makeTableHandler({ table: 'permissions', rows: permissionRows }),
  makeTableHandler({ table: 'teams', rows: teamRows, writable: true }),
  makeTableHandler({ table: 'categories', rows: categoryRows, writable: true }),
  makeTableHandler({ table: 'tags', rows: tagRows, writable: true }),
  makeTableHandler({ table: 'sla_policies', rows: slaPolicyRows, writable: true }),
  makeTableHandler({
    table: 'canned_responses',
    rows: cannedResponseRows,
    applyConfig: cannedResponseListConfig,
    writable: true,
  }),
  // Role→permission membership for the matrix editor (composite key, no id).
  makeJunctionHandler({ table: 'role_permissions', rows: rolePermissionRows }),
  // Ticket↔tag membership — read feeds the list's tag filter (resolves tags → ticket ids);
  // write surface is here for the detail tag editor.
  makeJunctionHandler({ table: 'ticket_tags', rows: ticketTagRows }),
].flat();
