import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import SignIn from '~/features/auth/pages/sign-in';

const signInSearchSchema = z.object({
  redirect: z
    .string()
    .refine((value) => value.startsWith('/') && !value.startsWith('//'))
    .optional()
    .catch(undefined),
});

export const Route = createFileRoute('/auth/sign-in')({
  validateSearch: signInSearchSchema,
  component: SignIn,
});
