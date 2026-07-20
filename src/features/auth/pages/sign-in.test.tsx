import { afterEach, describe, expect, it } from 'vitest';

import SignIn from '~/features/auth/pages/sign-in';
import i18n from '~/i18n';
import { render, screen } from '~/testing/render';

describe('SignIn', () => {
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the login form through the app providers', async () => {
    await render(<SignIn />);

    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders translated copy rather than raw i18n keys', async () => {
    await render(<SignIn />);

    expect(screen.getByRole('heading', { name: 'Help Desk' })).toBeInTheDocument();
    expect(screen.queryByText(/^(Common|Login|App|Fields|Validation)\./)).not.toBeInTheDocument();
  });

  it('renders Vietnamese copy when the language changes', async () => {
    await render(<SignIn />);
    await i18n.changeLanguage('vi');

    expect(await screen.findByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('sets the document title natively, without a helmet provider', async () => {
    await render(<SignIn />);

    expect(document.title).toBe('Login');
  });
});
