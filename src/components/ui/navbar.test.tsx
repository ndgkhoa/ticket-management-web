import { afterEach, describe, expect, it } from 'vitest';
import type { User } from '@supabase/supabase-js';

import { render, screen } from '~/testing/render';
import { useAuthStore } from '~/stores/auth';
import { Navbar } from '~/components/ui/navbar';

describe('Navbar account menu', () => {
  afterEach(() => useAuthStore.setState({ user: null, permissions: new Set(), status: 'loading' }));

  it('shows the signed-in user name and email', async () => {
    useAuthStore.setState({
      user: {
        id: 'u1',
        email: 'agent@example.com',
        user_metadata: { full_name: 'Aiko Tanaka', avatar_url: 'https://example.com/a.png' },
      } as unknown as User,
      status: 'authenticated',
    });

    const { user } = await render(<Navbar />);
    await user.click(await screen.findByRole('button', { name: 'Account menu' }));

    expect(await screen.findByText('Aiko Tanaka')).toBeInTheDocument();
    expect(screen.getByText('agent@example.com')).toBeInTheDocument();
  });

  it('falls back to the email when the user has no full name', async () => {
    useAuthStore.setState({
      user: { id: 'u2', email: 'no-name@example.com', user_metadata: {} } as unknown as User,
      status: 'authenticated',
    });

    const { user } = await render(<Navbar />);
    await user.click(await screen.findByRole('button', { name: 'Account menu' }));

    expect(await screen.findByText('no-name@example.com')).toBeInTheDocument();
    expect(screen.queryByText('Aiko Tanaka')).not.toBeInTheDocument();
  });
});
