import { en, Faker } from '@faker-js/faker';

import { uuid } from './uuid';
import { customerUsers } from './people';
import {
  categoryRows,
  slaPolicyIdByPriority,
  tagRows,
  teamMemberRows,
  teamRows,
} from './organization';
import type {
  TicketChannel,
  TicketEventRow,
  TicketMessageRow,
  TicketPriority,
  TicketRow,
  TicketStatus,
  TicketTagRow,
} from './row-types';
import { AGENT_REPLIES, CUSTOMER_REPLIES, INTERNAL_NOTES, TICKET_CONTENT } from './ticket-content';
import type { TicketTopic } from './ticket-content';

const faker = new Faker({ locale: en });
faker.seed(2002);

export const TICKET_COUNT = 500;

const NOW = new Date('2026-07-16T00:00:00.000Z');
const CORPUS_DAYS = 180;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

const TEAM_BY_TOPIC: Record<TicketTopic, string> = {
  'Billing question': 'Billing',
  'Bug report': 'Technical',
  'Feature request': 'Technical',
  'Account access': 'Onboarding',
  'How-to': 'Onboarding',
};

const teamIdByName = new Map(teamRows.map((row) => [row.name, row.id]));
const agentIdsByTeamId = new Map<string, string[]>(
  teamRows.map((team) => [
    team.id,
    teamMemberRows.filter((row) => row.team_id === team.id).map((row) => row.user_id),
  ])
);

function weighted<T extends string>(entries: readonly (readonly [T, number])[]): T {
  return faker.helpers.weightedArrayElement(entries.map(([value, weight]) => ({ value, weight })));
}

const ticketRows: TicketRow[] = [];
const ticketTagRows: TicketTagRow[] = [];
const ticketMessageRows: TicketMessageRow[] = [];
const ticketEventRows: TicketEventRow[] = [];

let nextMessageIndex = 1;
let nextEventIndex = 1;

for (let index = 1; index <= TICKET_COUNT; index += 1) {
  const id = uuid('ticket', index);

  const ageDays = Math.floor(CORPUS_DAYS * faker.number.float({ min: 0, max: 1 }) ** 2);
  const createdAt = new Date(
    NOW.getTime() - ageDays * DAY_MS - faker.number.int({ min: 0, max: DAY_MS - 1 })
  );

  const status = weighted<TicketStatus>([
    ['open', 20],
    ['pending', 15],
    ['on_hold', 8],
    ['solved', 32],
    ['closed', 25],
  ]);
  const priority = weighted<TicketPriority>([
    ['low', 20],
    ['normal', 45],
    ['high', 25],
    ['urgent', 10],
  ]);

  const isTriaged = faker.datatype.boolean({ probability: 0.92 });
  const topic = faker.helpers.arrayElement(Object.keys(TICKET_CONTENT) as TicketTopic[]);
  const category = categoryRows.find((row) => row.name === topic)!;
  const teamId = isTriaged ? teamIdByName.get(TEAM_BY_TOPIC[topic])! : null;

  const teamAgentIds = teamId ? (agentIdsByTeamId.get(teamId) ?? []) : [];
  const assigneeId =
    teamId && status !== 'open'
      ? faker.helpers.arrayElement(teamAgentIds)
      : teamId && faker.datatype.boolean({ probability: 0.55 })
        ? faker.helpers.arrayElement(teamAgentIds)
        : null;

  const requesterId = faker.helpers.arrayElement(customerUsers).id;

  const content = TICKET_CONTENT[topic];
  const subject = faker.helpers
    .arrayElement(content.subjects)
    .replace('{{invoice}}', `INV-${faker.number.int({ min: 10_000, max: 99_999 })}`);
  const description = faker.helpers.arrayElement(content.bodies);

  const slaPolicyId = slaPolicyIdByPriority.get(priority) ?? null;

  const hasResponded = assigneeId !== null && (status !== 'open' || faker.datatype.boolean());
  const firstResponseAt = hasResponded
    ? new Date(createdAt.getTime() + faker.number.int({ min: 5, max: 600 }) * MINUTE_MS)
    : null;

  const isResolved = status === 'solved' || status === 'closed';
  const resolvedAt = isResolved
    ? new Date(
        (firstResponseAt ?? createdAt).getTime() +
          faker.number.int({ min: 30, max: 5 * 24 * 60 }) * MINUTE_MS
      )
    : null;

  const resolutionMins = { urgent: 4 * 60, high: 8 * 60, normal: 2 * 24 * 60, low: 5 * 24 * 60 }[
    priority
  ];
  const dueAt = new Date(createdAt.getTime() + resolutionMins * MINUTE_MS);

  const updatedAt = new Date(
    Math.max(createdAt.getTime(), firstResponseAt?.getTime() ?? 0, resolvedAt?.getTime() ?? 0)
  );

  ticketRows.push({
    id,
    subject,
    description,
    status,
    priority,
    channel: weighted<TicketChannel>([
      ['web', 60],
      ['email', 30],
      ['chat', 10],
    ]),
    requester_id: requesterId,
    assignee_id: assigneeId,
    team_id: teamId,
    category_id: isTriaged ? category.id : null,
    sla_policy_id: slaPolicyId,
    first_response_at: firstResponseAt?.toISOString() ?? null,
    resolved_at: resolvedAt?.toISOString() ?? null,
    due_at: dueAt.toISOString(),
    sla_paused_at: status === 'pending' || status === 'on_hold' ? createdAt.toISOString() : null,
    sla_paused_ms: 0,
    created_at: createdAt.toISOString(),
    updated_at: updatedAt.toISOString(),
  });

  for (const tag of faker.helpers.arrayElements(tagRows, { min: 0, max: 3 })) {
    ticketTagRows.push({ ticket_id: id, tag_id: tag.id });
  }

  ticketEventRows.push({
    id: uuid('ticketEvent', nextEventIndex++),
    ticket_id: id,
    actor_id: requesterId,
    event_type: 'created',
    meta: { channel: 'web' },
    created_at: createdAt.toISOString(),
  });

  if (assigneeId) {
    ticketEventRows.push({
      id: uuid('ticketEvent', nextEventIndex++),
      ticket_id: id,
      actor_id: assigneeId,
      event_type: 'assigned',
      meta: { assignee_id: assigneeId, team_id: teamId },
      created_at: new Date(createdAt.getTime() + 5 * MINUTE_MS).toISOString(),
    });
  }

  if (firstResponseAt && assigneeId) {
    ticketMessageRows.push({
      id: uuid('ticketMessage', nextMessageIndex++),
      ticket_id: id,
      author_id: assigneeId,
      type: 'public_reply',
      body: `<p>${faker.helpers.arrayElement(AGENT_REPLIES)}</p>`,
      created_at: firstResponseAt.toISOString(),
    });

    if (faker.datatype.boolean({ probability: 0.25 })) {
      ticketMessageRows.push({
        id: uuid('ticketMessage', nextMessageIndex++),
        ticket_id: id,
        author_id: assigneeId,
        type: 'internal_note',
        body: `<p>${faker.helpers.arrayElement(INTERNAL_NOTES)}</p>`,
        created_at: new Date(firstResponseAt.getTime() + 2 * MINUTE_MS).toISOString(),
      });
    }

    for (let reply = 0; reply < faker.number.int({ min: 0, max: 3 }); reply += 1) {
      const isCustomerTurn = reply % 2 === 0;
      ticketMessageRows.push({
        id: uuid('ticketMessage', nextMessageIndex++),
        ticket_id: id,
        author_id: isCustomerTurn ? requesterId : assigneeId,
        type: 'public_reply',
        body: `<p>${faker.helpers.arrayElement(isCustomerTurn ? CUSTOMER_REPLIES : AGENT_REPLIES)}</p>`,
        created_at: new Date(
          firstResponseAt.getTime() +
            (reply + 1) * faker.number.int({ min: 20, max: 720 }) * MINUTE_MS
        ).toISOString(),
      });
    }
  }

  if (resolvedAt && assigneeId) {
    ticketEventRows.push({
      id: uuid('ticketEvent', nextEventIndex++),
      ticket_id: id,
      actor_id: assigneeId,
      event_type: 'status_changed',
      meta: { from: 'open', to: status },
      created_at: resolvedAt.toISOString(),
    });
  }
}

export { ticketEventRows, ticketMessageRows, ticketRows, ticketTagRows };
