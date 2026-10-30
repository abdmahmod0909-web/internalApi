import { create } from 'zustand';
import type {
  Workspace,
  Collection,
  Folder,
  Environment,
  ApiRequestData,
  ApiResponseData,
  HttpMethod,
  TestResultItem,
} from '@internalapi/shared';
import { executeScript } from '@internalapi/shared';

export interface TabItem {
  id: string;
  name: string;
  request: ApiRequestData;
  isDirty: boolean;
  isLoading: boolean;
  response?: ApiResponseData;
  testResults?: TestResultItem[];
  scriptLogs?: string[];
}

const DEFAULT_NEW_REQUEST: ApiRequestData = {
  name: '',
  method: 'GET',
  url: '',
  queryParams: [],
  headers: [],
  pathVars: [],
  auth: { type: 'none' },
  bodyType: 'none',
  bodyContent: '',
  settings: {
    timeoutMs: 30000,
    followRedirects: true,
    verifySsl: true,
  },
};

interface AppState {
  workspaces: Workspace[];
  activeWorkspaceId: string;
  environments: Environment[];
  activeEnvironmentId: string | null;
  collections: Collection[];
  history: any[];
  tabs: TabItem[];
  activeTabId: string;
  isCommandPaletteOpen: boolean;
  isEnvModalOpen: boolean;
  isImportModalOpen: boolean;
  theme: 'dark' | 'midnight' | 'light';
  splitRatio: number;
  layout: 'horizontal' | 'vertical';

  // Actions
  setCommandPaletteOpen: (open: boolean) => void;
  setEnvModalOpen: (open: boolean) => void;
  setImportModalOpen: (open: boolean) => void;
  setTheme: (theme: 'dark' | 'midnight' | 'light') => void;
  setSplitRatio: (ratio: number) => void;
  setLayout: (layout: 'horizontal' | 'vertical') => void;
  loadInitialData: () => Promise<void>;
  setActiveEnvironmentId: (id: string | null) => void;
  openTab: (request?: Partial<ApiRequestData>, customId?: string) => void;
  closeTab: (tabId: string) => void;
  setActiveTabId: (tabId: string) => void;
  updateActiveRequest: (updater: (prev: ApiRequestData) => ApiRequestData) => void;
  sendRequest: (tabId?: string) => Promise<void>;
  saveCurrentRequest: (collectionId?: string, folderId?: string | null) => Promise<void>;
  saveEnvironment: (env: Environment) => Promise<void>;
  deleteEnvironment: (id: string) => Promise<void>;
  loadCollections: () => Promise<void>;
  createCollection: (name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  renameCollection: (id: string, name: string) => Promise<void>;
  addFolder: (collectionId: string, folderName: string) => Promise<void>;
  renameFolder: (collectionId: string, folderId: string, name: string) => Promise<void>;
  deleteFolder: (collectionId: string, folderId: string) => Promise<void>;
  addRequestToCollection: (collectionId: string, folderId: string | null, name?: string) => Promise<void>;
  deleteRequestFromCollection: (collectionId: string, folderId: string | null, requestId: string) => Promise<void>;
  renameRequestInCollection: (collectionId: string, folderId: string | null, requestId: string, name: string) => Promise<void>;
  refreshHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

function getStoredItem(key: string, fallback: string): string {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key) || fallback;
    }
  } catch {}
  return fallback;
}

function setStoredItem(key: string, value: string): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {}
}

function getInitialTabs(): TabItem[] {
  const saved = getStoredItem('internalapi_tabs', '');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((t) => {
          // If a saved tab was just the old untouched default dummy request, clean it to empty
          if (t.request?.url === 'https://httpbin.org/get' && !t.isDirty) {
            return {
              ...t,
              name: '',
              request: { ...DEFAULT_NEW_REQUEST },
              isLoading: false,
            };
          }
          return { ...t, isLoading: false };
        });
      }
    } catch {}
  }
  return [
    {
      id: 'tab-1',
      name: '',
      request: { ...DEFAULT_NEW_REQUEST },
      isDirty: false,
      isLoading: false,
    },
  ];
}

function getInitialCollections(): Collection[] {
  const saved = getStoredItem('internalapi_collections', '');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

function getInitialEnvironments(): Environment[] {
  const saved = getStoredItem('internalapi_environments', '');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch {}
  }
  return [];
}

const initialTabs = getInitialTabs();
const initialActiveTabId = getStoredItem('internalapi_active_tab_id', initialTabs[0]?.id || 'tab-1');

export const useAppStore = create<AppState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: 'ws-default-company',
  environments: getInitialEnvironments(),
  activeEnvironmentId: 'env-development',
  collections: getInitialCollections(),
  history: [],
  tabs: initialTabs,
  activeTabId: initialActiveTabId,
  isCommandPaletteOpen: false,
  isEnvModalOpen: false,
  isImportModalOpen: false,
  theme: (getStoredItem('internalapi_theme', 'dark') as any),
  splitRatio: parseFloat(getStoredItem('internalapi_split_ratio', '50')),
  layout: (getStoredItem('internalapi_layout', 'horizontal') as any),

  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setEnvModalOpen: (open) => set({ isEnvModalOpen: open }),
  setImportModalOpen: (open) => set({ isImportModalOpen: open }),
  setTheme: (theme) => {
    setStoredItem('internalapi_theme', theme);
    if (typeof document !== 'undefined') {
      document.documentElement.className = `theme-${theme}`;
    }
    set({ theme });
  },
  setSplitRatio: (ratio) => {
    setStoredItem('internalapi_split_ratio', String(ratio));
    set({ splitRatio: ratio });
  },
  setLayout: (layout) => {
    setStoredItem('internalapi_layout', layout);
    set({ layout });
  },

  loadInitialData: async () => {
    try {
      const [wsRes, envRes, colRes, histRes] = await Promise.all([
        fetch('/api/workspaces').then((r) => r.json()).catch(() => []),
        fetch('/api/environments').then((r) => r.json()).catch(() => []),
        fetch('/api/collections').then((r) => r.json()).catch(() => []),
        fetch('/api/history').then((r) => r.json()).catch(() => []),
      ]);

      const workspaces = Array.isArray(wsRes) ? wsRes : [];
      const fetchedEnvs = Array.isArray(envRes) ? envRes : [];
      const fetchedCols = Array.isArray(colRes) ? colRes : [];
      const history = Array.isArray(histRes) ? histRes : [];

      const environments = fetchedEnvs.length > 0 ? fetchedEnvs : get().environments;
      const collections = fetchedCols.length > 0 ? fetchedCols : get().collections;

      set({
        workspaces,
        environments,
        collections,
        history,
        activeEnvironmentId: environments.length > 0 ? environments[0].id : null,
      });

      setStoredItem('internalapi_collections', JSON.stringify(collections));
      setStoredItem('internalapi_environments', JSON.stringify(environments));
    } catch (e) {
      console.error('Failed to load initial data:', e);
    }
  },

  setActiveEnvironmentId: (id) => {
    set({ activeEnvironmentId: id });
    setStoredItem('internalapi_active_env_id', id || '');
    get().loadCollections();
  },

  loadCollections: async () => {
    const { activeWorkspaceId, activeEnvironmentId } = get();
    const envParam = activeEnvironmentId ? `&environmentId=${activeEnvironmentId}` : '';
    try {
      const res = await fetch(`/api/collections?workspaceId=${activeWorkspaceId}${envParam}`).then((r) => r.json());
      if (Array.isArray(res)) {
        set({ collections: res });
        setStoredItem('internalapi_collections', JSON.stringify(res));
      }
    } catch (e) {
      console.error('Failed to load collections:', e);
    }
  },

  openTab: (partialRequest, customId) => {
    const tabs = get().tabs;
    const tabId = customId || `tab-${Date.now()}`;

    // If already open, switch to it
    const existing = tabs.find((t) => t.id === tabId);
    if (existing) {
      set({ activeTabId: tabId });
      setStoredItem('internalapi_active_tab_id', tabId);
      return;
    }

    const newReq: ApiRequestData = {
      ...DEFAULT_NEW_REQUEST,
      ...partialRequest,
    };

    const nextTabs: TabItem[] = [
      ...tabs,
      {
        id: tabId,
        name: newReq.name || '',
        request: newReq,
        isDirty: false,
        isLoading: false,
      },
    ];

    set({
      tabs: nextTabs,
      activeTabId: tabId,
    });
    setStoredItem('internalapi_tabs', JSON.stringify(nextTabs));
    setStoredItem('internalapi_active_tab_id', tabId);
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) {
      const resetTabs = [
        {
          id: `tab-${Date.now()}`,
          name: '',
          request: { ...DEFAULT_NEW_REQUEST },
          isDirty: false,
          isLoading: false,
        },
      ];
      set({ tabs: resetTabs, activeTabId: resetTabs[0].id });
      setStoredItem('internalapi_tabs', JSON.stringify(resetTabs));
      setStoredItem('internalapi_active_tab_id', resetTabs[0].id);
      return;
    }

    const filtered = tabs.filter((t) => t.id !== tabId);
    let nextActive = activeTabId;
    if (activeTabId === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId);
      nextActive = (filtered[idx] || filtered[filtered.length - 1]).id;
    }

    set({ tabs: filtered, activeTabId: nextActive });
    setStoredItem('internalapi_tabs', JSON.stringify(filtered));
    setStoredItem('internalapi_active_tab_id', nextActive);
  },

  setActiveTabId: (tabId) => {
    set({ activeTabId: tabId });
    setStoredItem('internalapi_active_tab_id', tabId);
  },

  updateActiveRequest: (updater) => {
    const { tabs, activeTabId } = get();
    const updatedTabs = tabs.map((tab) => {
      if (tab.id === activeTabId) {
        const updated = updater(tab.request);
        return {
          ...tab,
          request: updated,
          name: updated.name,
          isDirty: true,
        };
      }
      return tab;
    });

    set({ tabs: updatedTabs });
    setStoredItem('internalapi_tabs', JSON.stringify(updatedTabs));
  },

  sendRequest: async (targetTabId) => {
    const { tabs, activeTabId, activeEnvironmentId, activeWorkspaceId, environments, saveEnvironment } = get();
    const tabId = targetTabId || activeTabId;
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Set loading
    set({
      tabs: tabs.map((t) => (t.id === tabId ? { ...t, isLoading: true, testResults: undefined } : t)),
    });

    const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
    const envVars: Record<string, string> = {};
    if (activeEnv) {
      for (const v of activeEnv.variables) {
        if (v.isEnabled && v.key) envVars[v.key] = v.value;
      }
    }

    // 1. Run Pre-request Script if defined
    if (tab.request.preScript) {
      const preResult = executeScript(tab.request.preScript, {
        environment: envVars,
        variables: {},
        request: {
          url: tab.request.url,
          method: tab.request.method,
          headers: (tab.request.headers || []).reduce((acc, h) => {
            if (h.isEnabled && h.key) acc[h.key] = h.value;
            return acc;
          }, {} as Record<string, string>),
          body: tab.request.bodyContent,
        },
      });

      // Apply environment updates from pre-request script
      if (activeEnv && Object.keys(preResult.environmentMutations).length > 0) {
        const updatedVars = [...activeEnv.variables];
        for (const [k, val] of Object.entries(preResult.environmentMutations)) {
          const strVal = String(val);
          const idx = updatedVars.findIndex((v) => v.key === k);
          if (idx >= 0) {
            updatedVars[idx] = { ...updatedVars[idx], value: strVal };
          } else {
            updatedVars.push({ id: `v-${Date.now()}-${k}`, key: k, value: strVal, isSecret: false, isEnabled: true });
          }
        }
        saveEnvironment({ ...activeEnv, variables: updatedVars });
      }
    }

    try {
      const res = await fetch('/api/proxy/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: tab.request,
          environmentId: activeEnvironmentId,
          workspaceId: activeWorkspaceId,
        }),
      });

      const responseData: ApiResponseData = await res.json();

      // 2. Run Tests / Post-response Script if defined
      let testResults: TestResultItem[] = [];
      let scriptLogs: string[] = [];

      if (tab.request.postScript && responseData) {
        const postResult = executeScript(tab.request.postScript, {
          environment: envVars,
          variables: {},
          request: {
            url: tab.request.url,
            method: tab.request.method,
            headers: (tab.request.headers || []).reduce((acc, h) => {
              if (h.isEnabled && h.key) acc[h.key] = h.value;
              return acc;
            }, {} as Record<string, string>),
          },
          response: {
            status: responseData.status,
            statusText: responseData.statusText,
            headers: responseData.headers,
            body: responseData.body,
            time: responseData.time,
          },
        });

        testResults = postResult.tests;
        scriptLogs = postResult.logs;

        // Apply environment updates from tests script
        if (activeEnv && Object.keys(postResult.environmentMutations).length > 0) {
          const updatedVars = [...activeEnv.variables];
          for (const [k, val] of Object.entries(postResult.environmentMutations)) {
            const strVal = String(val);
            const idx = updatedVars.findIndex((v) => v.key === k);
            if (idx >= 0) {
              updatedVars[idx] = { ...updatedVars[idx], value: strVal };
            } else {
              updatedVars.push({ id: `v-${Date.now()}-${k}`, key: k, value: strVal, isSecret: false, isEnabled: true });
            }
          }
          saveEnvironment({ ...activeEnv, variables: updatedVars });
        }
      }

      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId
            ? {
                ...t,
                response: responseData,
                testResults: testResults.length > 0 ? testResults : undefined,
                scriptLogs: scriptLogs.length > 0 ? scriptLogs : undefined,
                isLoading: false,
              }
            : t
        ),
      }));

      // Refresh history list
      get().refreshHistory();
    } catch (err: any) {
      set((state) => ({
        tabs: state.tabs.map((t) =>
          t.id === tabId
            ? {
                ...t,
                isLoading: false,
                response: {
                  status: 0,
                  statusText: 'Error',
                  headers: {},
                  cookies: [],
                  body: '',
                  size: 0,
                  time: 0,
                  error: err.message || 'Request execution failed',
                },
              }
            : t
        ),
      }));
    }
  },

  saveCurrentRequest: async (collectionId, folderId) => {
    const { tabs, activeTabId, collections } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    const req = activeTab.request;
    const colId = collectionId || req.collectionId || collections[0]?.id;
    if (!colId) return;

    const targetCol = collections.find((c) => c.id === colId);
    if (!targetCol) return;

    const updatedCol = { ...targetCol };
    const savedReq: ApiRequestData = {
      ...req,
      name: req.name?.trim() || 'Untitled Request',
      id: req.id || `req-${Date.now()}`,
      collectionId: colId,
      folderId: folderId ?? req.folderId ?? null,
    };

    if (savedReq.folderId) {
      updatedCol.folders = updatedCol.folders.map((f) => {
        if (f.id === savedReq.folderId) {
          const reqs = f.requests || [];
          const idx = reqs.findIndex((r) => r.id === savedReq.id);
          const next = idx >= 0 ? [...reqs] : [...reqs, savedReq];
          if (idx >= 0) next[idx] = savedReq;
          return { ...f, requests: next };
        }
        return f;
      });
    } else {
      const reqs = updatedCol.requests || [];
      const idx = reqs.findIndex((r) => r.id === savedReq.id);
      const next = idx >= 0 ? [...reqs] : [...reqs, savedReq];
      if (idx >= 0) next[idx] = savedReq;
      updatedCol.requests = next;
    }

    // Save to backend
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await fetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCol),
    });
    const saved = await res.json();

    const nextCollections = collections.map((c) => (c.id === saved.id ? saved : c));
    const nextTabs = tabs.map((t) =>
      t.id === activeTabId ? { ...t, request: savedReq, isDirty: false } : t
    );

    set({ collections: nextCollections, tabs: nextTabs });
    setStoredItem('internalapi_collections', JSON.stringify(nextCollections));
    setStoredItem('internalapi_tabs', JSON.stringify(nextTabs));
  },

  saveEnvironment: async (env) => {
    const res = await fetch('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(env),
    });
    const saved = await res.json();
    const currentEnvs = get().environments;
    const idx = currentEnvs.findIndex((e) => e.id === saved.id);
    const next = [...currentEnvs];
    if (idx >= 0) next[idx] = saved;
    else next.push(saved);

    set({ environments: next });
    setStoredItem('internalapi_environments', JSON.stringify(next));

    // Reload collections for active environment in case DB config was updated
    if (get().activeEnvironmentId === saved.id || !get().activeEnvironmentId) {
      get().loadCollections();
    }
  },

  deleteEnvironment: async (id) => {
    await fetch(`/api/environments/${id}`, { method: 'DELETE' });
    const next = get().environments.filter((e) => e.id !== id);
    set({
      environments: next,
      activeEnvironmentId: get().activeEnvironmentId === id ? null : get().activeEnvironmentId,
    });
    setStoredItem('internalapi_environments', JSON.stringify(next));
  },

  createCollection: async (name) => {
    const { activeWorkspaceId } = get();
    const newCol: Collection = {
      id: `col-${Date.now()}`,
      workspaceId: activeWorkspaceId,
      name,
      sortOrder: 0,
      folders: [],
      requests: [],
    };
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await fetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCol),
    });
    const saved = await res.json();
    const next = [...get().collections, saved];
    set({ collections: next });
    setStoredItem('internalapi_collections', JSON.stringify(next));
  },

  deleteCollection: async (id) => {
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    await fetch(`/api/collections/${id}${envParam}`, { method: 'DELETE' });
    const next = get().collections.filter((c) => c.id !== id);
    set({ collections: next });
    setStoredItem('internalapi_collections', JSON.stringify(next));
  },

  renameCollection: async (id, name) => {
    const col = get().collections.find((c) => c.id === id);
    if (!col) return;
    const updated = { ...col, name };
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await fetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const saved = await res.json();
    const next = get().collections.map((c) => (c.id === id ? saved : c));
    set({ collections: next });
    setStoredItem('internalapi_collections', JSON.stringify(next));
  },

  addFolder: async (collectionId, folderName) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const newFolder: Folder = {
      id: `fld-${Date.now()}`,
      collectionId,
      name: folderName,
      sortOrder: col.folders?.length || 0,
      requests: [],
    };
    const updated = {
      ...col,
      folders: [...(col.folders || []), newFolder],
    };
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await fetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const saved = await res.json();
    const next = get().collections.map((c) => (c.id === collectionId ? saved : c));
    set({ collections: next });
    setStoredItem('internalapi_collections', JSON.stringify(next));
  },

  renameFolder: async (collectionId, folderId, name) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const updated = {
      ...col,
      folders: (col.folders || []).map((f) => (f.id === folderId ? { ...f, name } : f)),
    };
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await fetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const saved = await res.json();
    const next = get().collections.map((c) => (c.id === collectionId ? saved : c));
    set({ collections: next });
    setStoredItem('internalapi_collections', JSON.stringify(next));
  },

  deleteFolder: async (collectionId, folderId) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const updated = {
      ...col,
      folders: (col.folders || []).filter((f) => f.id !== folderId),
    };
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await fetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const saved = await res.json();
    const next = get().collections.map((c) => (c.id === collectionId ? saved : c));
    set({ collections: next });
    setStoredItem('internalapi_collections', JSON.stringify(next));
  },

  addRequestToCollection: async (collectionId, folderId, name = 'New Request') => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const newReq: ApiRequestData = {
      ...DEFAULT_NEW_REQUEST,
      id: `req-${Date.now()}`,
      name,
      collectionId,
      folderId,
    };
    const updated = { ...col };
    if (folderId) {
      updated.folders = (updated.folders || []).map((f) =>
        f.id === folderId ? { ...f, requests: [...(f.requests || []), newReq] } : f
      );
    } else {
      updated.requests = [...(updated.requests || []), newReq];
    }
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await fetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const saved = await res.json();
    const next = get().collections.map((c) => (c.id === collectionId ? saved : c));
    set({ collections: next });
    setStoredItem('internalapi_collections', JSON.stringify(next));
    get().openTab(newReq, newReq.id);
  },

  deleteRequestFromCollection: async (collectionId, folderId, requestId) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const updated = { ...col };
    if (folderId) {
      updated.folders = (updated.folders || []).map((f) =>
        f.id === folderId ? { ...f, requests: (f.requests || []).filter((r) => r.id !== requestId) } : f
      );
    } else {
      updated.requests = (updated.requests || []).filter((r) => r.id !== requestId);
    }
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await fetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const saved = await res.json();
    const next = get().collections.map((c) => (c.id === collectionId ? saved : c));
    set({ collections: next });
    setStoredItem('internalapi_collections', JSON.stringify(next));
  },

  renameRequestInCollection: async (collectionId, folderId, requestId, name) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const updated = { ...col };
    if (folderId) {
      updated.folders = (updated.folders || []).map((f) =>
        f.id === folderId
          ? {
              ...f,
              requests: (f.requests || []).map((r) => (r.id === requestId ? { ...r, name } : r)),
            }
          : f
      );
    } else {
      updated.requests = (updated.requests || []).map((r) =>
        r.id === requestId ? { ...r, name } : r
      );
    }
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await fetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const saved = await res.json();
    const next = get().collections.map((c) => (c.id === collectionId ? saved : c));

    // Also update open tabs matching this request
    const nextTabs = get().tabs.map((t) =>
      t.request.id === requestId ? { ...t, name, request: { ...t.request, name } } : t
    );

    set({ collections: next, tabs: nextTabs });
    setStoredItem('internalapi_collections', JSON.stringify(next));
    setStoredItem('internalapi_tabs', JSON.stringify(nextTabs));
  },

  refreshHistory: async () => {
    const { activeWorkspaceId } = get();
    const res = await fetch(`/api/history?workspaceId=${activeWorkspaceId}`).then((r) => r.json());
    if (Array.isArray(res)) {
      set({ history: res });
    }
  },

  clearHistory: async () => {
    const { activeWorkspaceId } = get();
    await fetch(`/api/history?workspaceId=${activeWorkspaceId}`, { method: 'DELETE' });
    set({ history: [] });
  },
}));

