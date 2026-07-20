export const FIXTURE_NAMESPACE = {
  user: 1,
  role: 2,
  permission: 3,
  team: 4,
  category: 5,
  tag: 6,
  slaPolicy: 7,
  cannedResponse: 8,
  ticket: 9,
  ticketMessage: 10,
  ticketEvent: 11,
  savedView: 12,
} as const;

export type FixtureNamespace = keyof typeof FIXTURE_NAMESPACE;

export function uuid(namespace: FixtureNamespace, index: number): string {
  const namespaceBlock = FIXTURE_NAMESPACE[namespace].toString(16).padStart(8, '0');
  const indexBlock = index.toString(16).padStart(12, '0');

  return `${namespaceBlock}-0000-4000-8000-${indexBlock}`;
}
