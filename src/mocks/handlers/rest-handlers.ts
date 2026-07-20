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

const profileRows = userRows.map(({ password: _password, ...profile }) => profile);

export const restHandlers = [
  makeTableHandler({
    table: 'tickets',
    rows: ticketRows,
    applyConfig: ticketListConfig,
    store: ticketStore,
    writable: true,
    realtime: true,
    stampInsert: (row) => stampTicketSlaOnInsert(routeTicketOnInsert(row)),
    stampUpdate: stampTicketSlaOnUpdate,
    afterInsert: emitTicketCreatedEvents,
    afterUpdate: emitTicketChangeEvents,
  }),
  makeTableHandler({
    table: 'ticket_messages',
    rows: ticketMessageRows,
    store: ticketMessageStore,
    writable: true,
    realtime: true,
    afterInsert: (message) => {
      stampFirstResponseOnMessage(message);
      emitCommentEvent(message);
      reopenOnCustomerReply(message);
    },
  }),
  makeTableHandler({ table: 'ticket_events', rows: ticketEventRows, store: ticketEventStore }),
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
  makeTableHandler({ table: 'saved_views', rows: savedViewRows, writable: true }),
  makeJunctionHandler({ table: 'role_permissions', rows: rolePermissionRows }),
  makeJunctionHandler<TicketTagRow>({
    table: 'ticket_tags',
    rows: ticketTagRows,
    afterInsert: (row) => emitTagEvent(row.ticket_id, row.tag_id, true),
    afterDelete: (row) => emitTagEvent(row.ticket_id, row.tag_id, false),
  }),
].flat();
