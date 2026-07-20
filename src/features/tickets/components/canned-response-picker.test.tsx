import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { User } from '@supabase/supabase-js';

import '~/i18n';
import { render, screen } from '~/testing/render';
import { useAuthStore } from '~/stores/auth';
import { cannedResponseRows } from '~/mocks/fixtures';
import { CannedResponsePicker } from '~/features/tickets/components/canned-response-picker';

describe('CannedResponsePicker', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: cannedResponseRows[0].created_by } as User,
      permissions: new Set(['canned.read']),
      status: 'authenticated',
    });
  });
  afterEach(() => useAuthStore.setState({ user: null, permissions: new Set(), status: 'loading' }));

  it('lists response titles and inserts the chosen body', async () => {
    const onInsert = vi.fn();
    const { user } = await render(<CannedResponsePicker onInsert={onInsert} />);
    const first = cannedResponseRows[0];

    const trigger = await screen.findByRole('button', { name: 'Canned responses' });
    await user.click(trigger);

    const item = await screen.findByText(first.title);
    await user.click(item);

    expect(onInsert).toHaveBeenCalledWith(first.body);
  });

  it('renders nothing for a user without canned.read', async () => {
    useAuthStore.setState({ permissions: new Set() });
    const { container } = await render(<CannedResponsePicker onInsert={vi.fn()} />);

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('button', { name: 'Canned responses' })).not.toBeInTheDocument();
  });
});
