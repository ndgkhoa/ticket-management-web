import { en, Faker } from '@faker-js/faker';

import { uuid } from './uuid';
import type { RoleName } from './rbac';
import { roleIdByName } from './rbac';
import type { UserRoleRow, UserRow } from './row-types';

const faker = new Faker({ locale: en });
faker.seed(1001);

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
    avatar_url: faker.datatype.boolean({ probability: 0.66 }) ? faker.image.avatarGitHub() : null,
    created_at: createdAt.toISOString(),
  };
}

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

export const demoUserByRole = new Map<RoleName, UserRow>(
  DEMO_ACCOUNTS.map(([role], index) => [role, demoUsers[index]])
);

export const agentUsers: UserRow[] = [
  demoUserByRole.get('agent')!,
  demoUserByRole.get('admin')!,
  ...generatedAgents,
];

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
