import type { AnyFieldApi } from '@tanstack/react-form';
import type { ComponentProps } from 'react';

import { cn } from '~/utils/cn';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { FieldError } from '~/components/form/field-error';

type Props = {
  field: AnyFieldApi;
  label: string;
} & Omit<ComponentProps<typeof Textarea>, 'value' | 'onChange' | 'onBlur' | 'name' | 'id'>;

/**
 * A labelled multi-line input bound to a TanStack Form field — the textarea twin of
 * `FieldText`, for descriptions and bodies. Same label-by-id association and
 * `aria-invalid` wiring, so it reads and validates identically.
 */
export function FieldTextarea({ field, label, className, ...textareaProps }: Props) {
  const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <Textarea
        id={field.name}
        name={field.name}
        value={field.state.value ?? ''}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={hasError}
        className={cn(className)}
        {...textareaProps}
      />
      <FieldError field={field} />
    </div>
  );
}
