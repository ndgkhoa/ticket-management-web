import { describe, expect, it } from 'vitest';

import { triageTicketApi } from '~/features/tickets/api/triage-ticket';
import { suggestReplyApi } from '~/features/tickets/api/suggest-reply';
import { summarizeTicketApi } from '~/features/tickets/api/summarize-ticket';
import { semanticSearchApi } from '~/features/tickets/api/semantic-search';
import { ticketRows } from '~/mocks/fixtures';

/**
 * AI features over MSW: the edge-function calls and the semantic-search RPCs against the
 * mocked handlers, so this runs with no Gemini key. It exercises the client contract —
 * request shape in, Zod-validated result out — not the model itself.
 */
describe('AI features over MSW', () => {
  it('triages a ticket into a priority and echoes a category choice', async () => {
    const result = await triageTicketApi.suggest({
      subject: 'App crash on login',
      description: 'It crashes every time',
      categories: ['Bug report', 'Billing question'],
    });

    expect(['low', 'normal', 'high', 'urgent']).toContain(result.priority);
    expect(result.category).toBe('Bug report');
    expect(result.reason).toBeTruthy();
  });

  it('drafts a reply from the thread', async () => {
    const result = await suggestReplyApi.draft({
      subject: 'Refund request',
      messages: [{ type: 'public_reply', body: 'I want a refund', author: 'Customer' }],
    });

    expect(result.draft.length).toBeGreaterThan(0);
  });

  it('summarizes a thread', async () => {
    const result = await summarizeTicketApi.summarize({
      subject: 'Refund request',
      messages: [{ type: 'public_reply', body: 'I want a refund', author: 'Customer' }],
    });

    expect(result.summary.length).toBeGreaterThan(0);
  });

  it('returns ranked matches for a semantic search', async () => {
    // A term taken from a real seeded ticket, so the keyword-backed mock has a hit.
    const term = ticketRows[0].subject.split(/\s+/)[0];

    const matches = await semanticSearchApi.search(term);

    expect(matches.length).toBeGreaterThan(0);
    for (const match of matches) {
      expect(typeof match.similarity).toBe('number');
      expect(match.id).toBeTruthy();
    }
    // Ranked by descending similarity.
    const sims = matches.map((match) => match.similarity);
    expect([...sims].sort((a, b) => b - a)).toEqual(sims);
  });

  it('finds similar tickets for a given ticket, excluding itself', async () => {
    const target = ticketRows[0];

    const matches = await semanticSearchApi.similar(target.id);

    expect(matches.every((match) => match.id !== target.id)).toBe(true);
    for (const match of matches) {
      expect(typeof match.similarity).toBe('number');
    }
  });
});
