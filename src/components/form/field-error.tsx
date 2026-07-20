import type { AnyFieldApi } from '@tanstack/react-form';

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
