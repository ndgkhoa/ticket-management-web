import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { savedViewApi, type SavedViewInput } from '~/features/tickets/api/saved-view-api';

export const savedViewKeys = {
  all: ['saved-views'] as const,
  list: () => [...savedViewKeys.all, 'list'] as const,
};

export const savedViewQueries = {
  list: () =>
    queryOptions({
      queryKey: savedViewKeys.list(),
      queryFn: () => savedViewApi.list(),
    }),
};

export const useSavedViews = () => useQuery(savedViewQueries.list());

function useInvalidateSavedViews() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: savedViewKeys.list() });
}

export const useCreateSavedView = () => {
  const invalidate = useInvalidateSavedViews();
  return useMutation({
    mutationFn: (input: SavedViewInput) => savedViewApi.create(input),
    onSuccess: invalidate,
  });
};

export const useSetSavedViewShared = () => {
  const invalidate = useInvalidateSavedViews();
  return useMutation({
    mutationFn: ({ id, isShared }: { id: string; isShared: boolean }) =>
      savedViewApi.setShared(id, isShared),
    onSuccess: invalidate,
  });
};

export const useRemoveSavedView = () => {
  const invalidate = useInvalidateSavedViews();
  return useMutation({
    mutationFn: (id: string) => savedViewApi.remove(id),
    onSuccess: invalidate,
  });
};
