/**
 * The account the Google button signs in as when the app runs on mocks (the static
 * demo). Owner, so a reviewer clicking "Continue with Google" lands with full access to
 * everything the app can show. These are seeded demo credentials, documented in the
 * README — there is nothing to protect, and this path only runs when `VITE_API_MODE=msw`.
 */
export const DEMO_LOGIN = { email: 'owner@example.com', password: 'password123' } as const;
