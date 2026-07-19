import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { AnyFieldApi } from '@tanstack/react-form';
import type { ComponentProps } from 'react';

import { cn } from '~/utils/cn';
import { Input, Label } from '~/components/ui';
import { FieldError } from '~/components/form/field-error';

type Props = {
  field: AnyFieldApi;
  label: string;
} & Omit<ComponentProps<typeof Input>, 'value' | 'onChange' | 'onBlur' | 'name' | 'id' | 'type'>;

/**
 * A password field bound to a TanStack Form field, with a show/hide toggle. Same
 * label/error wiring as `FieldText`; the eye button flips the input between `password`
 * and `text` and is `tabindex`-reachable with an `aria-label` so it isn't a mouse-only
 * control.
 */
export function FieldPassword({ field, label, className, disabled, ...inputProps }: Props) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const hasError = field.state.meta.isTouched && field.state.meta.errors.length > 0;

  return (
    <div className="space-y-1.5">
      <Label htmlFor={field.name}>{label}</Label>
      <div className="relative">
        <Input
          id={field.name}
          name={field.name}
          type={visible ? 'text' : 'password'}
          value={field.state.value ?? ''}
          onBlur={field.handleBlur}
          onChange={(event) => field.handleChange(event.target.value)}
          aria-invalid={hasError}
          disabled={disabled}
          className={cn('pr-10', className)}
          {...inputProps}
        />
        <button
          type="button"
          onClick={() => setVisible((prev) => !prev)}
          disabled={disabled}
          aria-label={t(visible ? 'Login.HidePassword' : 'Login.ShowPassword')}
          aria-pressed={visible}
          className="text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute inset-y-0 right-0 flex items-center px-3 outline-none focus-visible:ring-2 disabled:pointer-events-none"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      <FieldError field={field} />
    </div>
  );
}
