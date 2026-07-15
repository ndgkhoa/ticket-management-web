import { useTranslation } from 'react-i18next';
import { Space } from 'antd';

import { useQueryParams } from '~/hooks/use-query-params';
import { SearchKeyword } from '~/components/inputs';
import { Container } from '~/components/ui';
import CreatePermissonModal from '~/features/admin/permissions/components/create-permission-modal';
import PermissionList from '~/features/admin/permissions/components/permission-list';

const Permissions = () => {
  const { t } = useTranslation();
  const { queryParams, setQueryParams } = useQueryParams();

  return (
    <Container
      title={t('Common.List', { name: t('Fields.Permission', { count: 2 }) })}
      extraRight={
        <Space>
          <CreatePermissonModal />
          <SearchKeyword size="large" className="max-w-[12rem]" placeholder={t('Common.Search')} />
        </Space>
      }
    >
      <PermissionList
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

export default Permissions;
