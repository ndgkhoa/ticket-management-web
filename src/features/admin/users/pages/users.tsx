import { User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { ErrorPage } from '~/components/errors';
import { DataTableSkeleton } from '~/components/data-table';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Container,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '~/components/ui';
import { useUserList } from '~/features/admin/users/api/user-queries';

/**
 * Read-only user list on the Supabase data layer. Role assignment, invites and the
 * server-side paginated DataTable arrive with the help-desk feature phase; this proves
 * the profiles query and RLS work for a signed-in admin.
 */
function Users() {
  const { t } = useTranslation();
  const userQuery = useUserList();

  if (userQuery.isError) {
    return <ErrorPage subTitle={userQuery.error.message} />;
  }

  const users = userQuery.data ?? [];

  return (
    <Container title={t('Common.List', { name: t('Fields.User_other') })}>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">{t('Fields.Index')}</TableHead>
              <TableHead className="w-[320px]">{t('Fields.FullName')}</TableHead>
              <TableHead>{t('Fields.Email')}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {userQuery.isPending ? (
              <DataTableSkeleton columnCount={3} rowCount={5} />
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                  {t('Common.NoData')}
                </TableCell>
              </TableRow>
            ) : (
              users.map((user, index) => (
                <TableRow key={user.id}>
                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-2">
                      <Avatar className="size-7">
                        <AvatarImage src={user.avatarUrl ?? undefined} alt={user.fullName ?? ''} />
                        <AvatarFallback>
                          <User className="size-4" />
                        </AvatarFallback>
                      </Avatar>
                      {user.fullName ?? '—'}
                    </span>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Container>
  );
}

export default Users;
