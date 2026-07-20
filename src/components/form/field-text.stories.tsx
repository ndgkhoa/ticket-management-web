import { z } from 'zod';
import { useEffect } from 'react';
import { useForm } from '@tanstack/react-form';
import type { Meta, StoryObj } from '@storybook/tanstack-react';

import { FieldText } from '~/components/form/field-text';

const schema = z.object({ email: z.email('Enter a valid email') });

function EmailField({ invalid = false }: { invalid?: boolean }) {
  const form = useForm({
    defaultValues: { email: invalid ? 'not-an-email' : '' },
    validators: { onChange: schema, onSubmit: schema },
  });

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

export const Invalid: Story = { args: { invalid: true } };
