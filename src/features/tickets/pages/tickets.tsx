import { useTranslation } from 'react-i18next';
import { Empty, Table, Tag } from 'antd';
import type { TableProps } from 'antd';

import { PAGE_SIZES } from '~/lib/list-query';
import { Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import { useTicketList } from '~/features/tickets/api/ticket-queries';
import { useTicketSearchParams } from '~/features/tickets/hooks/use-ticket-search-params';
import { toTicketListParams } from '~/features/tickets/schemas/ticket-search-schema';
import type { Ticket } from '~/features/tickets/schemas/ticket-schema';

/**
 * Placeholder ticket list — a plain table wired to the URL search params, proving the
 * route, its loader and the query end to end: paging writes to the URL, the loader
 * refetches on the change, and the previous page stays on screen (keepPreviousData).
 * Filters, keyword search and the shared DataTable arrive with the design system;
 * this is the type-safe URL contract working before the UI is built on top of it.
 */
const Tickets = () => {
  const { t } = useTranslation();
  const { search, setSearch } = useTicketSearchParams();
  const ticketQuery = useTicketList(toTicketListParams(search));

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
        // Dim rather than unmount while the next page loads — no layout jump.
        className={ticketQuery.isPlaceholderData ? 'pointer-events-none opacity-60' : undefined}
        dataSource={ticketQuery.data?.rows}
        columns={columns}
        pagination={{
          current: search.page,
          pageSize: search.pageSize,
          total: ticketQuery.data?.totalCount,
          showSizeChanger: true,
          pageSizeOptions: PAGE_SIZES.map(String),
          // A page-size change resets to page 1 (via the hook's rule); a page change
          // just moves the page. Passing only the field that changed keeps the reset
          // rule from firing on every page click.
          // `pageSizeOptions` restricts the picker to PAGE_SIZES, so the value is
          // always a valid member — antd just types it as a plain number.
          onChange: (page, pageSize) =>
            setSearch(
              pageSize !== search.pageSize
                ? { pageSize: pageSize as (typeof PAGE_SIZES)[number] }
                : { page }
            ),
        }}
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
