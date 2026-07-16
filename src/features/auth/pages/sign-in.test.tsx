import { afterEach, describe, expect, it } from 'vitest';

import SignIn from '~/features/auth/pages/sign-in';
import i18n from '~/i18n';
import { render, screen } from '~/testing/render';

/**
 * Exercises the shared `render` helper against a real page: providers, i18n and antd
 * all have to work together for any component test to be worth writing.
 *
 * Copy is asserted as literal strings, never as `i18n.t('Common.Login')`. Comparing
 * the render against `t()` is a tautology: if i18n breaks, `t()` returns the raw key,
 * the component renders that same key, and the test still passes — which is precisely
 * the failure it is supposed to catch.
 */
describe('SignIn', () => {
  // i18n is a module singleton. Without this, a test that throws mid-language-switch
  // leaves every later test running in the wrong language.
  afterEach(async () => {
    await i18n.changeLanguage('en');
  });

  it('renders the login form through the app providers', () => {
    render(<SignIn />);

    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument();
    // getByLabelText, not getByPlaceholderText: it only passes if the label is actually
    // associated with the input, so the query doubles as an a11y assertion.
    expect(screen.getByLabelText('Username')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('renders translated copy rather than raw i18n keys', () => {
    render(<SignIn />);

    // A missing key renders as the key itself — that is how `Validation.Username`
    // reached real users.
    expect(screen.getByRole('heading', { name: 'Help Desk' })).toBeInTheDocument();
    expect(screen.queryByText(/^(Common|Login|App|Fields|Validation)\./)).not.toBeInTheDocument();
  });

  it('renders Vietnamese copy when the language changes', async () => {
    render(<SignIn />);
    await i18n.changeLanguage('vi');

    expect(await screen.findByRole('button', { name: 'Đăng nhập' })).toBeInTheDocument();
  });

  it('sets the document title natively, without a helmet provider', () => {
    // React 19 hoists <title> from anywhere in the tree; this is what replaced
    // react-helmet-async.
    render(<SignIn />);

    expect(document.title).toBe('Login');
  });
});
