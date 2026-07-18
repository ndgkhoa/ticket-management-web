import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { attachmentApi } from '~/features/tickets/api/attachment-api';
import { ticketKeys } from '~/features/tickets/constants/ticket-keys';

export const attachmentQueries = {
  list: (ticketId: string) =>
    queryOptions({
      queryKey: ticketKeys.attachments(ticketId),
      queryFn: () => attachmentApi.list(ticketId),
    }),
};

export const useTicketAttachments = (ticketId: string) =>
  useQuery(attachmentQueries.list(ticketId));

// No onSuccess invalidation here on purpose: the component holds a progress bar for a moment
// after the upload resolves, and refreshes the list itself when the bar clears, so the new row
// appears as the bar leaves rather than on top of it.
export const useUploadAttachment = (ticketId: string) =>
  useMutation({ mutationFn: (file: File) => attachmentApi.create(ticketId, file) });

export const useRemoveAttachment = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => attachmentApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.attachments(ticketId) }),
  });
};
