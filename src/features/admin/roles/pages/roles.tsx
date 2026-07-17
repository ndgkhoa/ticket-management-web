import { useTranslation } from 'react-i18next';

import { Container } from '~/components/ui';
import { ErrorPage } from '~/components/errors';
import { DataTableSkeleton } from '~/components/data-table';
import { Badge } from '~/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui/table';
import { useRoleList } from '~/features/admin/roles/api/role-queries';

/**
 * Read-only role list on the Supabase data layer. The role-permission matrix editor
 * and CRUD arrive with the help-desk feature phase; this proves the query and RLS.
 */
function Roles() {
  const { t } = useTranslation();
  const roleQuery = useRoleList();

  if (roleQuery.isError) {
    return <ErrorPage subTitle={roleQuery.error.message} />;
  }

  const roles = roleQuery.data ?? [];

  return (
    <Container title={t('Common.List', { name: t('Fields.Role_other') })}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t('Fields.Index')}</TableHead>
              <TableHead className="w-[220px]">{t('Fields.RoleName')}</TableHead>
              <TableHead>{t('Fields.Description')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {roleQuery.isPending ? (
              <DataTableSkeleton columnCount={3} rowCount={5} />
            ) : roles.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                  {t('Common.NoData')}
                </TableCell>
              </TableRow>
            ) : (
              roles.map((role, index) => (
                <TableRow key={role.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      {role.name}
                      {role.isSystem && <Badge variant="secondary">{t('Common.System')}</Badge>}
                    </span>
                  </TableCell>
                  <TableCell>{role.description}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Container>
  );
}

export default Roles;
