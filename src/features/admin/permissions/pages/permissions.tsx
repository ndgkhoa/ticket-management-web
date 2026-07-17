import { useTranslation } from 'react-i18next';

import { ErrorPage } from '~/components/errors';
import { DataTableSkeleton } from '~/components/data-table';
import {
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui';
import { usePermissionList } from '~/features/admin/permissions/api/permission-queries';

/**
 * Read-only permission catalogue.
 *
 * A deliberately plain table on the Supabase data layer — enough to prove the layer end
 * to end, not the finished screen. Create/edit/delete and search arrive with the
 * help-desk feature phase; this proves the query, the schema and RLS work against a real
 * signed-in user first.
 */
function Permissions() {
  const { t } = useTranslation();
  const permissionQuery = usePermissionList();

  if (permissionQuery.isError) {
    return <ErrorPage subTitle={permissionQuery.error.message} />;
  }

  const permissions = permissionQuery.data ?? [];

  return (
    <Container title={t('Common.List', { name: t('Fields.Permission', { count: 2 }) })}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t('Fields.Index')}</TableHead>
              <TableHead className="w-[260px]">{t('Fields.PermissionCode')}</TableHead>
              <TableHead>{t('Fields.Description')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {permissionQuery.isPending ? (
              <DataTableSkeleton columnCount={3} rowCount={5} />
            ) : permissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                  {t('Common.NoData')}
                </TableCell>
              </TableRow>
            ) : (
              permissions.map((permission, index) => (
                <TableRow key={permission.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell className="font-mono text-sm">{permission.code}</TableCell>
                  <TableCell>{permission.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Container>
  );
}

export default Permissions;
