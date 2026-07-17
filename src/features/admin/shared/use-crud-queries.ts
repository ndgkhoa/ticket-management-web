import { queryOptions, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * The React Query half of an admin CRUD resource, built once and reused by every lookup
 * table (categories, tags, teams, SLA policies). The API layer and the query keys stay
 * per-entity and typed; this removes only the identical list-query + mutation wiring.
 *
 * Mutations invalidate the resource's whole key space on success rather than optimistic
 * patching — these tables are tens of rows, a refetch is cheap, and invalidate-then-refetch
 * cannot desync the way a hand-written optimistic cache edit can. The caller drives the
 * toast + dialog close from the returned mutation's own `onSuccess`/`onError`.
 */
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

  const useList = () => useQuery(listQuery());

  const useInvalidate = () => {
    const queryClient = useQueryClient();
    return () => queryClient.invalidateQueries({ queryKey: keys.all });
  };

  const useCreate = () => {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: (input: Input) => api.create(input),
      onSuccess: invalidate,
    });
  };

  const useUpdate = () => {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: ({ id, input }: { id: string; input: Input }) => api.update(id, input),
      onSuccess: invalidate,
    });
  };

  const useRemove = () => {
    const invalidate = useInvalidate();
    return useMutation({
      mutationFn: (id: string) => api.remove(id),
      onSuccess: invalidate,
    });
  };

  return { listQuery, useList, useCreate, useUpdate, useRemove };
}
