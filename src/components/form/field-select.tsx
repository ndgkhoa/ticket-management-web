import type { AnyFieldApi } from '@tanstack/react-form';

import { FieldError } from '~/components/form/field-error';
import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui';

type Option = { value: string; label: string };

type Props = {
  field: AnyFieldApi;
  label: string;
  options: readonly Option[];
  placeholder?: string;
  disabled?: boolean;
};

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
