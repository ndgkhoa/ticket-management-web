import type { Meta, StoryObj } from '@storybook/tanstack-react';

import { Tabs, TabsList, TabsTrigger, TabsContent } from '~/components/ui/tabs';

const meta = {
  title: 'UI/Tabs',
  component: Tabs,
  parameters: {
    docs: {
      description: {
        component:
          'Switches between panels that share a region, built on Radix Tabs. `defaultValue` sets the open tab.',
      },
    },
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <Tabs defaultValue="conversation" className="w-96">
      <TabsList>
        <TabsTrigger value="conversation">Conversation</TabsTrigger>
        <TabsTrigger value="internal">Internal notes</TabsTrigger>
        <TabsTrigger value="activity">Activity</TabsTrigger>
      </TabsList>
      <TabsContent value="conversation" className="pt-3 text-sm">
        The public reply thread with the customer.
      </TabsContent>
      <TabsContent value="internal" className="pt-3 text-sm">
        Private notes only agents can see.
      </TabsContent>
      <TabsContent value="activity" className="pt-3 text-sm">
        The audit trail of status and assignment changes.
      </TabsContent>
    </Tabs>
  ),
};
