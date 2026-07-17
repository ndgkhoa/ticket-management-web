import type { AnyFieldApi } from '@tanstack/react-form';

import { Label } from '~/components/ui/label';
import { FieldError } from '~/components/form/field-error';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

type Option = { value: string; label: string };

type Props = {
  field: AnyFieldApi;
  label: string;
  options: readonly Option[];
  placeholder?: string;
  disabled?: boolean;
};

/**
 * A labelled single-choice select bound to a TanStack Form field — for enum columns like
 * an SLA policy's priority. The Radix trigger gets the field id so the label focuses it,
 * and `aria-invalid` flips on a touched error to match the text fields.
 */
export function FieldSelect({ field, label, options, placeholder, disabled }: Props) {
  const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <Select
        value={field.state.value ?? ''}
        onValueChange={(value) => field.handleChange(value)}
        disabled={disabled}
      >
        <SelectTrigger id={field.name} aria-invalid={hasError} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError field={field} />
    </div>
  );
}
