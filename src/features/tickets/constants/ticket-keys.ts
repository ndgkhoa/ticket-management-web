import type { ListParams } from '~/lib/list-query';

/**
 * Query-key factory for tickets.
 *
 * The list params are PART of the key: each page/filter/sort/search combination is
 * its own cache entry. That is precisely what lets `placeholderData: keepPreviousData`
 * hold the previous page on screen while the next one loads — if every list shared one
 * key, there would be no "previous" entry to show.
 */
export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (params: ListParams) => [...ticketKeys.lists(), params] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  /** The assignable-agents roster (the assignee filter's options). */
  assignees: () => [...ticketKeys.all, 'assignees'] as const,
  /** A ticket's conversation and its audit trail, each keyed by ticket id. */
  messages: (ticketId: string) => [...ticketKeys.detail(ticketId), 'messages'] as const,
  events: (ticketId: string) => [...ticketKeys.detail(ticketId), 'events'] as const,
  tags: (ticketId: string) => [...ticketKeys.detail(ticketId), 'tags'] as const,
  attachments: (ticketId: string) => [...ticketKeys.detail(ticketId), 'attachments'] as const,
  /** Tickets semantically similar to a given one (detail sidebar). */
  similar: (ticketId: string) => [...ticketKeys.detail(ticketId), 'similar'] as const,
  /** Semantic ("smart") search results, keyed by the query text. */
  semantic: (query: string) => [...ticketKeys.all, 'semantic', query] as const,
};
