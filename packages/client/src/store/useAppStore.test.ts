import { describe, it, expect } from 'vitest';
import { useAppStore } from './useAppStore.js';

describe('Client Zustand Store', () => {
  it('opens and closes tabs properly', () => {
    const store = useAppStore.getState();

    expect(store.tabs.length).toBeGreaterThan(0);

    store.openTab({ name: 'Custom User Request', method: 'POST', url: 'https://example.com/api' });
    const currentTabs = useAppStore.getState().tabs;
    expect(currentTabs.some((t) => t.name === 'Custom User Request')).toBe(true);

    const targetTab = currentTabs.find((t) => t.name === 'Custom User Request')!;
    store.closeTab(targetTab.id);

    const remainingTabs = useAppStore.getState().tabs;
    expect(remainingTabs.some((t) => t.id === targetTab.id)).toBe(false);
  });

  it('updates active request method and URL', () => {
    const store = useAppStore.getState();
    store.updateActiveRequest((prev) => ({
      ...prev,
      method: 'DELETE',
      url: 'https://httpbin.org/delete',
    }));

    const activeTab = useAppStore.getState().tabs.find((t) => t.id === useAppStore.getState().activeTabId);
    expect(activeTab?.request.method).toBe('DELETE');
    expect(activeTab?.request.url).toBe('https://httpbin.org/delete');
  });

  it('prevents sendRequest when URL is empty or whitespace', async () => {
    const store = useAppStore.getState();
    store.updateActiveRequest((prev) => ({
      ...prev,
      url: '   ',
    }));

    await store.sendRequest();

    const activeTab = useAppStore.getState().tabs.find((t) => t.id === useAppStore.getState().activeTabId);
    expect(activeTab?.isLoading).toBe(false);
    expect(activeTab?.response).toBeUndefined();
  });
});

