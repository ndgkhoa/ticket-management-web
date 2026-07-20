import { describe, expect, it } from 'vitest';

import {
  normalizePath,
  normalizeUrl,
  sanitizePosthogProperties,
  scrubSentryBreadcrumb,
  scrubSentryEvent,
} from './pii-scrub';

describe('normalizePath', () => {
  it('replaces UUID and long-numeric segments with :id, keeps the rest', () => {
    expect(normalizePath('/tickets/6f2a1b3c-1111-2222-3333-444455556666')).toBe('/tickets/:id');
    expect(normalizePath('/tickets/1200456/messages')).toBe('/tickets/:id/messages');
    expect(normalizePath('/tickets/new')).toBe('/tickets/new');
  });
});

describe('normalizeUrl', () => {
  it('drops the query string (search term / PostgREST filters) and normalizes path ids', () => {
    const raw = 'https://x.supabase.co/rest/v1/tickets?or=(subject.ilike.*acme%20corp*)&id=eq.abc';
    expect(normalizeUrl(raw)).toBe('https://x.supabase.co/rest/v1/tickets');
  });

  it('keeps origin, normalizes the record id in the path', () => {
    expect(
      normalizeUrl('https://app.example.com/tickets/6f2a1b3c-1111-2222-3333-444455556666')
    ).toBe('https://app.example.com/tickets/:id');
  });
});

describe('scrubSentryEvent', () => {
  it('normalizes request.url, drops query_string and extra', () => {
    const event = scrubSentryEvent({
      request: {
        url: 'https://app.example.com/tickets/1200456?q=refund',
        query_string: 'q=refund',
      },
      extra: { ticketSubject: 'Refund for John Smith, 42 Elm St' },
    });
    expect(event.request?.url).toBe('https://app.example.com/tickets/:id');
    expect(event.request?.query_string).toBeUndefined();
    expect(event.extra).toBeUndefined();
  });
});

describe('scrubSentryBreadcrumb', () => {
  it('normalizes fetch/xhr breadcrumb URLs carrying query filters', () => {
    const crumb = scrubSentryBreadcrumb({
      category: 'fetch',
      data: { url: 'https://x.supabase.co/rest/v1/tickets?or=(subject.ilike.*secret*)' },
    });
    expect(crumb.data?.url).toBe('https://x.supabase.co/rest/v1/tickets');
  });

  it('drops the ui.click selector message (may embed aria-label/title customer names)', () => {
    const crumb = scrubSentryBreadcrumb({
      category: 'ui.click',
      message: 'button[aria-label="Reply to Jane Doe"]',
    });
    expect(crumb.message).toBeUndefined();
  });
});

describe('sanitizePosthogProperties', () => {
  it('strips autocapture element text (ticket subject / customer name)', () => {
    const props = sanitizePosthogProperties({
      $el_text: 'Refund request from Jane Doe',
      $elements: [
        { tag_name: 'a', $el_text: 'Cannot log in — acme corp', text: 'Cannot log in — acme corp' },
      ],
      event: 'clicked',
    });
    expect(props.$el_text).toBeUndefined();
    const elements = props.$elements as Array<Record<string, unknown>>;
    expect(elements[0].$el_text).toBeUndefined();
    expect(elements[0].text).toBeUndefined();
    expect(elements[0].tag_name).toBe('a');
    expect(props.event).toBe('clicked');
  });

  it('normalizes $current_url path id and drops its query string', () => {
    const props = sanitizePosthogProperties({
      $current_url:
        'https://app.example.com/tickets/6f2a1b3c-1111-2222-3333-444455556666?tab=notes',
    });
    expect(props.$current_url).toBe('https://app.example.com/tickets/:id');
  });

  it('drops the flattened $elements_chain selector string', () => {
    const props = sanitizePosthogProperties({
      $elements_chain: 'a:text="Cannot log in — acme corp"',
    });
    expect(props.$elements_chain).toBeUndefined();
  });

  it('does not mutate the input object', () => {
    const input = { $el_text: 'sensitive' };
    sanitizePosthogProperties(input);
    expect(input.$el_text).toBe('sensitive');
  });
});
