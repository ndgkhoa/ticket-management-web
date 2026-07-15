import { useTranslation } from 'react-i18next';
import { Space } from 'antd';

import { useQueryParams } from '~/hooks/use-query-params';
import { SearchKeyword } from '~/components/inputs';
import { Container } from '~/components/ui';
import CreateUserModal from '~/features/admin/users/components/create-user-modal';
import UserList from '~/features/admin/users/components/user-list';

const Users = () => {
  const { t } = useTranslation();
  const { queryParams, setQueryParams } = useQueryParams();

  return (
    <Container
      title={t('Common.List', { name: t('Fields.User', { count: 2 }) })}
      extraRight={
        <Space>
          <CreateUserModal />
          <SearchKeyword size="large" className="max-w-[12rem]" placeholder={t('Common.Search')} />
        </Space>
      }
    >
      <UserList
        searchParams={{
          keyword: queryParams.keyword,
          pageIndex: queryParams.page,
          pageSize: queryParams.pageSize,
        }}
        pagination={{
          current: queryParams.page,
          pageSize: queryParams.pageSize,
          onChange: (page: number, pageSize: number) => setQueryParams({ page, pageSize }),
        }}
      />
    </Container>
  );
};

export default Users;
