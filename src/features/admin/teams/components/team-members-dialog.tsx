import { User as UserIcon } from 'lucide-react';
import { useMemo } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Skeleton,
} from '~/components/ui';
import { useAssigneeOptions } from '~/features/tickets/api/assignee-queries';
import {
  useAddTeamMember,
  useRemoveTeamMember,
  useTeamMembers,
} from '~/features/admin/teams/api/team-member-queries';
import type { Team } from '~/features/admin/teams/schemas/team-schema';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  team: Team;
};

export function TeamMembersDialog({ open, onOpenChange, team }: Props) {
  const { t } = useTranslation();
  const membersQuery = useTeamMembers(team.id);
  const { data: agents = [], isPending: agentsPending } = useAssigneeOptions();
  const add = useAddTeamMember(team.id);
  const remove = useRemoveTeamMember(team.id);

  const memberIds = useMemo(() => new Set(membersQuery.data ?? []), [membersQuery.data]);
  const pending = membersQuery.isPending || agentsPending;

  const onError = (error: Error) => toast.error(error.message);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {t('Teams.ManageMembers')} — {team.name}
          </DialogTitle>
        </DialogHeader>

        {pending ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : agents.length === 0 ? (
          <p className="text-muted-foreground text-sm">{t('Teams.NoMembers')}</p>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {agents.map((agent) => {
              const isMember = memberIds.has(agent.id);
              return (
                <li
                  key={agent.id}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarImage src={agent.avatarUrl ?? undefined} alt={agent.fullName ?? ''} />
                      <AvatarFallback>
                        <UserIcon className="size-4" />
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate text-sm">{agent.fullName ?? '—'}</span>
                  </span>
                  {isMember ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7"
                      disabled={remove.isPending}
                      onClick={() => remove.mutate(agent.id, { onError })}
                    >
                      {t('Common.Delete', { name: t('Teams.Members') })}
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      className="h-7"
                      disabled={add.isPending}
                      onClick={() => add.mutate(agent.id, { onError })}
                    >
                      {t('Teams.AddMember')}
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
