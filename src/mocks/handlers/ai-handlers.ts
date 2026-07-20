import { http, HttpResponse } from 'msw';

import { ticketStore } from '~/mocks/stores/ticket-store';
import { collectionResponse } from '~/mocks/lib/postgrest-response';

let lastSemanticQuery = '';

const EMBED_DIMENSIONS = 1536;

function keywordScore(text: string, terms: string[]): number {
  const haystack = text.toLowerCase();
  return terms.reduce((score, term) => (haystack.includes(term) ? score + 1 : score), 0);
}

const triage = http.post('*/functions/v1/ai-triage', async ({ request }) => {
  const { subject = '', categories = [] } = (await request.json().catch(() => ({}))) as {
    subject?: string;
    categories?: string[];
  };
  const priority = /urgent|crash|down|cannot|can't|broken/i.test(subject) ? 'high' : 'normal';
  return HttpResponse.json({
    priority,
    category: categories[0] ?? null,
    reason: 'Mocked triage suggestion (no AI provider in MSW mode).',
  });
});

const suggestReply = http.post('*/functions/v1/ai-suggest-reply', () =>
  HttpResponse.json({
    draft:
      'Thanks for reaching out. I understand the issue and I am looking into it now — ' +
      'I will follow up shortly with an update. (Mocked AI draft.)',
  })
);

const summarize = http.post('*/functions/v1/ai-summarize', () =>
  HttpResponse.json({
    summary: 'Mocked summary: the customer reported an issue and the agent is investigating.',
  })
);

const embedTicket = http.post('*/functions/v1/embed-ticket', () => HttpResponse.json({ ok: true }));

const embedQuery = http.post('*/functions/v1/embed-query', async ({ request }) => {
  const { query = '' } = (await request.json().catch(() => ({}))) as { query?: string };
  lastSemanticQuery = query;
  return HttpResponse.json({
    embedding: new Array(EMBED_DIMENSIONS).fill(0),
    dimensions: EMBED_DIMENSIONS,
  });
});

const matchTickets = http.post('*/rest/v1/rpc/match_tickets', async ({ request }) => {
  const { match_count = 20 } = (await request.json().catch(() => ({}))) as {
    match_count?: number;
  };
  const terms = lastSemanticQuery.toLowerCase().split(/\s+/).filter(Boolean);

  const scored = ticketStore
    .all()
    .map((ticket) => ({
      ticket,
      score: keywordScore(`${ticket.subject} ${ticket.description}`, terms),
    }))
    .filter((entry) => terms.length === 0 || entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, match_count);

  const rows = scored.map((entry, index) => ({
    ...entry.ticket,
    similarity: Math.max(0.3, 0.95 - index * 0.03),
  }));
  return collectionResponse(rows);
});

const similarTickets = http.post('*/rest/v1/rpc/similar_tickets', async ({ request }) => {
  const { p_ticket_id, match_count = 5 } = (await request.json().catch(() => ({}))) as {
    p_ticket_id?: string;
    match_count?: number;
  };
  const source = ticketStore.all().find((ticket) => ticket.id === p_ticket_id);

  const rows = ticketStore
    .all()
    .filter(
      (ticket) =>
        ticket.id !== p_ticket_id &&
        (!source?.category_id || ticket.category_id === source.category_id)
    )
    .slice(0, match_count)
    .map((ticket, index) => ({ ...ticket, similarity: Math.max(0.3, 0.9 - index * 0.05) }));
  return collectionResponse(rows);
});

export const aiHandlers = [
  triage,
  suggestReply,
  summarize,
  embedTicket,
  embedQuery,
  matchTickets,
  similarTickets,
];
