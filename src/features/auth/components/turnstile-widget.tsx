import { Turnstile } from '@marsidev/react-turnstile';

import { env } from '~/config/env';
import { useTheme } from '~/components/theme-provider';

export function TurnstileWidget({ onToken }: { onToken: (token: string | null) => void }) {
  const siteKey = captchaEnabled ? env.VITE_TURNSTILE_SITE_KEY : undefined;
  const { theme } = useTheme();

  if (!siteKey) return null;

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

export const captchaEnabled = env.VITE_API_MODE !== 'msw' && Boolean(env.VITE_TURNSTILE_SITE_KEY);
