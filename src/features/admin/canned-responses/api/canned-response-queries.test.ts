import { beforeEach, describe, expect, it, vi } from 'vitest';

import i18n from '~/i18n';
import {
  cannedResponseListQuery,
  useCannedResponseCreate,
  useCannedResponseList,
  useCannedResponseRemove,
  useCannedResponseUpdate,
} from '~/features/admin/canned-responses/api/canned-response-queries';
import { cannedResponseKeys } from '~/features/admin/canned-responses/constants/canned-response-keys';
import { renderHookWithInvalidateSpy, renderHookWithProviders, waitFor } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  toast: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('~/features/admin/canned-responses/api/canned-response-api', () => ({
  cannedResponseApi: {
    list: mocks.list,
    create: mocks.create,
    update: mocks.update,
    remove: mocks.remove,
  },
}));

vi.mock('sonner', () => ({ toast: mocks.toast }));

const PARAMS = {
  page: 1,
  pageSize: 20,
  sort: { field: 'title', dir: 'asc' },
  filters: {},
} as never;
const ROW = {
  id: 'c1',
  title: 'Acknowledge and set expectations',
  body: 'Thanks for getting in touch',
};
const INPUT = {
  title: 'Acknowledge and set expectations',
  body: 'Thanks for getting in touch',
} as never;

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue({ rows: [ROW], count: 1 });
  mocks.create.mockResolvedValue(ROW);
  mocks.update.mockResolvedValue(ROW);
  mocks.remove.mockResolvedValue(undefined);
});

describe('cannedResponseListQuery', () => {
  it('keys the query by the list params so a filter change refetches', () => {
    const first = cannedResponseListQuery(PARAMS);
    const second = cannedResponseListQuery({ ...(PARAMS as object), page: 2 } as never);

    expect(first.queryKey).toEqual(cannedResponseKeys.list(PARAMS));
    expect(first.queryKey).not.toEqual(second.queryKey);
  });

  it('loads a page through the api', async () => {
    const { result } = renderHookWithProviders(() => useCannedResponseList(PARAMS));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.list).toHaveBeenCalledWith(PARAMS);
    expect(result.current.data).toEqual({ rows: [ROW], count: 1 });
  });
});

describe('useCannedResponseCreate', () => {
  it('creates the row, refreshes the namespace and confirms the save', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(useCannedResponseCreate);

    result.current.mutate(INPUT);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.create).toHaveBeenCalledWith(INPUT);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: cannedResponseKeys.all });
    expect(mocks.toast.success).toHaveBeenCalledWith(i18n.t('Common.Saved'));
  });

  it('stays silent and leaves the cache alone when the api rejects', async () => {
    mocks.create.mockRejectedValue(new Error('title taken'));
    const { result, invalidate } = renderHookWithInvalidateSpy(useCannedResponseCreate);

    result.current.mutate(INPUT);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
    expect(mocks.toast.success).not.toHaveBeenCalled();
  });
});

describe('useCannedResponseUpdate', () => {
  it('sends the id alongside the payload', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(useCannedResponseUpdate);

    result.current.mutate({ id: 'c1', input: INPUT });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.update).toHaveBeenCalledWith('c1', INPUT);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: cannedResponseKeys.all });
    expect(mocks.toast.success).toHaveBeenCalledWith(i18n.t('Common.Saved'));
  });
});

describe('useCannedResponseRemove', () => {
  it('removes the row and confirms the delete with its own message', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(useCannedResponseRemove);

    result.current.mutate('c1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.remove).toHaveBeenCalledWith('c1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: cannedResponseKeys.all });
    expect(mocks.toast.success).toHaveBeenCalledWith(i18n.t('Common.Deleted'));
  });
});
