import type { Meta, StoryObj } from '@storybook/tanstack-react';

import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from '~/components/ui/tooltip';
import { Button } from '~/components/ui/button';

const meta = {
  title: 'UI/Tooltip',
  component: Tooltip,
  parameters: {
    docs: {
      description: {
        component:
          'A hover/focus hint built on Radix Tooltip. Wrap the app (or the story) in a `TooltipProvider`.',
      },
    },
  },
} satisfies Meta<typeof Tooltip>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline">Hover me</Button>
        </TooltipTrigger>
        <TooltipContent>Reassign this ticket</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  ),
};
