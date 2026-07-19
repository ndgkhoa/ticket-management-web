import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import SignIn from '~/features/auth/pages/sign-in';

/**
 * `/auth/sign-in`. `redirect` remembers where an unauthenticated user was headed so
 * the login form can return them there.
 *
 * Constrained to an internal absolute path — starts with a single `/`, never `//`
 * (which browsers read as protocol-relative, e.g. `//evil.com`). Anything else falls
 * back to `undefined` and the default landing, closing the open-redirect an unchecked
 * value would open.
 */
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
