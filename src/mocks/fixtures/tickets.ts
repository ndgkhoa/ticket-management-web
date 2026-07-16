/**
 * The generated ticket corpus: tickets plus their tags, messages and events.
 *
 * ~500 tickets rather than the ~30 a demo needs to *look* populated. Pagination,
 * offset drift and search ranking only misbehave at volume — a 30-row seed makes
 * every page the first page, and a pagination bug that only appears on page 12 is
 * exactly the bug this data exists to catch.
 */

import { en, Faker } from '@faker-js/faker';

import { fixtureUuid } from './fixture-uuid';
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

/**
 * Fixed "now" for the corpus.
 *
 * Never `Date.now()`: a fixture that moves with the wall clock regenerates a
 * different seed.sql on every run, and any test asserting "3 tickets are overdue"
 * would pass today and fail tomorrow for no reason anyone can find.
 */
const NOW = new Date('2026-07-16T00:00:00.000Z');
const CORPUS_DAYS = 180;

const MINUTE_MS = 60_000;
const DAY_MS = 24 * 60 * MINUTE_MS;

/** Which team handles which category. Mirrors how a real desk routes on triage. */
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
  const id = fixtureUuid('ticket', index);

  // Skewed toward recent: a help desk's backlog is dense in the last fortnight and
  // thins out going back. A uniform spread would make every "last 7 days" filter
  // return a suspiciously round 4% of the corpus.
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

  // 8% arrive untriaged: no category, no team, no assignee. That is the state the
  // "unassigned queue" screen exists for, so the data has to contain it.
  const isTriaged = faker.datatype.boolean({ probability: 0.92 });
  const topic = faker.helpers.arrayElement(Object.keys(TICKET_CONTENT) as TicketTopic[]);
  const category = categoryRows.find((row) => row.name === topic)!;
  const teamId = isTriaged ? teamIdByName.get(TEAM_BY_TOPIC[topic])! : null;

  // An assignee is always drawn from the ticket's own team. Otherwise the agent RLS
  // policy ("assigned to me OR my team") would be satisfied by rows that make no
  // organisational sense, and the demo would show Billing agents holding Technical
  // tickets.
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

  // First response only exists once someone has actually replied — which is what
  // makes an unanswered `open` ticket breach its SLA. Tying it to "has an assignee"
  // would erase the breach case entirely.
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
    created_at: createdAt.toISOString(),
    updated_at: updatedAt.toISOString(),
  });

  for (const tag of faker.helpers.arrayElements(tagRows, { min: 0, max: 3 })) {
    ticketTagRows.push({ ticket_id: id, tag_id: tag.id });
  }

  ticketEventRows.push({
    id: fixtureUuid('ticketEvent', nextEventIndex++),
    ticket_id: id,
    actor_id: requesterId,
    event_type: 'created',
    meta: { channel: 'web' },
    created_at: createdAt.toISOString(),
  });

  if (assigneeId) {
    ticketEventRows.push({
      id: fixtureUuid('ticketEvent', nextEventIndex++),
      ticket_id: id,
      actor_id: assigneeId,
      event_type: 'assigned',
      meta: { assignee_id: assigneeId, team_id: teamId },
      created_at: new Date(createdAt.getTime() + 5 * MINUTE_MS).toISOString(),
    });
  }

  if (firstResponseAt && assigneeId) {
    ticketMessageRows.push({
      id: fixtureUuid('ticketMessage', nextMessageIndex++),
      ticket_id: id,
      author_id: assigneeId,
      type: 'public_reply',
      body: faker.helpers.arrayElement(AGENT_REPLIES),
      created_at: firstResponseAt.toISOString(),
    });

    // A quarter of worked tickets carry an internal note — the row a customer must
    // never see. Any RLS test worth running needs these to exist in bulk, not as a
    // single hand-placed row.
    if (faker.datatype.boolean({ probability: 0.25 })) {
      ticketMessageRows.push({
        id: fixtureUuid('ticketMessage', nextMessageIndex++),
        ticket_id: id,
        author_id: assigneeId,
        type: 'internal_note',
        body: faker.helpers.arrayElement(INTERNAL_NOTES),
        created_at: new Date(firstResponseAt.getTime() + 2 * MINUTE_MS).toISOString(),
      });
    }

    for (let reply = 0; reply < faker.number.int({ min: 0, max: 3 }); reply += 1) {
      const isCustomerTurn = reply % 2 === 0;
      ticketMessageRows.push({
        id: fixtureUuid('ticketMessage', nextMessageIndex++),
        ticket_id: id,
        author_id: isCustomerTurn ? requesterId : assigneeId,
        type: 'public_reply',
        body: faker.helpers.arrayElement(isCustomerTurn ? CUSTOMER_REPLIES : AGENT_REPLIES),
        created_at: new Date(
          firstResponseAt.getTime() +
            (reply + 1) * faker.number.int({ min: 20, max: 720 }) * MINUTE_MS
        ).toISOString(),
      });
    }
  }

  if (resolvedAt && assigneeId) {
    ticketEventRows.push({
      id: fixtureUuid('ticketEvent', nextEventIndex++),
      ticket_id: id,
      actor_id: assigneeId,
      event_type: 'status_changed',
      meta: { from: 'open', to: status },
      created_at: resolvedAt.toISOString(),
    });
  }
}

export { ticketEventRows, ticketMessageRows, ticketRows, ticketTagRows };
