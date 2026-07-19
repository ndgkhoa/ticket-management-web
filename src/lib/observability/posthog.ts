import posthog, { type CaptureResult } from 'posthog-js';

import { sanitizePosthogProperties } from './pii-scrub';

/**
 * Initialise PostHog product analytics + session replay. Called only from the dynamically-
 * imported observability entry, so `posthog-js` never enters the main bundle or msw/test path.
 *
 * Masking is applied at BOTH layers because autocapture and session replay are separate
 * pipelines: `mask_all_text` / `mask_all_element_attributes` mask autocapture event payloads
 * (`$el_text`, attributes), while `session_recording.maskAllText` / `maskAllInputs` mask the
 * replay DOM. `before_send` is a final allowlist scrub for URL props and any element text that
 * slips through. Together these keep ticket subjects, customer names, search terms, and record
 * ids from leaving the client.
 */
export function initPostHog(key: string, host: string): void {
  posthog.init(key, {
    api_host: host,
    // Only create person profiles for identified users — no anon profiles for demo traffic.
    person_profiles: 'identified_only',
    // `true` captures the initial pageload ONLY; a client-side router needs 'history_change'
    // to emit a $pageview on each SPA navigation.
    capture_pageview: 'history_change',
    autocapture: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    // Don't ship network performance entries — their URLs carry PostgREST query filters.
    capture_performance: false,
    session_recording: {
      maskAllInputs: true,
      // Replay DOM text mask for this posthog-js version (no `maskAllText` field here); the
      // top-level `mask_all_text` above covers autocapture. The phase-4 masking guard verifies
      // no ticket text survives in either pipeline.
      maskTextSelector: '*',
      recordCrossOriginIframes: false,
    },
    before_send: (event) => {
      if (event?.properties) event.properties = sanitizePosthogProperties(event.properties);
      return event as CaptureResult;
    },
  });
}

/** Identify the signed-in user by id ONLY — never email or any other PII. */
export function identifyUser(id: string): void {
  posthog.identify(id);
}

/** Clear the identified user (sign-out). */
export function resetUser(): void {
  posthog.reset();
}
