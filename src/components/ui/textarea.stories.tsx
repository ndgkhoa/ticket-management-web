import type { Meta, StoryObj } from '@storybook/tanstack-react';

import { Textarea } from '~/components/ui/textarea';

const meta = {
  title: 'UI/Textarea',
  component: Textarea,
  parameters: {
    docs: {
      description: { component: 'Multi-line text input for longer content like a ticket reply.' },
    },
  },
  args: { placeholder: 'Write a reply…' },
  argTypes: { disabled: { control: 'boolean' } },
} satisfies Meta<typeof Textarea>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithValue: Story = {
  args: { defaultValue: 'Thanks for reaching out — we are looking into this now.' },
};

export const Disabled: Story = { args: { disabled: true } };
