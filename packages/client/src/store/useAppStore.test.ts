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

  it('manages serverUrl and cloud settings state', () => {
    const store = useAppStore.getState();
    store.setServerUrl('https://api.mycompany.com/');
    expect(useAppStore.getState().serverUrl).toBe('https://api.mycompany.com');

    store.setLoginModalOpen(true);
    expect(useAppStore.getState().isLoginModalOpen).toBe(true);

    store.setTeamModalOpen(true);
    expect(useAppStore.getState().isTeamModalOpen).toBe(true);

    store.setCloudSettingsOpen(true);
    expect(useAppStore.getState().isCloudSettingsOpen).toBe(true);
  });

  it('handles logoutAction cleanly', () => {
    const store = useAppStore.getState();
    // Simulate active session
    useAppStore.setState({
      currentUser: {
        id: 'usr-1',
        email: 'admin@company.com',
        name: 'Admin',
        role: 'admin',
        isActive: true,
        createdAt: '2026-01-01',
      },
      authToken: 'mock-jwt-token',
    });

    expect(useAppStore.getState().currentUser).not.toBeNull();
    store.logoutAction();
    expect(useAppStore.getState().currentUser).toBeNull();
    expect(useAppStore.getState().authToken).toBeNull();
  });

  it('manages closeTabs and resets to a blank tab when all tabs are closed', () => {
    const store = useAppStore.getState();

    // Open two new distinct tabs
    store.openTab({ name: 'Tab A', method: 'GET', url: 'https://example.com/a' });
    store.openTab({ name: 'Tab B', method: 'POST', url: 'https://example.com/b' });

    const currentTabs = useAppStore.getState().tabs;
    const tabA = currentTabs.find((t) => t.name === 'Tab A')!;
    const tabB = currentTabs.find((t) => t.name === 'Tab B')!;
    expect(tabA).toBeDefined();
    expect(tabB).toBeDefined();

    // Close only tabA
    store.closeTabs([tabA.id]);
    let afterClosingA = useAppStore.getState().tabs;
    expect(afterClosingA.some((t) => t.id === tabA.id)).toBe(false);
    expect(afterClosingA.some((t) => t.id === tabB.id)).toBe(true);

    // Close all remaining tabs
    const remainingIds = afterClosingA.map((t) => t.id);
    store.closeTabs(remainingIds);

    const afterClosingAll = useAppStore.getState().tabs;
    expect(afterClosingAll.length).toBe(1);
    expect(afterClosingAll[0].id).toBe(useAppStore.getState().activeTabId);
    expect(afterClosingAll[0].isDirty).toBe(false);
  });

  it('duplicates tab properly with (Copy) name and marked as dirty', () => {
    const store = useAppStore.getState();
    store.openTab({ name: 'Original Query', method: 'GET', url: 'https://example.com/query' });

    const sourceTab = useAppStore.getState().tabs.find((t) => t.name === 'Original Query')!;
    expect(sourceTab).toBeDefined();

    store.duplicateTab(sourceTab.id);

    const updatedTabs = useAppStore.getState().tabs;
    const duplicate = updatedTabs.find((t) => t.name === 'Original Query (Copy)');
    expect(duplicate).toBeDefined();
    expect(duplicate?.isDirty).toBe(true);
    expect(duplicate?.request.url).toBe('https://example.com/query');
    expect(useAppStore.getState().activeTabId).toBe(duplicate?.id);
  });

  it('manages closeUnsavedPreference setting', () => {
    const store = useAppStore.getState();

    store.setCloseUnsavedPreference('save');
    expect(useAppStore.getState().closeUnsavedPreference).toBe('save');

    store.setCloseUnsavedPreference('discard');
    expect(useAppStore.getState().closeUnsavedPreference).toBe('discard');

    store.setCloseUnsavedPreference('ask');
    expect(useAppStore.getState().closeUnsavedPreference).toBe('ask');
  });
});

