import type { Meta, StoryObj } from '@storybook/tanstack-react';

import { ticketPrioritySchema, ticketStatusSchema } from '~/features/tickets/schemas/ticket-enums';
import { TicketStatusBadge } from '~/features/tickets/components/ticket-status-badge';
import { TicketPriorityBadge } from '~/features/tickets/components/ticket-priority-badge';

const meta = {
  title: 'Tickets/Badges',
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Colour-coded ticket status and priority badges, typed by the database enums (a new enum value is a compile error until styled). Toggle the Theme toolbar to check both light and dark.',
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

/** Every status colour, derived from the enum — toggle the Theme toolbar to check dark mode. */
export const Status: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {ticketStatusSchema.options.map((status) => (
        <TicketStatusBadge key={status} status={status} />
      ))}
    </div>
  ),
};

/** Every priority colour, escalating slate → blue → orange → red. */
export const Priority: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {ticketPrioritySchema.options.map((priority) => (
        <TicketPriorityBadge key={priority} priority={priority} />
      ))}
    </div>
  ),
};
