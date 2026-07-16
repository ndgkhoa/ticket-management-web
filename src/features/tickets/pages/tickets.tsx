import { useTranslation } from 'react-i18next';
import { Empty, Table, Tag } from 'antd';
import type { TableProps } from 'antd';

import { Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import { listParamsSchema } from '~/lib/list-query';
import { useTicketList } from '~/features/tickets/api/ticket-queries';
import type { Ticket } from '~/features/tickets/schemas/ticket-schema';

/**
 * Placeholder ticket list — a plain table on the ticket data layer, proving the
 * route, loader and query end to end. The URL-driven typed search params, filters,
 * the shared DataTable and the full ticket UX arrive in later phases; for now it
 * reads the first page with default params.
 */
const Tickets = () => {
  const { t } = useTranslation();
  const ticketQuery = useTicketList(listParamsSchema.parse({}));

  const columns: TableProps<Ticket>['columns'] = [
    { title: t('Fields.Subject'), dataIndex: 'subject', key: 'subject', ellipsis: true },
    {
      title: t('Fields.Status'),
      dataIndex: 'status',
      key: 'status',
      width: 140,
      render: (status: string) => <Tag>{status}</Tag>,
    },
    {
      title: t('Fields.Priority'),
      dataIndex: 'priority',
      key: 'priority',
      width: 140,
      render: (priority: string) => <Tag>{priority}</Tag>,
    },
  ];

  if (ticketQuery.isError) {
    return <ErrorPage subTitle={ticketQuery.error.message} />;
  }

  return (
    <Container title={t('Common.List', { name: t('Fields.Ticket_other') })}>
      <Table
        rowKey="id"
        loading={ticketQuery.isPending}
        dataSource={ticketQuery.data?.rows}
        columns={columns}
        pagination={false}
        locale={{
          emptyText: (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('Common.NoData')} />
          ),
        }}
      />
    </Container>
  );
};

export default Tickets;
