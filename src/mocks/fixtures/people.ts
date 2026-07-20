/**
 * Users: the four demo accounts, plus enough generated staff and customers that
 * ticket data has real variety (assignee filters, requester columns, avatars).
 *
 * Each fixture module owns a private, seeded Faker instance rather than sharing the
 * package-level singleton. With a shared instance the output depends on module
 * *import order*, so adding an import somewhere unrelated silently reshuffles every
 * generated row — and a "deterministic" fixture that isn't is worse than an openly
 * random one, because the seed diff shows up in an unrelated PR.
 */

import { en, Faker } from '@faker-js/faker';

import { uuid } from './uuid';
import type { RoleName } from './rbac';
import { roleIdByName } from './rbac';
import type { UserRoleRow, UserRow } from './row-types';

const faker = new Faker({ locale: en });
faker.seed(1001);

/**
 * Shared password for every seeded account.
 *
 * Safe because this only ever exists in a local Docker database and a public demo
 * seeded with fabricated tickets — there is nothing here to protect. It must never
 * become the password of an account holding real data; the day this schema stores
 * anything real, the seed stops running against it.
 */
export const DEMO_PASSWORD = 'password123';

const DEMO_ACCOUNTS = [
  ['owner', 'owner@example.com', 'Ophelia Vance'],
  ['admin', 'admin@example.com', 'Adrian Cole'],
  ['agent', 'agent@example.com', 'Aiko Tanaka'],
  ['customer', 'customer@example.com', 'Chris Mahoney'],
] as const satisfies readonly (readonly [RoleName, string, string])[];

const EXTRA_AGENT_COUNT = 8;
const EXTRA_CUSTOMER_COUNT = 40;

let nextUserIndex = 1;

function createUser(email: string, fullName: string, createdAt: Date): UserRow {
  return {
    id: uuid('user', nextUserIndex++),
    email,
    password: DEMO_PASSWORD,
    full_name: fullName,
    // A third have no avatar: the fallback initials path is part of the UI and
    // needs to be exercised by the demo, not discovered in production.
    avatar_url: faker.datatype.boolean({ probability: 0.66 }) ? faker.image.avatarGitHub() : null,
    created_at: createdAt.toISOString(),
  };
}

// Everyone predates the oldest ticket (180 days), so no ticket is ever authored by
// an account that did not exist yet.
const ACCOUNT_CREATED_AT = new Date('2025-11-01T08:00:00.000Z');

const demoUsers: UserRow[] = DEMO_ACCOUNTS.map(([, email, fullName]) =>
  createUser(email, fullName, ACCOUNT_CREATED_AT)
);

function createGeneratedUsers(count: number, emailDomain: string): UserRow[] {
  return Array.from({ length: count }, () => {
    const fullName = faker.person.fullName();
    const email = faker.internet
      .email({
        firstName: fullName.split(' ')[0],
        lastName: fullName.split(' ').at(-1),
        provider: emailDomain,
      })
      .toLowerCase();

    return createUser(email, fullName, ACCOUNT_CREATED_AT);
  });
}

const generatedAgents = createGeneratedUsers(EXTRA_AGENT_COUNT, 'helpdesk.demo');
const generatedCustomers = createGeneratedUsers(EXTRA_CUSTOMER_COUNT, 'example.com');

export const userRows: UserRow[] = [...demoUsers, ...generatedAgents, ...generatedCustomers];

/** Demo accounts by role — the sign-in screen lists these for the live demo. */
export const demoUserByRole = new Map<RoleName, UserRow>(
  DEMO_ACCOUNTS.map(([role], index) => [role, demoUsers[index]])
);

/** Everyone who can be assigned a ticket: the agent-capable staff. */
export const agentUsers: UserRow[] = [
  demoUserByRole.get('agent')!,
  demoUserByRole.get('admin')!,
  ...generatedAgents,
];

/** Everyone who can open a ticket as a requester. */
export const customerUsers: UserRow[] = [demoUserByRole.get('customer')!, ...generatedCustomers];

export const userRoleRows: UserRoleRow[] = [
  ...DEMO_ACCOUNTS.map(([role], index) => ({
    user_id: demoUsers[index].id,
    role_id: roleIdByName.get(role)!,
  })),
  ...generatedAgents.map((user) => ({
    user_id: user.id,
    role_id: roleIdByName.get('agent')!,
  })),
  ...generatedCustomers.map((user) => ({
    user_id: user.id,
    role_id: roleIdByName.get('customer')!,
  })),
];
