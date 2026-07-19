/**
 * Teams, categories, tags, SLA policies and canned responses.
 *
 * All hand-written rather than generated: these are the labels a reviewer reads on
 * every screen, and `faker.company.buzzPhrase()` produces the kind of nonsense that
 * makes a demo look unfinished. Volume lives in the tickets fixture; this is the
 * vocabulary it draws from.
 */

import { fixtureUuid } from './fixture-uuid';
import { agentUsers, demoUserByRole } from './people';
import type {
  CannedResponseRow,
  CategoryRow,
  SlaPolicyRow,
  TagRow,
  TeamMemberRow,
  TeamRow,
} from './row-types';

const TEAM_DEFINITIONS = [
  ['Billing', 'Invoices, refunds, plan changes and payment failures'],
  ['Technical', 'Bugs, outages, integrations and API questions'],
  ['Onboarding', 'Account setup, migrations and training requests'],
] as const;

export const teamRows: TeamRow[] = TEAM_DEFINITIONS.map(([name, description], index) => ({
  id: fixtureUuid('team', index + 1),
  name,
  description,
}));

/**
 * Round-robin the agents across teams, with the demo agent pinned to Billing.
 *
 * Pinned deliberately: the whole point of the demo agent is showing that an agent
 * sees their team's tickets and not the rest, so which team they are in cannot be
 * an accident of list order. Every third agent joins a second team — an agent in
 * exactly one team would leave the multi-team branch of the RLS policy untested.
 */
export const teamMemberRows: TeamMemberRow[] = agentUsers.flatMap((user, index) => {
  const primaryTeam = teamRows[index % teamRows.length];
  const memberships: TeamMemberRow[] = [{ team_id: primaryTeam.id, user_id: user.id }];

  if (index % 3 === 0) {
    const secondaryTeam = teamRows[(index + 1) % teamRows.length];
    memberships.push({ team_id: secondaryTeam.id, user_id: user.id });
  }

  return memberships;
});

const demoAgentId = demoUserByRole.get('agent')!.id;
const billingTeamId = teamRows[0].id;

if (!teamMemberRows.some((row) => row.user_id === demoAgentId && row.team_id === billingTeamId)) {
  teamMemberRows.push({ team_id: billingTeamId, user_id: demoAgentId });
}

// [name, description, default team name] — the default team is what a ticket in this
// category auto-routes to on create (Phase 02 routing), mirrored from the topic→team map
// the ticket corpus already uses.
const CATEGORY_DEFINITIONS = [
  ['Billing question', 'Anything about an invoice, charge or refund', 'Billing'],
  ['Bug report', 'Something is broken or behaving incorrectly', 'Technical'],
  ['Feature request', 'A capability the product does not have yet', 'Technical'],
  ['Account access', 'Sign-in, passwords, SSO and permissions', 'Onboarding'],
  ['How-to', 'The product does this, the customer needs to know how', 'Onboarding'],
] as const;

const teamIdByName = new Map(teamRows.map((team) => [team.name, team.id]));

export const categoryRows: CategoryRow[] = CATEGORY_DEFINITIONS.map(
  ([name, description, defaultTeamName], index) => ({
    id: fixtureUuid('category', index + 1),
    name,
    description,
    default_team_id: teamIdByName.get(defaultTeamName) ?? null,
  })
);

const TAG_DEFINITIONS = [
  ['vip', '#b91c1c'],
  ['refund', '#c2410c'],
  ['escalated', '#a21caf'],
  ['regression', '#7c3aed'],
  ['integration', '#1d4ed8'],
  ['mobile', '#0f766e'],
  ['documentation', '#4d7c0f'],
  ['duplicate', '#64748b'],
] as const;

export const tagRows: TagRow[] = TAG_DEFINITIONS.map(([name, color], index) => ({
  id: fixtureUuid('tag', index + 1),
  name,
  color,
}));

/**
 * One policy per priority — matching the unique constraint on `sla_policies.priority`,
 * which is what lets a ticket resolve its policy from its priority alone.
 */
export const slaPolicyRows: SlaPolicyRow[] = [
  {
    id: fixtureUuid('slaPolicy', 1),
    name: 'Urgent — 15m / 4h',
    priority: 'urgent',
    first_response_mins: 15,
    resolution_mins: 4 * 60,
  },
  {
    id: fixtureUuid('slaPolicy', 2),
    name: 'High — 1h / 8h',
    priority: 'high',
    first_response_mins: 60,
    resolution_mins: 8 * 60,
  },
  {
    id: fixtureUuid('slaPolicy', 3),
    name: 'Normal — 4h / 2 business days',
    priority: 'normal',
    first_response_mins: 4 * 60,
    resolution_mins: 2 * 24 * 60,
  },
  {
    id: fixtureUuid('slaPolicy', 4),
    name: 'Low — 1 day / 5 business days',
    priority: 'low',
    first_response_mins: 24 * 60,
    resolution_mins: 5 * 24 * 60,
  },
];

export const slaPolicyIdByPriority = new Map(slaPolicyRows.map((row) => [row.priority, row.id]));

const CANNED_RESPONSE_DEFINITIONS = [
  [
    'Acknowledge and set expectations',
    "Thanks for getting in touch — I can see the issue and I'm looking into it now. I'll come back to you with an update within the next few hours, and sooner if I find the cause before then.",
  ],
  [
    'Request more detail',
    'To dig into this I need a little more: which account is affected, roughly when you first noticed it, and what you were doing at the time. A screenshot of the error helps if you have one.',
  ],
  [
    'Refund issued',
    "I've issued the refund. It's back on the original payment method and typically lands within 5–10 business days, depending on your bank. You'll see it as a credit rather than a reversal of the original charge.",
  ],
  [
    'Escalating to engineering',
    "This one is a genuine bug, so I've raised it with our engineering team and attached everything you sent. I'll keep this ticket open and update you as it moves — you don't need to chase.",
  ],
  [
    'Closing after silence',
    "I haven't heard back, so I'm closing this for now. That's not a problem at all — just reply here if it's still happening and the ticket reopens with all the context intact.",
  ],
] as const;

export const cannedResponseRows: CannedResponseRow[] = CANNED_RESPONSE_DEFINITIONS.map(
  ([title, body], index) => ({
    id: fixtureUuid('cannedResponse', index + 1),
    title,
    body,
    created_by: demoUserByRole.get('admin')!.id,
    created_at: '2025-11-02T09:00:00.000Z',
  })
);
