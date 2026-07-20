import {
  keepPreviousData,
  queryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { toast } from 'sonner';

import i18n from '~/i18n';
import type { ListParams } from '~/lib/list-query';
import {
  cannedResponseApi,
  type CannedResponseInput,
} from '~/features/admin/canned-responses/api/canned-response-api';
import { cannedResponseKeys } from '~/features/admin/canned-responses/constants/canned-response-keys';

export const cannedResponseListQuery = (params: ListParams) =>
  queryOptions({
    queryKey: cannedResponseKeys.list(params),
    queryFn: () => cannedResponseApi.list(params),
    placeholderData: keepPreviousData,
  });

export const useCannedResponseList = (params: ListParams) =>
  useQuery(cannedResponseListQuery(params));

function useInvalidateCannedResponses() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: cannedResponseKeys.all });
}

export function useCannedResponseCreate() {
  const invalidate = useInvalidateCannedResponses();
  return useMutation({
    mutationFn: (input: CannedResponseInput) => cannedResponseApi.create(input),
    onSuccess: () => {
      invalidate();
      toast.success(i18n.t('Common.Saved'));
    },
  });
}

export function useCannedResponseUpdate() {
  const invalidate = useInvalidateCannedResponses();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: CannedResponseInput }) =>
      cannedResponseApi.update(id, input),
    onSuccess: () => {
      invalidate();
      toast.success(i18n.t('Common.Saved'));
    },
  });
}

export function useCannedResponseRemove() {
  const invalidate = useInvalidateCannedResponses();
  return useMutation({
    mutationFn: (id: string) => cannedResponseApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success(i18n.t('Common.Deleted'));
    },
  });
}
