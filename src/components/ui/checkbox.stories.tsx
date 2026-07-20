import type { Meta, StoryObj } from '@storybook/tanstack-react';

import { Checkbox } from '~/components/ui/checkbox';
import { Label } from '~/components/ui/label';

const meta = {
  title: 'UI/Checkbox',
  component: Checkbox,
  parameters: {
    docs: {
      description: {
        component: 'A single boolean control, built on Radix Checkbox. Pair it with a `Label`.',
      },
    },
  },
  argTypes: {
    checked: { control: 'boolean' },
    disabled: { control: 'boolean' },
  },
} satisfies Meta<typeof Checkbox>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = { args: { defaultChecked: true } };

export const Disabled: Story = { args: { disabled: true } };

export const WithLabel: Story = {
  render: (args) => (
    <div className="flex items-center gap-2">
      <Checkbox id="notify" {...args} />
      <Label htmlFor="notify">Email me on ticket updates</Label>
    </div>
  ),
};
