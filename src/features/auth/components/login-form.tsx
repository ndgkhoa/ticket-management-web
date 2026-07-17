import { z } from 'zod';
import { useState } from 'react';
import { toast } from 'sonner';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';

import { Button } from '~/components/ui/button';
import { FieldText, FieldPassword } from '~/components/form';
import { useSignIn } from '~/features/auth/api/use-sign-in';
import { GoogleButton } from '~/features/auth/components/google-button';
import { TurnstileWidget, captchaEnabled } from '~/features/auth/components/turnstile-widget';

export function LoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const { mutate: signIn, isPending } = useSignIn();
  // Where the guard sent them from, already validated to an internal path by the
  // sign-in route schema. `strict: false` reads it without pinning this component to
  // that one route, so it also renders in isolation (tests) where there is no match.
  const { redirect } = useSearch({ strict: false }) as { redirect?: string };

  const loginSchema = z.object({
    // min(1) first so an empty field reads "required"; a non-empty but malformed value
    // then falls through to the email-format message.
    email: z
      .string()
      .min(1, t('Validation.Required'))
      .pipe(z.email(t('Validation.Email'))),
    password: z.string().min(1, t('Validation.Required')),
  });

  const form = useForm({
    defaultValues: { email: '', password: '' },
    validators: { onSubmit: loginSchema },
    onSubmit: ({ value }) => {
      signIn(
        { ...value, captchaToken: captchaToken ?? undefined },
        {
          // Success sets no state here: the SDK emits SIGNED_IN and the auth store reacts
          // through onAuthStateChange. This component only navigates — back to where the
          // user was headed, or home.
          onSuccess: () => navigate({ to: redirect ?? '/' }),
          onError: () => toast.error(t('Validation.Mismatch')),
        }
      );
    },
  });

  return (
    <div className="space-y-4">
      <GoogleButton disabled={isPending} />

      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        <span className="bg-border h-px flex-1" />
        {t('Login.Or')}
        <span className="bg-border h-px flex-1" />
      </div>

      <form
        className="space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          event.stopPropagation();
          void form.handleSubmit();
        }}
      >
        <form.Field name="email">
          {(field) => (
            <FieldText
              field={field}
              label={t('Login.Email')}
              type="email"
              autoComplete="username"
              disabled={isPending}
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <FieldPassword
              field={field}
              label={t('Login.Password')}
              autoComplete="current-password"
              disabled={isPending}
            />
          )}
        </form.Field>
        <TurnstileWidget onToken={setCaptchaToken} />

        <Button
          type="submit"
          size="lg"
          disabled={isPending || (captchaEnabled && !captchaToken)}
          className="w-full"
        >
          {t('Common.Login')}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {t('Login.NoAccount')}{' '}
        <Link to="/auth/sign-up" className="text-primary font-medium hover:underline">
          {t('Common.Register')}
        </Link>
      </p>
    </div>
  );
}
