import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

import SignIn from '~/features/auth/pages/sign-in';

/**
 * `/auth/sign-in`. `redirect` remembers where an unauthenticated user was headed so
 * the guard can return them there after login. Optional and free-form, so a missing
 * or malformed value just falls through to the default landing.
 */
const signInSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/auth/sign-in')({
  validateSearch: signInSearchSchema,
  component: SignIn,
});
