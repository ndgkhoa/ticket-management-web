import { z } from 'zod';
import { toast } from 'sonner';
import { useForm } from '@tanstack/react-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from '@tanstack/react-router';

import { Button } from '~/components/ui/button';
import { FieldText, FieldPassword } from '~/components/form';
import { useSignUp } from '~/features/auth/api/use-sign-up';
import { GoogleButton } from '~/features/auth/components/google-button';

export function SignUpForm() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { mutate: signUp, isPending } = useSignUp();

  const signUpSchema = z
    .object({
      fullName: z.string().min(1, t('Validation.Required')),
      email: z
        .string()
        .min(1, t('Validation.Required'))
        .pipe(z.email(t('Validation.Email'))),
      password: z.string().min(8, t('Validation.PasswordMin')),
      confirmPassword: z.string().min(1, t('Validation.Required')),
    })
    // The match check reports on `confirmPassword` so the error lands under that field.
    .refine((values) => values.password === values.confirmPassword, {
      message: t('Validation.PasswordMismatch'),
      path: ['confirmPassword'],
    });

  const form = useForm({
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
    validators: { onSubmit: signUpSchema },
    onSubmit: ({ value }) => {
      signUp(
        { fullName: value.fullName, email: value.email, password: value.password },
        {
          onSuccess: (data) => {
            // A session means the project auto-confirms email — the store picks up
            // SIGNED_IN and we land in the app. Otherwise the user must confirm first.
            if (data.session) {
              void navigate({ to: '/' });
            } else {
              toast.success(t('Login.CheckEmail'));
              void navigate({ to: '/auth/sign-in' });
            }
          },
          onError: (error) => toast.error(error.message),
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
        <form.Field name="fullName">
          {(field) => (
            <FieldText
              field={field}
              label={t('Fields.FullName')}
              autoComplete="name"
              disabled={isPending}
            />
          )}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <FieldText
              field={field}
              label={t('Login.Email')}
              type="email"
              autoComplete="email"
              disabled={isPending}
            />
          )}
        </form.Field>
        <form.Field name="password">
          {(field) => (
            <FieldPassword
              field={field}
              label={t('Login.Password')}
              autoComplete="new-password"
              disabled={isPending}
            />
          )}
        </form.Field>
        <form.Field name="confirmPassword">
          {(field) => (
            <FieldPassword
              field={field}
              label={t('Login.ConfirmPassword')}
              autoComplete="new-password"
              disabled={isPending}
            />
          )}
        </form.Field>
        <Button type="submit" size="lg" disabled={isPending} className="w-full">
          {t('Common.Register')}
        </Button>
      </form>

      <p className="text-muted-foreground text-center text-sm">
        {t('Login.HaveAccount')}{' '}
        <Link to="/auth/sign-in" className="text-primary font-medium hover:underline">
          {t('Common.Login')}
        </Link>
      </p>
    </div>
  );
}
