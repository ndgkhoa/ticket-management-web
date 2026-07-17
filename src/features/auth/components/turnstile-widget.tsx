import { Turnstile } from '@marsidev/react-turnstile';

import { env } from '~/config/env';
import { useTheme } from '~/components/theme-provider';

/**
 * Cloudflare Turnstile captcha for the auth forms. Renders nothing when
 * `VITE_TURNSTILE_SITE_KEY` is unset, so tests, the MSW demo and a fresh checkout run
 * without a Cloudflare account (and Supabase's captcha must then be off too). When set,
 * the widget produces a token the form passes to Supabase as `captchaToken`.
 */
export function TurnstileWidget({ onToken }: { onToken: (token: string | null) => void }) {
  const siteKey = env.VITE_TURNSTILE_SITE_KEY;
  const { theme } = useTheme();

  if (!siteKey) return null;

  // The widget is a fixed ~300px box (Cloudflare won't stretch it), so centre it rather
  // than leave it left-aligned against the full-width fields.
  return (
    <div className="flex justify-center">
      <Turnstile
        siteKey={siteKey}
        options={{ theme: theme === 'system' ? 'auto' : theme }}
        onSuccess={(token) => onToken(token)}
        onExpire={() => onToken(null)}
        onError={() => onToken(null)}
      />
    </div>
  );
}

/** Whether the captcha is active — the forms use it to require a token before submit. */
export const captchaEnabled = Boolean(env.VITE_TURNSTILE_SITE_KEY);
