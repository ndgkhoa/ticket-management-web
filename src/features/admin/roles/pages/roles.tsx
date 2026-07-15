import { useTranslation } from 'react-i18next';
import { Space } from 'antd';

import { useQueryParams } from '~/hooks/use-query-params';
import { SearchKeyword } from '~/components/inputs';
import { Container } from '~/components/ui';
import CreateRoleModal from '~/features/admin/roles/components/create-role-modal';
import RoleList from '~/features/admin/roles/components/role-list';

const Roles = () => {
  const { t } = useTranslation();
  const { queryParams, setQueryParams } = useQueryParams();

  return (
    <Container
      title={t('Common.List', { name: t('Fields.Role', { count: 2 }) })}
      extraRight={
        <Space>
          <CreateRoleModal />
          <SearchKeyword size="large" className="max-w-[12rem]" placeholder={t('Common.Search')} />
        </Space>
      }
    >
      <RoleList
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

export default Roles;
