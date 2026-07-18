import { useMemo } from 'react';
import { toast } from 'sonner';
import { useForm } from '@tanstack/react-form';
import { useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';

import { Button, Container } from '~/components/ui';
import { FieldSelect, FieldText, FieldTextarea } from '~/components/form';
import { useCreateTicket } from '~/features/tickets/api/ticket-queries';
import { useCategoryList } from '~/features/admin/categories/api/category-queries';
import { AiTriageHint } from '~/features/tickets/components/ai-triage-hint';
import { ticketPrioritySchema, type TicketPriority } from '~/features/tickets/schemas/ticket-enums';

const NO_CATEGORY = '';
const priorityOptions = ticketPrioritySchema.options.map((value) => ({ label: value, value }));

/**
 * Create-ticket form. The requester is the signed-in user (set in the api), so the form only
 * asks for what the caller decides: subject, description, priority, category. On success it
 * navigates to the new ticket's detail page.
 */
function TicketCreate() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const createTicket = useCreateTicket();
  const { data: categories = [] } = useCategoryList();

  const categoryOptions = useMemo(
    () => [
      { label: '—', value: NO_CATEGORY },
      ...categories.map((category) => ({ label: category.name, value: category.id })),
    ],
    [categories]
  );

  const schema = z.object({
    subject: z.string().trim().min(1, t('Validation.Required')),
    description: z.string(),
    priority: ticketPrioritySchema,
    categoryId: z.string(),
  });

  const form = useForm({
    defaultValues: {
      subject: '',
      description: '',
      priority: 'normal' as TicketPriority,
      categoryId: NO_CATEGORY,
    },
    validators: { onSubmit: schema },
    onSubmit: ({ value }) => {
      createTicket.mutate(
        {
          subject: value.subject.trim(),
          description: value.description.trim(),
          priority: value.priority,
          categoryId: value.categoryId || null,
        },
        {
          onSuccess: (ticket) => {
            toast.success(t('Common.Saved'));
            void navigate({ to: '/tickets/$ticketId', params: { ticketId: ticket.id } });
          },
          onError: (error) => toast.error(error.message),
        }
      );
    },
  });

  return (
    <Container title={t('Common.Create', { name: t('Fields.Ticket_one') })} showBack>
      <form
        className="max-w-2xl space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Field name="subject">
          {(field) => <FieldText field={field} label={t('Fields.Subject')} />}
        </form.Field>
        <form.Field name="description">
          {(field) => <FieldTextarea field={field} label={t('Fields.Description')} rows={6} />}
        </form.Field>
        <form.Field name="priority">
          {(field) => (
            <FieldSelect field={field} label={t('Fields.Priority')} options={priorityOptions} />
          )}
        </form.Field>
        <form.Field name="categoryId">
          {(field) => (
            <FieldSelect field={field} label={t('Fields.Category')} options={categoryOptions} />
          )}
        </form.Field>

        <form.Subscribe
          selector={(state) => ({
            subject: state.values.subject,
            description: state.values.description,
          })}
        >
          {({ subject, description }) => (
            <AiTriageHint
              subject={subject}
              description={description}
              categories={categories.map((category) => ({
                id: category.id,
                name: category.name,
              }))}
              onApply={({ priority, categoryId }) => {
                form.setFieldValue('priority', priority);
                form.setFieldValue('categoryId', categoryId ?? NO_CATEGORY);
              }}
            />
          )}
        </form.Subscribe>

        <div className="flex justify-end gap-2">
          <Button type="submit" disabled={createTicket.isPending}>
            {t('Common.Create', { name: t('Fields.Ticket_one') })}
          </Button>
        </div>
      </form>
    </Container>
  );
}

export default TicketCreate;
