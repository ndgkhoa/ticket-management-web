import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import i18n from '~/i18n';

type CrudApi<Row, Input> = {
  list: () => Promise<Row[]>;
  create: (input: Input) => Promise<Row>;
  update: (id: string, input: Input) => Promise<Row>;
  remove: (id: string) => Promise<void>;
};

type CrudKeys = {
  all: readonly unknown[];
  list: () => readonly unknown[];
};

export function createCrudQueries<Row, Input>(config: {
  keys: CrudKeys;
  api: CrudApi<Row, Input>;
}) {
  const { keys, api } = config;

  const listQuery = () => queryOptions({ queryKey: keys.list(), queryFn: api.list });

  const useList = (options?: { enabled?: boolean }) =>
    useQuery({ ...listQuery(), enabled: options?.enabled ?? true });

  const useInvalidate = () => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: keys.all });
  };

  const useCreate = () => {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: (input: Input) => api.create(input),
      onSuccess: () => {
        invalidate();
        toast.success(i18n.t('Common.Saved'));
      },
    });
  };

  const useUpdate = () => {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: ({ id, input }: { id: string; input: Input }) => api.update(id, input),
      onSuccess: () => {
        invalidate();
        toast.success(i18n.t('Common.Saved'));
      },
    });
  };

  const useRemove = () => {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: (id: string) => api.remove(id),
      onSuccess: () => {
        invalidate();
        toast.success(i18n.t('Common.Deleted'));
      },
    });
  };

  return { listQuery, useList, useCreate, useUpdate, useRemove };
}
