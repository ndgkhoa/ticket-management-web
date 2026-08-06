import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as ReactRouter from '@tanstack/react-router';

import { SignUpForm } from '~/features/auth/components/sign-up-form';
import { render, screen } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  signUp: vi.fn(),
  navigate: vi.fn(),
  pending: { value: false },
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>();
  return { ...actual, useNavigate: () => mocks.navigate };
});

vi.mock('~/features/auth/api/use-sign-up', () => ({
  useSignUp: () => ({ mutate: mocks.signUp, isPending: mocks.pending.value }),
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const submit = () => screen.getByRole('button', { name: 'Register' });

const fillValid = async (user: { type: (el: HTMLElement, text: string) => Promise<void> }) => {
  await user.type(screen.getByLabelText('Full Name'), 'Khoa');
  await user.type(screen.getByLabelText('Email'), 'khoa@example.com');
  await user.type(screen.getByLabelText('Password'), 'password123');
  await user.type(screen.getByLabelText('Confirm password'), 'password123');
};

beforeEach(() => {
  vi.clearAllMocks();
  mocks.pending.value = false;
});

describe('SignUpForm validation', () => {
  it('blocks an empty submit and marks the required fields', async () => {
    const { user } = await render(<SignUpForm />);

    await user.click(submit());

    expect(await screen.findAllByText('This field is required')).not.toHaveLength(0);
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('rejects an address the browser accepts but zod does not', async () => {
    const { user } = await render(<SignUpForm />);

    await user.type(screen.getByLabelText('Full Name'), 'Khoa');
    await user.type(screen.getByLabelText('Email'), 'foo@bar');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password123');
    await user.click(submit());

    expect(await screen.findByText('This field must be a valid email address')).toBeInTheDocument();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('rejects a password under eight characters', async () => {
    const { user } = await render(<SignUpForm />);

    await user.type(screen.getByLabelText('Full Name'), 'Khoa');
    await user.type(screen.getByLabelText('Email'), 'khoa@example.com');
    await user.type(screen.getByLabelText('Password'), 'short');
    await user.type(screen.getByLabelText('Confirm password'), 'short');
    await user.click(submit());

    expect(await screen.findByText('Password must be at least 8 characters')).toBeInTheDocument();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });

  it('rejects a confirmation that does not match', async () => {
    const { user } = await render(<SignUpForm />);

    await user.type(screen.getByLabelText('Full Name'), 'Khoa');
    await user.type(screen.getByLabelText('Email'), 'khoa@example.com');
    await user.type(screen.getByLabelText('Password'), 'password123');
    await user.type(screen.getByLabelText('Confirm password'), 'password124');
    await user.click(submit());

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mocks.signUp).not.toHaveBeenCalled();
  });
});

describe('SignUpForm submission', () => {
  it('registers with the entered credentials', async () => {
    const { user } = await render(<SignUpForm />);

    await fillValid(user);
    await user.click(submit());

    expect(mocks.signUp).toHaveBeenCalledWith(
      {
        fullName: 'Khoa',
        email: 'khoa@example.com',
        password: 'password123',
        captchaToken: undefined,
      },
      expect.anything()
    );
  });

  it('goes straight to the app when the sign-up returns a session', async () => {
    mocks.signUp.mockImplementationOnce((_input, handlers) =>
      handlers.onSuccess({ session: { access_token: 'tok' } })
    );
    const { user } = await render(<SignUpForm />);

    await fillValid(user);
    await user.click(submit());

    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/' });
    expect(mocks.toast.success).not.toHaveBeenCalled();
  });

  it('sends the user to confirm their email when no session comes back', async () => {
    mocks.signUp.mockImplementationOnce((_input, handlers) =>
      handlers.onSuccess({ session: null })
    );
    const { user } = await render(<SignUpForm />);

    await fillValid(user);
    await user.click(submit());

    expect(mocks.toast.success).toHaveBeenCalledWith('Check your inbox to confirm your account.');
    expect(mocks.navigate).toHaveBeenCalledWith({ to: '/auth/sign-in' });
  });

  it('surfaces a failed sign-up without navigating', async () => {
    mocks.signUp.mockImplementationOnce((_input, handlers) =>
      handlers.onError(new Error('email already registered'))
    );
    const { user } = await render(<SignUpForm />);

    await fillValid(user);
    await user.click(submit());

    expect(mocks.toast.error).toHaveBeenCalledWith('email already registered');
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it('locks the form while the request is in flight', async () => {
    mocks.pending.value = true;
    await render(<SignUpForm />);

    expect(submit()).toBeDisabled();
    expect(screen.getByLabelText('Full Name')).toBeDisabled();
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });
});
