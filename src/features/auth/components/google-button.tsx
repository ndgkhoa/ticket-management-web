import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useNavigate } from '@tanstack/react-router';

import { env } from '~/config/env';
import { Button } from '~/components/ui/button';
import { authApi } from '~/features/auth/api/auth-api';
import { DEMO_LOGIN } from '~/features/auth/constants/demo-login';

/**
 * "Continue with Google" — shared by sign-in and sign-up. Against a live project it kicks
 * off the OAuth redirect; on success the browser leaves this page, so there's nothing to
 * handle but the error (e.g. the provider isn't configured yet).
 *
 * On mocks (the static demo) OAuth cannot run — it is a cross-origin full-page redirect a
 * Service Worker cannot intercept — so the button short-circuits to a demo sign-in and
 * navigates in, keeping the button functional without a real provider.
 */
export function GoogleButton({ disabled, label }: { disabled?: boolean; label?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleGoogle = async () => {
    if (env.VITE_API_MODE === 'msw') {
      const { error } = await authApi.signInWithPassword(DEMO_LOGIN.email, DEMO_LOGIN.password);
      if (error) toast.error(error.message);
      else await navigate({ to: '/' });
      return;
    }

    const { error } = await authApi.signInWithGoogle();
    if (error) toast.error(error.message);
  };

  return (
    <Button
      type="button"
      variant="outline"
      size="lg"
      disabled={disabled}
      className="w-full font-light"
      onClick={() => void handleGoogle()}
    >
      {/* Google 'G' brand mark. Decorative — the button text labels the action. */}
      <svg className="h-5 w-5" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
        <path
          fill="#EA4335"
          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
        />
        <path
          fill="#4285F4"
          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
        />
        <path
          fill="#FBBC05"
          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
        />
        <path
          fill="#34A853"
          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
        />
      </svg>
      {label ?? t('Login.Google')}
    </Button>
  );
}
