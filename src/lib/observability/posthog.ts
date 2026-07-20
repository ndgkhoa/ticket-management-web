import posthog, { type CaptureResult } from 'posthog-js';

import { sanitizePosthogProperties } from './pii-scrub';

export function initPostHog(key: string, host: string): void {
  posthog.init(key, {
    api_host: host,
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    autocapture: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    capture_performance: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '*',
      recordCrossOriginIframes: false,
    },
    before_send: (event) => {
      if (event?.properties) event.properties = sanitizePosthogProperties(event.properties);
      return event as CaptureResult;
    },
  });
}

export function identifyUser(id: string): void {
  posthog.identify(id);
}

export function resetUser(): void {
  posthog.reset();
}
