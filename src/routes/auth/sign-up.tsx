import { createFileRoute } from '@tanstack/react-router';

import SignUp from '~/features/auth/pages/sign-up';

/** `/auth/sign-up`. The `/auth` layout's guard already bounces signed-in users away. */
export const Route = createFileRoute('/auth/sign-up')({
  component: SignUp,
});
