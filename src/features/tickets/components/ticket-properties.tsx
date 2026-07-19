import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

import {
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui';
import { DataTableFacetedFilter, type FacetOption } from '~/components/data-table';
import { useUpdateTicket } from '~/features/tickets/api/ticket-queries';
import { useToggleTicketTag } from '~/features/tickets/api/ticket-tag-queries';
import type { UpdateTicketPatch } from '~/features/tickets/api/ticket-api';
import {
  ticketPrioritySchema,
  ticketStatusSchema,
  type TicketPriority,
  type TicketStatus,
} from '~/features/tickets/schemas/ticket-enums';
import type { Ticket } from '~/features/tickets/schemas/ticket-schema';

const NONE = '__none__';
const statusOptions = ticketStatusSchema.options;
const priorityOptions = ticketPrioritySchema.options;

type Props = {
  ticket: Ticket;
  assigneeOptions: FacetOption[];
  teamOptions: FacetOption[];
  categoryOptions: FacetOption[];
  tagOptions: FacetOption[];
  ticketTagIds: string[];
};

/**
 * The workflow sidebar: change a ticket's status, priority, assignee, team, category, and
 * tags inline. Every field change is a plain patch — a database trigger emits the matching
 * `ticket_event` (status_changed, assigned, team_changed, …) so the change shows in the
 * activity feed without the client writing the audit trail. Tags toggle through the junction.
 */
export function TicketProperties({
  ticket,
  assigneeOptions,
  teamOptions,
  categoryOptions,
  tagOptions,
  ticketTagIds,
}: Props) {
  const { t } = useTranslation();
  const updateTicket = useUpdateTicket();
  const toggleTag = useToggleTicketTag(ticket.id);

  const apply = (patch: UpdateTicketPatch) => {
    updateTicket.mutate(
      { id: ticket.id, patch },
      { onError: (error) => toast.error(error.message) }
    );
  };

  const onTagsChange = (nextIds: string[]) => {
    const current = new Set(ticketTagIds);
    const next = new Set(nextIds);
    for (const id of next) if (!current.has(id)) toggleTag.mutate({ tagId: id, next: true });
    for (const id of current) if (!next.has(id)) toggleTag.mutate({ tagId: id, next: false });
  };

  return (
    <div className="space-y-4">
      <Field label={t('Fields.Status')}>
        <Select
          value={ticket.status}
          onValueChange={(value) => apply({ status: value as TicketStatus })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t('Fields.Priority')}>
        <Select
          value={ticket.priority}
          onValueChange={(value) => apply({ priority: value as TicketPriority })}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {priorityOptions.map((value) => (
              <SelectItem key={value} value={value}>
                {value}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Field label={t('Fields.Assignee')}>
        <NullableSelect
          value={ticket.assigneeId}
          options={assigneeOptions}
          placeholder={t('Tickets.Unassigned')}
          onChange={(value) => apply({ assigneeId: value })}
        />
      </Field>

      <Field label={t('Fields.Team')}>
        <NullableSelect
          value={ticket.teamId}
          options={teamOptions}
          placeholder="—"
          onChange={(value) => apply({ teamId: value })}
        />
      </Field>

      <Field label={t('Fields.Category')}>
        <NullableSelect
          value={ticket.categoryId}
          options={categoryOptions}
          placeholder="—"
          onChange={(value) => apply({ categoryId: value })}
        />
      </Field>

      <Field label={t('Fields.Tags')}>
        <DataTableFacetedFilter
          title={t('Fields.Tags')}
          options={tagOptions}
          selected={ticketTagIds}
          onChange={onTagsChange}
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs">{label}</Label>
      {children}
    </div>
  );
}

/** A select over a nullable relation — a leading "none" option maps to `null`. */
function NullableSelect({
  value,
  options,
  placeholder,
  onChange,
}: {
  value: string | null;
  options: FacetOption[];
  placeholder: string;
  onChange: (value: string | null) => void;
}) {
  return (
    <Select value={value ?? NONE} onValueChange={(next) => onChange(next === NONE ? null : next)}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value={NONE}>{placeholder}</SelectItem>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
