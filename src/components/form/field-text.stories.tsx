import { z } from 'zod';
import { useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

import { FieldText } from '~/components/form/field-text';

const schema = z.object({ email: z.email('Enter a valid email') });

/**
 * `FieldText` binds to a TanStack Form field, so every story sets up a real form and
 * renders the field through `form.Field` — the same wiring the app uses.
 */
function EmailField({ invalid = false }: { invalid?: boolean }) {
  const form = useForm({
    defaultValues: { email: invalid ? 'not-an-email' : '' },
    validators: { onChange: schema, onSubmit: schema },
  });

  // Submitting marks fields touched + runs validation, so the invalid story shows the
  // error ring and message on load without needing interaction. Runs once, after mount.
  useEffect(() => {
    if (invalid) void form.handleSubmit();
  }, [invalid, form]);

  return (
    <form className="w-80" onSubmit={(e) => e.preventDefault()}>
      <form.Field name="email">
        {(field) => <FieldText field={field} label="Email" placeholder="you@example.com" />}
      </form.Field>
    </form>
  );
}

const meta = {
  title: 'Form/FieldText',
  component: EmailField,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'A labelled text input bound to a TanStack Form field (label + input + inline error). The stories wrap it in a real form with a Zod schema — the same wiring the sign-in form uses.',
      },
    },
  },
} satisfies Meta<typeof EmailField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A touched field with a failing Zod rule shows the invalid ring + message. */
export const Invalid: Story = { args: { invalid: true } };
