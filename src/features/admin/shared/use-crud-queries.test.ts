import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';

import i18n from '~/i18n';
import { createCrudQueries } from '~/features/admin/shared/use-crud-queries';
import { renderHookWithInvalidateSpy, renderHookWithProviders, waitFor } from '~/testing/render';

const mocks = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }));

vi.mock('sonner', () => ({ toast: mocks.toast }));

type Tag = { id: string; name: string };
type TagInput = { name: string };

const keys = { all: ['tags'] as const, list: () => ['tags', 'list'] as const };

let api: {
  list: Mock<() => Promise<Tag[]>>;
  create: Mock<(input: TagInput) => Promise<Tag>>;
  update: Mock<(id: string, input: TagInput) => Promise<Tag>>;
  remove: Mock<(id: string) => Promise<void>>;
};
let queries: ReturnType<typeof createCrudQueries<Tag, TagInput>>;

beforeEach(() => {
  vi.clearAllMocks();
  api = {
    list: vi.fn<() => Promise<Tag[]>>().mockResolvedValue([{ id: '1', name: 'regression' }]),
    create: vi
      .fn<(input: TagInput) => Promise<Tag>>()
      .mockResolvedValue({ id: '2', name: 'mobile' }),
    update: vi
      .fn<(id: string, input: TagInput) => Promise<Tag>>()
      .mockResolvedValue({ id: '1', name: 'renamed' }),
    remove: vi.fn<(id: string) => Promise<void>>().mockResolvedValue(undefined),
  };
  queries = createCrudQueries<Tag, TagInput>({ keys, api });
});

describe('createCrudQueries', () => {
  it('exposes query options bound to the list key and loader', () => {
    const options = queries.listQuery();

    expect(options.queryKey).toEqual(['tags', 'list']);
    expect(options.queryFn).toBe(api.list);
  });

  it('loads the rows through the api', async () => {
    const { result } = renderHookWithProviders(() => queries.useList());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([{ id: '1', name: 'regression' }]);
  });

  it('stays idle while disabled', () => {
    const { result } = renderHookWithProviders(() => queries.useList({ enabled: false }));

    expect(api.list).not.toHaveBeenCalled();
    expect(result.current.fetchStatus).toBe('idle');
  });

  it('creates a row, refreshes the cache and confirms the save', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(() => queries.useCreate());

    result.current.mutate({ name: 'mobile' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.create).toHaveBeenCalledWith({ name: 'mobile' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.all });
    expect(mocks.toast.success).toHaveBeenCalledWith(i18n.t('Common.Saved'));
  });

  it('sends the id alongside the payload on update', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(() => queries.useUpdate());

    result.current.mutate({ id: '1', input: { name: 'renamed' } });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.update).toHaveBeenCalledWith('1', { name: 'renamed' });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.all });
    expect(mocks.toast.success).toHaveBeenCalledWith(i18n.t('Common.Saved'));
  });

  it('removes a row and confirms the delete', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(() => queries.useRemove());

    result.current.mutate('1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(api.remove).toHaveBeenCalledWith('1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: keys.all });
    expect(mocks.toast.success).toHaveBeenCalledWith(i18n.t('Common.Deleted'));
  });

  it('leaves the cache alone and stays silent when the api rejects', async () => {
    api.create.mockRejectedValue(new Error('duplicate name'));
    const { result, invalidate } = renderHookWithInvalidateSpy(() => queries.useCreate());

    result.current.mutate({ name: 'mobile' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('duplicate name');
    expect(invalidate).not.toHaveBeenCalled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
  });
});
