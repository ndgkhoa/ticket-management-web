import type { AnyFieldApi } from '@tanstack/react-form';
import type { ComponentProps } from 'react';

import { cn } from '~/utils/cn';
import { Label, Textarea } from '~/components/ui';
import { FieldError } from '~/components/form/field-error';

type Props = {
  field: AnyFieldApi;
  label: string;
} & Omit<ComponentProps<typeof Textarea>, 'value' | 'onChange' | 'onBlur' | 'name' | 'id'>;

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
