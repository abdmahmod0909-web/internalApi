import { create } from 'zustand';
import type {
  Workspace,
  Collection,
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
  name: 'Untitled Request',
  method: 'GET',
  url: 'https://httpbin.org/get',
  queryParams: [{ id: '1', key: '', value: '', isEnabled: true }],
  headers: [{ id: '1', key: 'Accept', value: 'application/json', isEnabled: true }],
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

  // Actions
  setCommandPaletteOpen: (open: boolean) => void;
  setEnvModalOpen: (open: boolean) => void;
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
  createCollection: (name: string) => Promise<void>;
  deleteCollection: (id: string) => Promise<void>;
  refreshHistory: () => Promise<void>;
  clearHistory: () => Promise<void>;
}

export const useAppStore = create<AppState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: 'ws-default-company',
  environments: [],
  activeEnvironmentId: 'env-development',
  collections: [],
  history: [],
  tabs: [
    {
      id: 'tab-1',
      name: 'Untitled Request',
      request: { ...DEFAULT_NEW_REQUEST },
      isDirty: false,
      isLoading: false,
    },
  ],
  activeTabId: 'tab-1',
  isCommandPaletteOpen: false,
  isEnvModalOpen: false,

  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setEnvModalOpen: (open) => set({ isEnvModalOpen: open }),

  loadInitialData: async () => {
    try {
      const [wsRes, envRes, colRes, histRes] = await Promise.all([
        fetch('/api/workspaces').then((r) => r.json()),
        fetch('/api/environments').then((r) => r.json()),
        fetch('/api/collections').then((r) => r.json()),
        fetch('/api/history').then((r) => r.json()),
      ]);

      const workspaces = Array.isArray(wsRes) ? wsRes : [];
      const environments = Array.isArray(envRes) ? envRes : [];
      const collections = Array.isArray(colRes) ? colRes : [];
      const history = Array.isArray(histRes) ? histRes : [];

      set({
        workspaces,
        environments,
        collections,
        history,
        activeEnvironmentId: environments.length > 0 ? environments[0].id : null,
      });
    } catch (e) {
      console.error('Failed to load initial data:', e);
    }
  },

  setActiveEnvironmentId: (id) => set({ activeEnvironmentId: id }),

  openTab: (partialRequest, customId) => {
    const tabs = get().tabs;
    const tabId = customId || `tab-${Date.now()}`;

    // If already open, switch to it
    const existing = tabs.find((t) => t.id === tabId);
    if (existing) {
      set({ activeTabId: tabId });
      return;
    }

    const newReq: ApiRequestData = {
      ...DEFAULT_NEW_REQUEST,
      ...partialRequest,
    };

    set({
      tabs: [
        ...tabs,
        {
          id: tabId,
          name: newReq.name || 'Untitled Request',
          request: newReq,
          isDirty: false,
          isLoading: false,
        },
      ],
      activeTabId: tabId,
    });
  },

  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    if (tabs.length === 1) {
      // Keep at least one empty tab
      set({
        tabs: [
          {
            id: `tab-${Date.now()}`,
            name: 'Untitled Request',
            request: { ...DEFAULT_NEW_REQUEST },
            isDirty: false,
            isLoading: false,
          },
        ],
      });
      return;
    }

    const filtered = tabs.filter((t) => t.id !== tabId);
    let nextActive = activeTabId;
    if (activeTabId === tabId) {
      const idx = tabs.findIndex((t) => t.id === tabId);
      nextActive = (filtered[idx] || filtered[filtered.length - 1]).id;
    }

    set({ tabs: filtered, activeTabId: nextActive });
  },

  setActiveTabId: (tabId) => set({ activeTabId: tabId }),

  updateActiveRequest: (updater) => {
    const { tabs, activeTabId } = get();
    set({
      tabs: tabs.map((tab) => {
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
      }),
    });
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
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCol),
    });
    const saved = await res.json();

    set((state) => ({
      collections: state.collections.map((c) => (c.id === saved.id ? saved : c)),
      tabs: state.tabs.map((t) =>
        t.id === activeTabId ? { ...t, request: savedReq, isDirty: false } : t
      ),
    }));
  },

  saveEnvironment: async (env) => {
    const res = await fetch('/api/environments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(env),
    });
    const saved = await res.json();
    set((state) => {
      const idx = state.environments.findIndex((e) => e.id === saved.id);
      const next = [...state.environments];
      if (idx >= 0) next[idx] = saved;
      else next.push(saved);
      return { environments: next };
    });
  },

  deleteEnvironment: async (id) => {
    await fetch(`/api/environments/${id}`, { method: 'DELETE' });
    set((state) => ({
      environments: state.environments.filter((e) => e.id !== id),
      activeEnvironmentId: state.activeEnvironmentId === id ? null : state.activeEnvironmentId,
    }));
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
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCol),
    });
    const saved = await res.json();
    set((state) => ({ collections: [...state.collections, saved] }));
  },

  deleteCollection: async (id) => {
    await fetch(`/api/collections/${id}`, { method: 'DELETE' });
    set((state) => ({
      collections: state.collections.filter((c) => c.id !== id),
    }));
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

