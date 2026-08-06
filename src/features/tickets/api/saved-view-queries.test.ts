import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  savedViewKeys,
  savedViewQueries,
  useCreateSavedView,
  useRemoveSavedView,
  useSavedViews,
  useSetSavedViewShared,
} from '~/features/tickets/api/saved-view-queries';
import { renderHookWithInvalidateSpy, renderHookWithProviders, waitFor } from '~/testing/render';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  setShared: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('~/features/tickets/api/saved-view-api', () => ({
  savedViewApi: {
    list: mocks.list,
    create: mocks.create,
    setShared: mocks.setShared,
    remove: mocks.remove,
  },
}));

const VIEW = { id: 'v1', name: 'My open', isShared: false };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.list.mockResolvedValue([VIEW]);
  mocks.create.mockResolvedValue(VIEW);
  mocks.setShared.mockResolvedValue({ ...VIEW, isShared: true });
  mocks.remove.mockResolvedValue(undefined);
});

describe('savedViewQueries', () => {
  it('scopes the list key under the saved-view namespace', () => {
    expect(savedViewQueries.list().queryKey).toEqual(savedViewKeys.list());
    expect(savedViewKeys.list()[0]).toBe(savedViewKeys.all[0]);
  });

  it('loads the saved views through the api', async () => {
    const { result } = renderHookWithProviders(() => useSavedViews());

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual([VIEW]);
    expect(mocks.list).toHaveBeenCalled();
  });
});

describe('useCreateSavedView', () => {
  it('creates the view and refreshes the list', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(useCreateSavedView);

    result.current.mutate({ name: 'My open', search: {} } as never);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.create).toHaveBeenCalledWith({ name: 'My open', search: {} });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: savedViewKeys.list() });
  });

  it('leaves the list alone when the api rejects', async () => {
    mocks.create.mockRejectedValue(new Error('duplicate'));
    const { result, invalidate } = renderHookWithInvalidateSpy(useCreateSavedView);

    result.current.mutate({ name: 'My open', search: {} } as never);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(invalidate).not.toHaveBeenCalled();
  });
});

describe('useSetSavedViewShared', () => {
  it('forwards the id and the new sharing flag', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(useSetSavedViewShared);

    result.current.mutate({ id: 'v1', isShared: true });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.setShared).toHaveBeenCalledWith('v1', true);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: savedViewKeys.list() });
  });
});

describe('useRemoveSavedView', () => {
  it('removes the view and refreshes the list', async () => {
    const { result, invalidate } = renderHookWithInvalidateSpy(useRemoveSavedView);

    result.current.mutate('v1');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mocks.remove).toHaveBeenCalledWith('v1');
    expect(invalidate).toHaveBeenCalledWith({ queryKey: savedViewKeys.list() });
  });
});
