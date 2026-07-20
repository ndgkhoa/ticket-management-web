import { createFileRoute } from '@tanstack/react-router';

import SignUp from '~/features/auth/pages/sign-up';

export const Route = createFileRoute('/auth/sign-up')({
  component: SignUp,
});
