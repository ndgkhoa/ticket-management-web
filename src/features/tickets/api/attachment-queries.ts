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

export const useUploadAttachment = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => attachmentApi.create(ticketId, file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.attachments(ticketId) }),
  });
};

export const useRemoveAttachment = (ticketId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => attachmentApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ticketKeys.attachments(ticketId) }),
  });
};
