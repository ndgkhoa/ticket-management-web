import type { AttachmentRow, TicketTagRow } from '~/mocks/fixtures/row-types';
import {
  cannedResponseRows,
  categoryRows,
  permissionRows,
  roleRows,
  rolePermissionRows,
  savedViewRows,
  slaPolicyRows,
  tagRows,
  teamRows,
  ticketEventRows,
  ticketMessageRows,
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
import { ticketMessageStore } from '~/mocks/stores/ticket-message-store';
import { ticketEventStore } from '~/mocks/stores/ticket-event-store';
import {
  stampFirstResponseOnMessage,
  stampTicketSlaOnInsert,
  stampTicketSlaOnUpdate,
} from '~/mocks/lib/sla-stamp';
import { routeTicketOnInsert } from '~/mocks/lib/ticket-routing';
import { reopenOnCustomerReply } from '~/mocks/lib/ticket-lifecycle';
import {
  emitCommentEvent,
  emitTagEvent,
  emitTicketChangeEvents,
  emitTicketCreatedEvents,
} from '~/mocks/lib/ticket-audit';

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
    // Writable so the detail page can patch a single ticket (status/priority/assignment)
    // through the same shared store the list reads; realtime so other tabs see the change.
    writable: true,
    realtime: true,
    // Mirror the create triggers: auto-route team_id from the category, then stamp SLA
    // (due_at/sla_policy_id); resolved_at on solve.
    stampInsert: (row) => stampTicketSlaOnInsert(routeTicketOnInsert(row)),
    stampUpdate: stampTicketSlaOnUpdate,
    // Mirror the audit triggers: created (+ initial assignment) on insert, one event per
    // changed field on update. The client no longer writes ticket_events itself.
    afterInsert: emitTicketCreatedEvents,
    afterUpdate: emitTicketChangeEvents,
  }),
  // The ticket conversation and its audit trail — read by ticket_id, append-only inserts. The
  // conversation uses the shared store + realtime so a reply appears in another tab's timeline.
  makeTableHandler({
    table: 'ticket_messages',
    rows: ticketMessageRows,
    store: ticketMessageStore,
    writable: true,
    realtime: true,
    // Mirror the message triggers: first public agent reply stamps first_response_at, every
    // message logs a commented event, and a customer public reply reopens a solved ticket. The
    // commented event is emitted before the reopen's status_changed, matching the live triggers'
    // alphabetical firing order (ticket_messages_emit_comment before ...reopen...).
    afterInsert: (message) => {
      stampFirstResponseOnMessage(message);
      emitCommentEvent(message);
      reopenOnCustomerReply(message);
    },
  }),
  // Read-only: the audit trail is written by the triggers mirrored above, never by the client
  // (the DB revoked the client's insert). Shares the store the synthesis appends to.
  makeTableHandler({ table: 'ticket_events', rows: ticketEventRows, store: ticketEventStore }),
  // Attachments start empty — files are uploaded in-session (blob URLs in msw). Read by ticket.
  makeTableHandler<AttachmentRow>({ table: 'attachments', rows: [], writable: true }),
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
  // Saved views — full CRUD over a per-user store. The demo has no RLS, so the read
  // returns all rows; the menu shows only the caller's own plus shared ones by filtering
  // on `user_id`/`is_shared`, so another user's private view is never surfaced.
  makeTableHandler({ table: 'saved_views', rows: savedViewRows, writable: true }),
  // Role→permission membership for the matrix editor (composite key, no id).
  makeJunctionHandler({ table: 'role_permissions', rows: rolePermissionRows }),
  // Ticket↔tag membership — read feeds the list's tag filter (resolves tags → ticket ids);
  // write surface is here for the detail tag editor. Each add/remove emits a `tagged` event,
  // mirroring the junction trigger (the client no longer writes ticket_events).
  makeJunctionHandler<TicketTagRow>({
    table: 'ticket_tags',
    rows: ticketTagRows,
    afterInsert: (row) => emitTagEvent(row.ticket_id, row.tag_id, true),
    afterDelete: (row) => emitTagEvent(row.ticket_id, row.tag_id, false),
  }),
].flat();
