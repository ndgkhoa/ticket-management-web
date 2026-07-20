import type { ListParams } from '~/lib/list-query';

export const ticketKeys = {
  all: ['tickets'] as const,
  lists: () => [...ticketKeys.all, 'list'] as const,
  list: (params: ListParams) => [...ticketKeys.lists(), params] as const,
  details: () => [...ticketKeys.all, 'detail'] as const,
  detail: (id: string) => [...ticketKeys.details(), id] as const,
  assignees: () => [...ticketKeys.all, 'assignees'] as const,
  messages: (ticketId: string) => [...ticketKeys.detail(ticketId), 'messages'] as const,
  events: (ticketId: string) => [...ticketKeys.detail(ticketId), 'events'] as const,
  tags: (ticketId: string) => [...ticketKeys.detail(ticketId), 'tags'] as const,
  attachments: (ticketId: string) => [...ticketKeys.detail(ticketId), 'attachments'] as const,
  similar: (ticketId: string) => [...ticketKeys.detail(ticketId), 'similar'] as const,
  semantic: (query: string) => [...ticketKeys.all, 'semantic', query] as const,
};
