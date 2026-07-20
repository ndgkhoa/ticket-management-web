import type { Meta, StoryObj } from '@storybook/tanstack-react';

import { Input } from '~/components/ui/input';

const meta = {
  title: 'UI/Input',
  component: Input,
  parameters: {
    docs: {
      description: {
        component:
          'Text input primitive. `aria-invalid` flips it to the destructive ring for a failed form field.',
      },
    },
  },
  args: { placeholder: 'Type here…' },
  argTypes: { disabled: { control: 'boolean' } },
} satisfies Meta<typeof Input>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = { args: { disabled: true } };

export const Invalid: Story = {
  args: { 'aria-invalid': true, defaultValue: 'not-an-email' },
};
