import {
  categoryRows,
  permissionRows,
  roleRows,
  slaPolicyRows,
  tagRows,
  teamRows,
  ticketRows,
  userRows,
} from '~/mocks/fixtures';
import { ticketListConfig } from '~/mocks/config/ticket-list-config';
import { makeTableHandler } from '~/mocks/handlers/make-table-handler';

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
  makeTableHandler({ table: 'tickets', rows: ticketRows, applyConfig: ticketListConfig }),
  makeTableHandler({ table: 'profiles', rows: profileRows }),
  makeTableHandler({ table: 'roles', rows: roleRows }),
  makeTableHandler({ table: 'permissions', rows: permissionRows }),
  makeTableHandler({ table: 'teams', rows: teamRows, writable: true }),
  makeTableHandler({ table: 'categories', rows: categoryRows, writable: true }),
  makeTableHandler({ table: 'tags', rows: tagRows, writable: true }),
  makeTableHandler({ table: 'sla_policies', rows: slaPolicyRows, writable: true }),
].flat();
