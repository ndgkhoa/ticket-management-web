import type { AnyFieldApi } from '@tanstack/react-form';
import type { ComponentProps } from 'react';

import { cn } from '~/utils/cn';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { FieldError } from '~/components/form/field-error';

type Props = {
  field: AnyFieldApi;
  label: string;
} & Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur' | 'name' | 'id'>;

/**
 * A labelled text input bound to a TanStack Form field — the field owns the value and
 * validation, this wires it to the shadcn Input and shows the error.
 *
 * The label is associated by id (real `htmlFor`, so clicking it focuses the input and
 * a screen reader announces it), and `aria-invalid` flips when a touched field has an
 * error so the invalid ring shows and assistive tech knows.
 */
export function TextField({ field, label, className, ...inputProps }: Props) {
  const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <Input
        id={field.name}
        name={field.name}
        value={field.state.value ?? ''}
        onBlur={field.handleBlur}
        onChange={(event) => field.handleChange(event.target.value)}
        aria-invalid={hasError}
        className={cn(className)}
        {...inputProps}
      />
      <FieldError field={field} />
    </div>
  );
}
