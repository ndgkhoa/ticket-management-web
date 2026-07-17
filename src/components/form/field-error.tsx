import type { AnyFieldApi } from '@tanstack/react-form';

/**
 * Render a TanStack Form field's validation errors, but only once the field has been
 * touched — so a pristine form doesn't shout every requirement before the user has
 * typed. Errors arrive as strings or Standard Schema issues (Zod 4); both are
 * normalised to their message.
 */
export function FieldError({ field }: { field: AnyFieldApi }) {
  if (!field.state.meta.isTouched || field.state.meta.errors.length === 0) {
    return null;
  }

  const message = field.state.meta.errors
    .map((error) => (typeof error === 'string' ? error : (error?.message ?? '')))
    .filter(Boolean)
    .join(', ');

  if (!message) return null;

  return (
    <p role="alert" className="text-destructive text-sm">
      {message}
    </p>
  );
}
