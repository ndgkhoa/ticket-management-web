import { describe, expect, it } from 'vitest';

import { usePreferencesStore } from '~/stores/preferences';

describe('preferences store', () => {
  it('updates the persisted page size', () => {
    usePreferencesStore.getState().setPageSize(50);
    expect(usePreferencesStore.getState().pageSize).toBe(50);
  });

  it('toggles the sidebar collapsed flag', () => {
    const before = usePreferencesStore.getState().sidebarCollapsed;
    usePreferencesStore.getState().toggleSidebar();
    expect(usePreferencesStore.getState().sidebarCollapsed).toBe(!before);
  });
});
