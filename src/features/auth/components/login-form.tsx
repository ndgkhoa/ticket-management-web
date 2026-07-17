import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearch } from '@tanstack/react-router';

import { Button } from '~/components/ui/button';
import { FieldText } from '~/components/form';
import { useSignIn } from '~/features/auth/api/use-sign-in';

export function LoginForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();

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
      signIn(value, {
        // Success sets no state here: the SDK emits SIGNED_IN and the auth store reacts
        // through onAuthStateChange. This component only navigates — back to where the
        // user was headed, or home.
        onSuccess: () => navigate({ to: redirect ?? '/' }),
        onError: () => toast.error(t('Validation.Mismatch')),
      });
    },
  });

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        size="lg"
        disabled={isPending}
        className="w-full font-light"
        onClick={() => toast.info(t('App.FeatureComingSoon'))}
      >
        {/* Google 'G' brand mark, inlined for its single caller. Decorative — the button
            text labels the action; multicolour SVG stays crisp at any DPI. */}
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
        {t('Login.Google')}
      </Button>

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
            <FieldText
              field={field}
              label={t('Login.Password')}
              type="password"
              autoComplete="current-password"
              disabled={isPending}
            />
          )}
        </form.Field>
        <Button type="submit" size="lg" disabled={isPending} className="w-full">
          {t('Common.Login')}
        </Button>
      </form>
    </div>
  );
}
