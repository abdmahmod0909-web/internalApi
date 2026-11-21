import { create } from 'zustand';
import type {
  Workspace,
  Collection,
  Folder,
  Environment,
  ApiRequestData,
  ApiResponseData,
  HttpMethod,
  KeyValueItem,
  TestResultItem,
  Flow,
  FlowNode,
  FlowNodeType,
  FlowExecutionReport,
  FlowStepLog,
  User,
  UserRole,
  UserPermissions,
  CollectionVariable,
} from '@internalapi/shared';
import { executeScript, interpolateVariables, resolveUserPermissions } from '@internalapi/shared';
import { downloadCollectionAsJson } from '../utils/export-collection.js';

export interface TabItem {
  id: string;
  name: string;
  type?: 'request' | 'collection';
  collectionId?: string;
  request: ApiRequestData;
  isDirty: boolean;
  isLoading: boolean;
  response?: ApiResponseData;
  testResults?: TestResultItem[];
  scriptLogs?: string[];
}

export interface OtaInfo {
  hasUpdate: boolean;
  currentVersion: string;
  latestVersion?: string;
  isOtaActive?: boolean;
  releaseName?: string;
  releaseNotes?: string;
  publishedAt?: string;
  assetName?: string;
  assetUrl?: string;
  assetSize?: number;
  message?: string;
}

export const DEFAULT_POSTMAN_HEADERS: KeyValueItem[] = [
  { id: 'hdr-def-1', key: 'User-Agent', value: 'PostmanRuntime/7.39.0', isEnabled: true },
  { id: 'hdr-def-2', key: 'Accept', value: '*/*', isEnabled: true },
  { id: 'hdr-def-3', key: 'Accept-Encoding', value: 'gzip, deflate, br', isEnabled: true },
  { id: 'hdr-def-4', key: 'Connection', value: 'keep-alive', isEnabled: true },
];

const DEFAULT_NEW_REQUEST: ApiRequestData = {
  name: '',
  method: 'GET',
  url: '',
  queryParams: [],
  headers: [
    { id: 'hdr-def-1', key: 'User-Agent', value: 'PostmanRuntime/7.39.0', isEnabled: true },
    { id: 'hdr-def-2', key: 'Accept', value: '*/*', isEnabled: true },
    { id: 'hdr-def-3', key: 'Accept-Encoding', value: 'gzip, deflate, br', isEnabled: true },
    { id: 'hdr-def-4', key: 'Connection', value: 'keep-alive', isEnabled: true },
  ],
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
  isWorkspaceModalOpen: boolean;
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

  // Flows state
  activeView: 'requests' | 'flows';
  flows: Flow[];
  activeFlowId: string | null;
  flowReport: FlowExecutionReport | null;
  isFlowRunning: boolean;

  // OTA Hot Push state
  otaInfo: OtaInfo | null;
  isOtaModalOpen: boolean;
  isApplyingOta: boolean;
  setOtaModalOpen: (open: boolean) => void;
  checkOtaUpdates: () => Promise<void>;
  applyOtaUpdateAction: () => Promise<boolean>;
  revertOtaAction: () => Promise<void>;

  // User Authentication & Cloud Sync
  currentUser: User | null;
  authToken: string | null;
  serverUrl: string;
  isLoginModalOpen: boolean;
  isTeamModalOpen: boolean;
  isProfileModalOpen: boolean;
  isCloudSettingsOpen: boolean;
  teamUsers: User[];
  syncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  syncMessage: string;

  setServerUrl: (url: string) => void;
  setLoginModalOpen: (open: boolean) => void;
  setTeamModalOpen: (open: boolean) => void;
  setProfileModalOpen: (open: boolean) => void;
  setCloudSettingsOpen: (open: boolean) => void;
  loginAction: (email: string, password: string, serverUrl?: string) => Promise<{ success: boolean; error?: string }>;
  logoutAction: () => void;
  fetchTeamUsersAction: () => Promise<void>;
  createTeamUserAction: (data: { email: string; name: string; password: string; role?: UserRole; workspaceIds?: string[]; permissions?: Partial<UserPermissions> }) => Promise<{ success: boolean; error?: string }>;
  updateTeamUserAction: (id: string, data: { name?: string; role?: UserRole; workspaceIds?: string[]; isActive?: boolean; permissions?: Partial<UserPermissions> }) => Promise<{ success: boolean; error?: string }>;
  deleteTeamUserAction: (id: string) => Promise<{ success: boolean; error?: string }>;
  adminResetPasswordAction: (userId: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
  updateProfileAction: (params: { name?: string; oldPassword?: string; newPassword?: string }) => Promise<{ success: boolean; error?: string }>;
  syncLocalToCloudAction: () => Promise<{ success: boolean; message: string }>;
  syncCloudToLocalAction: () => Promise<{ success: boolean; message: string }>;
  getUserPermissions: () => UserPermissions;

  // Actions
  setCommandPaletteOpen: (open: boolean) => void;
  setEnvModalOpen: (open: boolean) => void;
  setImportModalOpen: (open: boolean) => void;
  isExportModalOpen: boolean;
  setExportModalOpen: (open: boolean) => void;
  exportCollectionAction: (collectionId: string) => void;
  setWorkspaceModalOpen: (open: boolean) => void;
  setTheme: (theme: 'dark' | 'midnight' | 'light') => void;
  setSplitRatio: (ratio: number) => void;
  setLayout: (layout: 'horizontal' | 'vertical') => void;
  setActiveView: (view: 'requests' | 'flows') => void;
  loadInitialData: () => Promise<void>;
  setActiveEnvironmentId: (id: string | null) => void;

  // Workspaces actions
  createWorkspace: (name: string, description?: string) => Promise<Workspace | undefined>;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  deleteWorkspace: (workspaceId: string) => Promise<void>;

  // Flows actions
  loadFlows: () => Promise<void>;
  setActiveFlowId: (id: string | null) => void;
  createFlow: (name?: string, description?: string, template?: 'blank' | 'auth_fetch' | 'create_verify') => Promise<Flow | undefined>;
  saveFlow: (flow: Flow) => Promise<void>;
  deleteFlow: (id: string) => Promise<void>;
  runFlow: (flowId: string) => Promise<void>;
  stopFlow: () => void;

  openTab: (request?: Partial<ApiRequestData>, customId?: string) => void;
  openCollectionTab: (collectionId: string) => void;
  saveCollectionSettings: (col: Collection) => Promise<boolean>;
  closeTab: (tabId: string) => void;
  closeTabs: (tabIds: string[]) => void;
  duplicateTab: (tabId: string) => void;
  saveTabRequest: (tabId: string, collectionId?: string, folderId?: string | null) => Promise<boolean>;
  closeUnsavedPreference: 'ask' | 'save' | 'discard';
  setCloseUnsavedPreference: (pref: 'ask' | 'save' | 'discard') => void;
  setActiveTabId: (tabId: string) => void;
  updateActiveRequest: (updater: (prev: ApiRequestData) => ApiRequestData) => void;
  sendRequest: (tabId?: string) => Promise<void>;
  cancelRequest: (tabId?: string) => void;
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

export function getApiBaseUrl(): string {
  const custom = getStoredItem('internalapi_server_url', '');
  if (custom && custom.trim()) {
    return custom.trim().replace(/\/+$/, '');
  }
  return '';
}

export function getAuthToken(): string {
  return getStoredItem('internalapi_auth_token', '');
}

export function getInitialUser(): User | null {
  const saved = getStoredItem('internalapi_user', '');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {}
  }
  return null;
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const baseUrl = getApiBaseUrl();
  const fullUrl = baseUrl ? `${baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}` : endpoint;
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  return fetch(fullUrl, {
    ...options,
    headers,
  });
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
  const token = getAuthToken();
  if (!token) return [];
  const saved = getStoredItem('internalapi_collections', '');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (c: any) =>
            c &&
            typeof c === 'object' &&
            c.id &&
            typeof c.id === 'string' &&
            c.name &&
            typeof c.name === 'string' &&
            !c.error &&
            !c.statusCode
        );
      }
    } catch {}
  }
  return [];
}

function getInitialEnvironments(): Environment[] {
  const token = getAuthToken();
  if (!token) return [];
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

// In-flight request abort controllers per tab
const inFlightControllers = new Map<string, AbortController>();

function notifySyncChannel() {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    try {
      const ch = new BroadcastChannel('internalapi_sync');
      ch.postMessage({ type: 'sync_collections', timestamp: Date.now() });
      ch.close();
    } catch (_) {}
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: getStoredItem('internalapi_active_workspace_id', 'ws-default-company'),
  isWorkspaceModalOpen: false,
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
  closeUnsavedPreference: ((getStoredItem('internalapi_close_unsaved_pref', 'ask') as any) || 'ask'),
  setCloseUnsavedPreference: (pref: 'ask' | 'save' | 'discard') => {
    setStoredItem('internalapi_close_unsaved_pref', pref);
    set({ closeUnsavedPreference: pref });
  },

  // Flows state
  activeView: 'requests',
  flows: [],
  activeFlowId: null,
  flowReport: null,
  isFlowRunning: false,

  // OTA state
  otaInfo: null,
  isOtaModalOpen: false,
  isApplyingOta: false,
  setOtaModalOpen: (open) => set({ isOtaModalOpen: open }),

  // User Authentication & Cloud Sync
  currentUser: getInitialUser(),
  authToken: getAuthToken() || null,
  serverUrl: getApiBaseUrl(),
  isLoginModalOpen: false,
  isTeamModalOpen: false,
  isCloudSettingsOpen: false,
  isProfileModalOpen: false,
  teamUsers: [],
  syncStatus: 'idle',
  syncMessage: '',

  setServerUrl: (url: string) => {
    const clean = url.trim().replace(/\/+$/, '');
    setStoredItem('internalapi_server_url', clean);
    set({ serverUrl: clean });
  },
  setLoginModalOpen: (open: boolean) => set({ isLoginModalOpen: open }),
  setTeamModalOpen: (open: boolean) => set({ isTeamModalOpen: open }),
  setProfileModalOpen: (open: boolean) => set({ isProfileModalOpen: open }),
  setCloudSettingsOpen: (open: boolean) => set({ isCloudSettingsOpen: open }),

  loginAction: async (email, password, customServerUrl) => {
    try {
      const targetBase = customServerUrl !== undefined
        ? customServerUrl.trim().replace(/\/+$/, '')
        : get().serverUrl.trim().replace(/\/+$/, '');

      if (customServerUrl !== undefined) {
        set({ serverUrl: targetBase });
        setStoredItem('internalapi_server_url', targetBase);
      }

      const url = targetBase ? `${targetBase}/api/auth/login` : '/api/auth/login';
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || data.message || 'Login failed' };
      }

      const { token, user } = data;
      setStoredItem('internalapi_auth_token', token);
      setStoredItem('internalapi_user', JSON.stringify(user));
      set({
        currentUser: user,
        authToken: token,
        isLoginModalOpen: false,
      });

      // Reload workspaces, collections, environments from server
      await get().loadInitialData();

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error connecting to server' };
    }
  },

  logoutAction: () => {
    setStoredItem('internalapi_auth_token', '');
    setStoredItem('internalapi_user', '');
    setStoredItem('internalapi_collections', '');
    setStoredItem('internalapi_environments', '');
    set({
      currentUser: null,
      authToken: null,
      teamUsers: [],
      collections: [],
      workspaces: [],
      environments: [],
      history: [],
      flows: [],
      isLoginModalOpen: true,
    });
  },

  fetchTeamUsersAction: async () => {
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) {
        const users = await res.json();
        if (Array.isArray(users)) {
          set({ teamUsers: users });
        }
      }
    } catch (e) {
      console.error('Failed to fetch team users:', e);
    }
  },

  createTeamUserAction: async (userData) => {
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || data.message || 'Failed to create user' };
      }
      await get().fetchTeamUsersAction();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error creating user' };
    }
  },

  updateTeamUserAction: async (id, userData) => {
    try {
      const res = await apiFetch(`/api/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || data.message || 'Failed to update user' };
      }
      if (get().currentUser?.id === id) {
        const updatedCurrent = { ...get().currentUser!, ...data };
        setStoredItem('internalapi_user', JSON.stringify(updatedCurrent));
        set({ currentUser: updatedCurrent });
      }
      await get().fetchTeamUsersAction();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating user' };
    }
  },

  deleteTeamUserAction: async (id) => {
    try {
      const res = await apiFetch(`/api/users/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || data.message || 'Failed to delete user' };
      }
      await get().fetchTeamUsersAction();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error deleting user' };
    }
  },

  adminResetPasswordAction: async (userId, newPassword) => {
    try {
      const res = await apiFetch(`/api/users/${userId}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || data.message || 'Failed to reset password' };
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error resetting password' };
    }
  },

  updateProfileAction: async (params) => {
    try {
      const res = await apiFetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || data.message || 'Failed to update profile' };
      }
      if (data.token) {
        setStoredItem('internalapi_auth_token', data.token);
        set({ authToken: data.token });
      }
      if (data.user) {
        setStoredItem('internalapi_user', JSON.stringify(data.user));
        set({ currentUser: data.user });
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error updating profile' };
    }
  },

  syncLocalToCloudAction: async () => {
    set({ syncStatus: 'syncing', syncMessage: 'Uploading collections to cloud...' });
    try {
      const { collections, environments } = get();
      for (const col of collections) {
        await apiFetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(col),
        });
      }
      for (const env of environments) {
        await apiFetch('/api/environments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(env),
        });
      }
      set({ syncStatus: 'synced', syncMessage: 'Successfully synced local data to cloud!' });
      return { success: true, message: `Synced ${collections.length} collections and ${environments.length} environments to cloud.` };
    } catch (err: any) {
      set({ syncStatus: 'error', syncMessage: err.message || 'Sync failed' });
      return { success: false, message: err.message || 'Sync failed' };
    }
  },

  syncCloudToLocalAction: async () => {
    set({ syncStatus: 'syncing', syncMessage: 'Downloading collections from cloud...' });
    try {
      await get().loadInitialData();
      set({ syncStatus: 'synced', syncMessage: 'Local workspace updated from cloud!' });
      return { success: true, message: 'Successfully updated local workspace from cloud.' };
    } catch (err: any) {
      set({ syncStatus: 'error', syncMessage: err.message || 'Sync failed' });
      return { success: false, message: err.message || 'Sync failed' };
    }
  },

  getUserPermissions: () => {
    return resolveUserPermissions(get().currentUser);
  },

  checkOtaUpdates: async () => {
    try {
      const res = await fetch('/api/ota/check');
      if (res.ok) {
        const data = await res.json();
        set({ otaInfo: data });
      }
    } catch (_) {}
  },

  applyOtaUpdateAction: async () => {
    const ota = get().otaInfo;
    if (!ota?.assetUrl || !ota?.latestVersion) return false;
    set({ isApplyingOta: true });
    try {
      const res = await fetch('/api/ota/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetUrl: ota.assetUrl,
          latestVersion: ota.latestVersion,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to apply update');
      return true;
    } catch (err: any) {
      alert(`Update failed: ${err.message}`);
      return false;
    } finally {
      set({ isApplyingOta: false });
    }
  },

  revertOtaAction: async () => {
    if (!confirm('Revert UI to the factory bundled version?')) return;
    try {
      await fetch('/api/ota/revert', { method: 'POST' });
      window.location.reload();
    } catch (err: any) {
      alert(`Revert failed: ${err.message}`);
    }
  },

  setCommandPaletteOpen: (open) => set({ isCommandPaletteOpen: open }),
  setEnvModalOpen: (open) => set({ isEnvModalOpen: open }),
  setImportModalOpen: (open) => set({ isImportModalOpen: open }),
  isExportModalOpen: false,
  setExportModalOpen: (open) => set({ isExportModalOpen: open }),
  exportCollectionAction: (collectionId) => {
    const col = get().collections.find((c) => c.id === collectionId);
    if (col) {
      downloadCollectionAsJson(col);
    }
  },
  setWorkspaceModalOpen: (open) => set({ isWorkspaceModalOpen: open }),
  setActiveView: (view) => set({ activeView: view }),
  setActiveFlowId: (id) => set({ activeFlowId: id, activeView: id ? 'flows' : get().activeView }),
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
      const token = getAuthToken();
      if (!token) {
        set({
          collections: [],
          workspaces: [],
          environments: [],
          history: [],
          flows: [],
          isLoginModalOpen: true,
        });
        return;
      }

      // 1. Fetch workspaces first to know what workspaces user is linked to
      const wsRes = await apiFetch('/api/workspaces').then((r) => r.json()).catch(() => []);
      const workspaces: Workspace[] = Array.isArray(wsRes) ? wsRes : [];

      let activeWs = get().activeWorkspaceId;
      if (workspaces.length > 0) {
        if (!workspaces.some((w) => w.id === activeWs)) {
          activeWs = workspaces[0].id;
          setStoredItem('internalapi_active_workspace_id', activeWs);
        }
      } else {
        activeWs = '';
        setStoredItem('internalapi_active_workspace_id', '');
      }

      // 2. Fetch environments, collections, history, and flows for the authorized active workspace
      const [envRes, colRes, histRes, flowRes] = await Promise.all([
        activeWs ? apiFetch(`/api/environments?workspaceId=${activeWs}`).then((r) => r.json()).catch(() => []) : Promise.resolve([]),
        activeWs ? apiFetch(`/api/collections?workspaceId=${activeWs}`).then((r) => r.json()).catch(() => []) : Promise.resolve([]),
        activeWs ? apiFetch(`/api/history?workspaceId=${activeWs}`).then((r) => r.json()).catch(() => []) : Promise.resolve([]),
        activeWs ? apiFetch(`/api/flows?workspaceId=${activeWs}`).then((r) => r.json()).catch(() => []) : Promise.resolve([]),
      ]);

      const environments = Array.isArray(envRes) ? envRes : [];
      const collections = Array.isArray(colRes) ? colRes : [];
      const history = Array.isArray(histRes) ? histRes : [];
      const flows = Array.isArray(flowRes) ? flowRes : [];

      set({
        workspaces,
        activeWorkspaceId: activeWs,
        environments,
        collections,
        history,
        flows,
        activeEnvironmentId: environments.length > 0 ? environments[0].id : null,
      });

      setStoredItem('internalapi_collections', JSON.stringify(collections));
      setStoredItem('internalapi_environments', JSON.stringify(environments));

      // Trigger background OTA check for lightweight UI updates
      get().checkOtaUpdates();
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
      const res = await apiFetch(`/api/collections?workspaceId=${activeWorkspaceId}${envParam}`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) {
        const valid = data.filter(
          (c: any) =>
            c &&
            typeof c === 'object' &&
            c.id &&
            typeof c.id === 'string' &&
            c.name &&
            typeof c.name === 'string' &&
            !c.error &&
            !c.statusCode
        );
        set({ collections: valid });
        setStoredItem('internalapi_collections', JSON.stringify(valid));
      }
    } catch (e) {
      console.error('Failed to load collections:', e);
    }
  },

  openTab: (partialRequest, customId) => {
    const tabs = get().tabs;
    const tabId = customId || `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

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

  openCollectionTab: (collectionId: string) => {
    const { tabs, collections } = get();
    const col = collections.find((c) => c.id === collectionId);
    if (!col) return;

    const existingTab = tabs.find((t) => t.type === 'collection' && t.collectionId === collectionId);
    if (existingTab) {
      set({ activeTabId: existingTab.id });
      setStoredItem('internalapi_active_tab_id', existingTab.id);
      return;
    }

    const tabId = `col-tab-${collectionId}`;
    const newTab: TabItem = {
      id: tabId,
      name: col.name,
      type: 'collection',
      collectionId: col.id,
      request: { ...DEFAULT_NEW_REQUEST, name: col.name, collectionId: col.id },
      isDirty: false,
      isLoading: false,
    };

    const nextTabs = [...tabs, newTab];
    set({ tabs: nextTabs, activeTabId: tabId });
    setStoredItem('internalapi_tabs', JSON.stringify(nextTabs));
    setStoredItem('internalapi_active_tab_id', tabId);
  },

  saveCollectionSettings: async (col: Collection) => {
    const { collections, tabs, getUserPermissions } = get();
    const perms = getUserPermissions();
    if (!perms.canEdit) {
      alert('Action blocked: you do not have permission to edit collections.');
      return false;
    }

    try {
      const res = await apiFetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(col),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || 'Failed to save collection');
      }

      const saved: Collection = await res.json();
      const updatedCols = collections.map((c) => (c.id === saved.id ? saved : c));

      // Update tab dirty state and name
      const updatedTabs = tabs.map((t) => {
        if (t.type === 'collection' && t.collectionId === saved.id) {
          return { ...t, name: saved.name, isDirty: false };
        }
        return t;
      });

      set({ collections: updatedCols, tabs: updatedTabs });
      setStoredItem('internalapi_collections', JSON.stringify(updatedCols));
      setStoredItem('internalapi_tabs', JSON.stringify(updatedTabs));
      return true;
    } catch (err: any) {
      console.error('Failed to save collection:', err);
      alert(err.message || 'Failed to save collection');
      return false;
    }
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

  closeTabs: (tabIds: string[]) => {
    const { tabs, activeTabId } = get();
    const toCloseSet = new Set(tabIds);
    const filtered = tabs.filter((t) => !toCloseSet.has(t.id));

    if (filtered.length === 0) {
      const resetTabs = [
        {
          id: `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
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

    let nextActive = activeTabId;
    if (toCloseSet.has(activeTabId)) {
      nextActive = filtered[0].id;
    }

    set({ tabs: filtered, activeTabId: nextActive });
    setStoredItem('internalapi_tabs', JSON.stringify(filtered));
    setStoredItem('internalapi_active_tab_id', nextActive);
  },

  duplicateTab: (tabId: string) => {
    const { tabs } = get();
    const sourceTab = tabs.find((t) => t.id === tabId);
    if (!sourceTab) return;
    const newTabId = `tab-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const duplicatedTab = {
      id: newTabId,
      name: sourceTab.name ? `${sourceTab.name} (Copy)` : 'Untitled Request (Copy)',
      request: {
        ...sourceTab.request,
        id: undefined,
        name: sourceTab.request.name ? `${sourceTab.request.name} (Copy)` : 'Untitled Request (Copy)',
      },
      isDirty: true,
      isLoading: false,
    };
    const idx = tabs.findIndex((t) => t.id === tabId);
    const nextTabs = [...tabs];
    nextTabs.splice(idx + 1, 0, duplicatedTab);
    set({ tabs: nextTabs, activeTabId: newTabId });
    setStoredItem('internalapi_tabs', JSON.stringify(nextTabs));
    setStoredItem('internalapi_active_tab_id', newTabId);
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

  cancelRequest: (targetTabId) => {
    const tabId = targetTabId || get().activeTabId;
    const controller = inFlightControllers.get(tabId);
    if (controller) {
      try {
        controller.abort();
      } catch (_) {}
      inFlightControllers.delete(tabId);
    }
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === tabId
          ? {
              ...t,
              isLoading: false,
              response: {
                status: 0,
                statusText: 'Canceled',
                headers: {},
                cookies: [],
                body: 'Request canceled by user.',
                size: 0,
                time: 0,
              },
            }
          : t
      ),
    }));
  },

  sendRequest: async (targetTabId) => {
    const { tabs, activeTabId, activeEnvironmentId, activeWorkspaceId, environments, collections, saveEnvironment, saveCollectionSettings } = get();
    const tabId = targetTabId || activeTabId;
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return;

    // Do not attempt to send if URL is empty or whitespace
    if (!tab.request?.url || !tab.request.url.trim()) {
      return;
    }

    // Abort any existing in-flight request for this tab
    const existingController = inFlightControllers.get(tabId);
    if (existingController) {
      try {
        existingController.abort();
      } catch (_) {}
    }
    const controller = new AbortController();
    inFlightControllers.set(tabId, controller);

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

    // Resolve parent collection (for collection pre/post script, collection variables, inherited auth)
    const parentCol = tab.request.collectionId ? collections.find((c) => c.id === tab.request.collectionId) : undefined;
    const colVars: Record<string, string> = {};
    if (parentCol) {
      if (Array.isArray(parentCol.collectionVariables)) {
        for (const cv of parentCol.collectionVariables) {
          if (cv.isEnabled !== false && cv.key) colVars[cv.key] = cv.value;
        }
      } else if (parentCol.variables) {
        for (const [k, v] of Object.entries(parentCol.variables)) {
          colVars[k] = String(v);
        }
      }
    }

    const requestHeaders = (tab.request.headers || []).reduce((acc, h) => {
      if (h.isEnabled && h.key) acc[h.key] = h.value;
      return acc;
    }, {} as Record<string, string>);

    // 1a. Run Collection Pre-request Script first if defined
    if (parentCol?.preScript) {
      const colPreResult = executeScript(parentCol.preScript, {
        environment: envVars,
        variables: {},
        collectionVariables: colVars,
        request: {
          url: tab.request.url,
          method: tab.request.method,
          headers: requestHeaders,
          body: tab.request.bodyContent,
        },
      });

      if (activeEnv && Object.keys(colPreResult.environmentMutations).length > 0) {
        const updatedVars = [...activeEnv.variables];
        for (const [k, val] of Object.entries(colPreResult.environmentMutations)) {
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

      if (Object.keys(colPreResult.collectionMutations).length > 0) {
        const currentVars: CollectionVariable[] = Array.isArray(parentCol.collectionVariables) ? [...parentCol.collectionVariables] : [];
        for (const [k, val] of Object.entries(colPreResult.collectionMutations)) {
          const strVal = String(val);
          colVars[k] = strVal;
          const idx = currentVars.findIndex((v) => v.key === k);
          if (idx >= 0) {
            currentVars[idx] = { ...currentVars[idx], currentValue: strVal };
          } else {
            currentVars.push({ id: `v-${Date.now()}-${k}`, key: k, value: strVal, currentValue: strVal, isSecret: false, isEnabled: true });
          }
        }
        saveCollectionSettings({ ...parentCol, collectionVariables: currentVars });
      }
    }

    // 1b. Run Request Pre-request Script if defined
    if (tab.request.preScript) {
      const preResult = executeScript(tab.request.preScript, {
        environment: envVars,
        variables: {},
        collectionVariables: colVars,
        request: {
          url: tab.request.url,
          method: tab.request.method,
          headers: requestHeaders,
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

      // Apply collection variables updates
      if (parentCol && Object.keys(preResult.collectionMutations).length > 0) {
        const currentVars: CollectionVariable[] = Array.isArray(parentCol.collectionVariables) ? [...parentCol.collectionVariables] : [];
        for (const [k, val] of Object.entries(preResult.collectionMutations)) {
          const strVal = String(val);
          colVars[k] = strVal;
          const idx = currentVars.findIndex((v) => v.key === k);
          if (idx >= 0) {
            currentVars[idx] = { ...currentVars[idx], currentValue: strVal };
          } else {
            currentVars.push({ id: `v-${Date.now()}-${k}`, key: k, value: strVal, currentValue: strVal, isSecret: false, isEnabled: true });
          }
        }
        saveCollectionSettings({ ...parentCol, collectionVariables: currentVars });
      }
    }

    // 1c. Resolve inherited auth if requested
    let effectiveRequest = { ...tab.request };
    if ((!effectiveRequest.auth || effectiveRequest.auth.type === 'inherit' || effectiveRequest.auth.type === 'none') && parentCol?.auth && parentCol.auth.type !== 'none' && (!effectiveRequest.auth || effectiveRequest.auth.type === 'inherit')) {
      effectiveRequest = { ...effectiveRequest, auth: parentCol.auth };
    }

    try {
      const res = await apiFetch('/api/proxy/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          request: effectiveRequest,
          environmentId: activeEnvironmentId,
          workspaceId: activeWorkspaceId,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const errorText = await res.text();
        let message = `Server returned HTTP ${res.status}: ${res.statusText || 'Error'}`;
        try {
          const parsed = JSON.parse(errorText);
          if (parsed.error) message = typeof parsed.error === 'string' ? parsed.error : JSON.stringify(parsed.error);
          else if (parsed.message) message = parsed.message;
        } catch {
          if (errorText.trim()) {
            message = errorText.trim();
          }
        }
        throw new Error(message);
      }

      let responseData: ApiResponseData;
      try {
        responseData = await res.json();
      } catch (jsonErr: any) {
        throw new Error(`Failed to parse backend response: ${jsonErr.message}`);
      }

      // 2. Run Tests / Post-response Script if defined (Collection test script + Request test script)
      let testResults: TestResultItem[] = [];
      let scriptLogs: string[] = [];

      // 2a. Run Collection Tests Script
      if (parentCol?.postScript && responseData) {
        const colPostResult = executeScript(parentCol.postScript, {
          environment: envVars,
          variables: {},
          collectionVariables: colVars,
          request: {
            url: tab.request.url,
            method: tab.request.method,
            headers: requestHeaders,
          },
          response: {
            status: responseData.status,
            statusText: responseData.statusText,
            headers: responseData.headers,
            body: responseData.body,
            time: responseData.time,
          },
        });
        testResults.push(...colPostResult.tests);
        scriptLogs.push(...colPostResult.logs);
      }

      // 2b. Run Request Tests Script
      if (tab.request.postScript && responseData) {
        const postResult = executeScript(tab.request.postScript, {
          environment: envVars,
          variables: {},
          collectionVariables: colVars,
          request: {
            url: tab.request.url,
            method: tab.request.method,
            headers: requestHeaders,
          },
          response: {
            status: responseData.status,
            statusText: responseData.statusText,
            headers: responseData.headers,
            body: responseData.body,
            time: responseData.time,
          },
        });

        testResults.push(...postResult.tests);
        scriptLogs.push(...postResult.logs);

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
      if (err.name === 'AbortError' || controller.signal.aborted) {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId
              ? {
                  ...t,
                  isLoading: false,
                  response: {
                    status: 0,
                    statusText: 'Canceled',
                    headers: {},
                    cookies: [],
                    body: 'Request canceled by user.',
                    size: 0,
                    time: 0,
                  },
                }
              : t
          ),
        }));
        return;
      }

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
    } finally {
      if (inFlightControllers.get(tabId) === controller) {
        inFlightControllers.delete(tabId);
      }
    }
  },

  saveCurrentRequest: async (collectionId, folderId) => {
    const { tabs, activeTabId, collections, saveCollectionSettings } = get();
    const activeTab = tabs.find((t) => t.id === activeTabId);
    if (!activeTab) return;

    if (activeTab.type === 'collection' && activeTab.collectionId) {
      const col = collections.find((c) => c.id === activeTab.collectionId);
      if (col) {
        await saveCollectionSettings(col);
      }
      return;
    }

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
    const res = await apiFetch(`/api/collections${envParam}`, {
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

  saveTabRequest: async (tabId, collectionId, folderId) => {
    const { tabs, collections, saveCollectionSettings } = get();
    const tab = tabs.find((t) => t.id === tabId);
    if (!tab) return false;

    if (tab.type === 'collection' && tab.collectionId) {
      const col = collections.find((c) => c.id === tab.collectionId);
      if (col) {
        return saveCollectionSettings(col);
      }
      return false;
    }

    let targetCollections = [...collections];
    let colId = collectionId || tab.request.collectionId;

    if (!colId && targetCollections.length > 0) {
      colId = targetCollections[0].id;
    }

    if (!colId || targetCollections.length === 0) {
      await get().createCollection('Saved Requests');
      targetCollections = get().collections;
      colId = targetCollections[0]?.id;
    }

    if (!colId) return false;

    const targetCol = targetCollections.find((c) => c.id === colId);
    if (!targetCol) return false;

    const updatedCol = { ...targetCol };
    const savedReq: ApiRequestData = {
      ...tab.request,
      name: tab.name?.trim() || tab.request.name?.trim() || 'Untitled Request',
      id: tab.request.id || `req-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      collectionId: colId,
      folderId: folderId !== undefined ? folderId : (tab.request.folderId ?? null),
    };

    if (savedReq.folderId) {
      updatedCol.folders = (updatedCol.folders || []).map((f) => {
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

    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await apiFetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedCol),
    });

    if (res.ok) {
      const saved = await res.json();
      const nextCollections = targetCollections.map((c) => (c.id === saved.id ? saved : c));
      const nextTabs = get().tabs.map((t) =>
        t.id === tabId ? { ...t, name: savedReq.name, request: savedReq, isDirty: false } : t
      );
      set({ collections: nextCollections, tabs: nextTabs });
      setStoredItem('internalapi_collections', JSON.stringify(nextCollections));
      setStoredItem('internalapi_tabs', JSON.stringify(nextTabs));
      return true;
    }
    return false;
  },

  saveEnvironment: async (env) => {
    const res = await apiFetch('/api/environments', {
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
    await apiFetch(`/api/environments/${id}`, { method: 'DELETE' });
    const next = get().environments.filter((e) => e.id !== id);
    set({
      environments: next,
      activeEnvironmentId: get().activeEnvironmentId === id ? null : get().activeEnvironmentId,
    });
    setStoredItem('internalapi_environments', JSON.stringify(next));
  },

  createCollection: async (name) => {
    if (!get().getUserPermissions().canAdd) {
      console.warn('Action blocked: user lacks add permission');
      return;
    }
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
    const res = await apiFetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newCol),
    });
    const saved = await res.json();
    const next = [...get().collections, saved];
    set({ collections: next });
    setStoredItem('internalapi_collections', JSON.stringify(next));
    notifySyncChannel();
  },

  deleteCollection: async (id) => {
    if (!get().getUserPermissions().canDelete) {
      console.warn('Action blocked: user lacks delete permission');
      return;
    }
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    await apiFetch(`/api/collections/${id}${envParam}`, { method: 'DELETE' });
    const next = get().collections.filter((c) => c.id !== id);
    set({ collections: next });
    setStoredItem('internalapi_collections', JSON.stringify(next));
    notifySyncChannel();
  },

  renameCollection: async (id, name) => {
    if (!get().getUserPermissions().canEdit) {
      console.warn('Action blocked: user lacks edit permission');
      return;
    }
    const col = get().collections.find((c) => c.id === id);
    if (!col) return;
    const updated = { ...col, name };
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await apiFetch(`/api/collections${envParam}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    });
    const saved = await res.json();
    const next = get().collections.map((c) => (c.id === id ? saved : c));
    set({ collections: next });
    setStoredItem('internalapi_collections', JSON.stringify(next));
    notifySyncChannel();
  },

  addFolder: async (collectionId, folderName) => {
    if (!get().getUserPermissions().canAdd) {
      console.warn('Action blocked: user lacks add permission');
      return;
    }
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
    const res = await apiFetch(`/api/collections${envParam}`, {
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
    if (!get().getUserPermissions().canEdit) {
      console.warn('Action blocked: user lacks edit permission');
      return;
    }
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const updated = {
      ...col,
      folders: (col.folders || []).map((f) => (f.id === folderId ? { ...f, name } : f)),
    };
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await apiFetch(`/api/collections${envParam}`, {
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
    if (!get().getUserPermissions().canDelete) {
      console.warn('Action blocked: user lacks delete permission');
      return;
    }
    const col = get().collections.find((c) => c.id === collectionId);
    if (!col) return;
    const updated = {
      ...col,
      folders: (col.folders || []).filter((f) => f.id !== folderId),
    };
    const envParam = get().activeEnvironmentId ? `?environmentId=${encodeURIComponent(get().activeEnvironmentId!)}` : '';
    const res = await apiFetch(`/api/collections${envParam}`, {
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
    if (!get().getUserPermissions().canAdd) {
      console.warn('Action blocked: user lacks add permission');
      return;
    }
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
    const res = await apiFetch(`/api/collections${envParam}`, {
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
    if (!get().getUserPermissions().canDelete) {
      console.warn('Action blocked: user lacks delete permission');
      return;
    }
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
    const res = await apiFetch(`/api/collections${envParam}`, {
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
    const res = await apiFetch(`/api/collections${envParam}`, {
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
    const res = await apiFetch(`/api/history?workspaceId=${activeWorkspaceId}`).then((r) => r.json());
    if (Array.isArray(res)) {
      set({ history: res });
    }
  },

  clearHistory: async () => {
    const { activeWorkspaceId } = get();
    await apiFetch(`/api/history?workspaceId=${activeWorkspaceId}`, { method: 'DELETE' });
    set({ history: [] });
  },

  // Workspace Actions
  createWorkspace: async (name: string, description?: string) => {
    try {
      const res = await apiFetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description }),
      });
      const newWs = await res.json();
      if (newWs && newWs.id) {
        set((state) => ({
          workspaces: [...state.workspaces, newWs],
          activeWorkspaceId: newWs.id,
          isWorkspaceModalOpen: false,
        }));
        setStoredItem('internalapi_active_workspace_id', newWs.id);
        await get().loadCollections();
        await get().loadFlows();
        await get().refreshHistory();
        return newWs;
      }
    } catch (e) {
      console.error('Failed to create workspace:', e);
    }
  },

  switchWorkspace: async (workspaceId: string) => {
    set({ activeWorkspaceId: workspaceId, activeFlowId: null });
    setStoredItem('internalapi_active_workspace_id', workspaceId);
    await get().loadCollections();
    await get().loadFlows();
    await get().refreshHistory();
  },

  deleteWorkspace: async (workspaceId: string) => {
    try {
      await apiFetch(`/api/workspaces/${workspaceId}`, { method: 'DELETE' });
      const remaining = get().workspaces.filter((w) => w.id !== workspaceId);
      const nextActive = remaining[0]?.id || 'ws-default-company';
      set({ workspaces: remaining, activeWorkspaceId: nextActive, activeFlowId: null });
      setStoredItem('internalapi_active_workspace_id', nextActive);
      await get().loadCollections();
      await get().loadFlows();
      await get().refreshHistory();
    } catch (e) {
      console.error('Failed to delete workspace:', e);
    }
  },

  // Flows Actions
  loadFlows: async () => {
    const { activeWorkspaceId } = get();
    try {
      const res = await apiFetch(`/api/flows?workspaceId=${activeWorkspaceId}`).then((r) => r.json());
      if (Array.isArray(res)) {
        set({ flows: res });
        if (get().activeFlowId && !res.some((f) => f.id === get().activeFlowId)) {
          set({ activeFlowId: res[0]?.id || null });
        }
      }
    } catch (e) {
      console.error('Failed to load flows:', e);
    }
  },

  createFlow: async (name = 'New API Flow', description = '', template = 'blank') => {
    if (!get().getUserPermissions().canAdd) {
      console.warn('Action blocked: user lacks add permission');
      return undefined;
    }
    const { activeWorkspaceId } = get();
    let initialNodes: FlowNode[] = [];

    if (template === 'auth_fetch') {
      initialNodes = [
        {
          id: `node-${Date.now()}-1`,
          type: 'start',
          title: 'Start: Configuration',
          config: {
            initialVars: [
              { key: 'baseUrl', value: 'https://httpbin.org' },
              { key: 'username', value: 'developer' },
            ],
          },
        },
        {
          id: `node-${Date.now()}-2`,
          type: 'request',
          title: 'Request: Authenticate',
          config: {
            method: 'POST',
            url: '{{baseUrl}}/post',
            headers: [{ id: 'h-1', key: 'Content-Type', value: 'application/json', isEnabled: true }],
            bodyType: 'json',
            bodyContent: '{\n  "user": "{{username}}",\n  "token": "tok_flow_sec_884"\n}',
          },
        },
        {
          id: `node-${Date.now()}-3`,
          type: 'extract',
          title: 'Extract: Auth Token',
          config: {
            extractVarName: 'authToken',
            extractPath: 'json.token',
          },
        },
        {
          id: `node-${Date.now()}-4`,
          type: 'delay',
          title: 'Delay: Network Wait',
          config: {
            delayMs: 300,
          },
        },
        {
          id: `node-${Date.now()}-5`,
          type: 'request',
          title: 'Request: Fetch Secured Headers',
          config: {
            method: 'GET',
            url: '{{baseUrl}}/headers',
            headers: [{ id: 'h-2', key: 'Authorization', value: 'Bearer {{authToken}}', isEnabled: true }],
            bodyType: 'none',
          },
        },
        {
          id: `node-${Date.now()}-6`,
          type: 'output',
          title: 'Output: Verify Complete',
          config: {
            logMessage: 'Authentication verified! Authorized token: {{authToken}}',
          },
        },
      ];
    } else if (template === 'create_verify') {
      initialNodes = [
        {
          id: `node-${Date.now()}-1`,
          type: 'start',
          title: 'Start: Setup Payload',
          config: {
            initialVars: [
              { key: 'apiUrl', value: 'https://httpbin.org' },
              { key: 'itemName', value: 'Widget-A1' },
            ],
          },
        },
        {
          id: `node-${Date.now()}-2`,
          type: 'request',
          title: 'Request: Create Resource',
          config: {
            method: 'POST',
            url: '{{apiUrl}}/post',
            headers: [{ id: 'h-1', key: 'Content-Type', value: 'application/json', isEnabled: true }],
            bodyType: 'json',
            bodyContent: '{\n  "name": "{{itemName}}",\n  "status": "ready"\n}',
          },
        },
        {
          id: `node-${Date.now()}-3`,
          type: 'extract',
          title: 'Extract: Verified Status',
          config: {
            extractVarName: 'resourceStatus',
            extractPath: 'json.status',
          },
        },
        {
          id: `node-${Date.now()}-4`,
          type: 'condition',
          title: 'Condition: Assert Status is ready',
          config: {
            conditionField: '{{resourceStatus}}',
            conditionOperator: '==',
            conditionValue: 'ready',
          },
        },
        {
          id: `node-${Date.now()}-5`,
          type: 'output',
          title: 'Output: Success Summary',
          config: {
            logMessage: 'Resource {{itemName}} verified with status: {{resourceStatus}}',
          },
        },
      ];
    } else {
      // Default Blank Flow
      initialNodes = [
        {
          id: `node-${Date.now()}-1`,
          type: 'start',
          title: 'Start: Base Parameters',
          config: {
            initialVars: [{ key: 'baseUrl', value: 'https://httpbin.org' }],
          },
        },
        {
          id: `node-${Date.now()}-2`,
          type: 'request',
          title: 'Request: Ping Service',
          config: {
            method: 'GET',
            url: '{{baseUrl}}/get',
            headers: [],
            bodyType: 'none',
          },
        },
        {
          id: `node-${Date.now()}-3`,
          type: 'output',
          title: 'Output: Status Report',
          config: {
            logMessage: 'Ping service completed! Status: {{lastStatus}}',
          },
        },
      ];
    }

    const newFlow: Flow = {
      id: `flow-${Date.now()}`,
      workspaceId: activeWorkspaceId,
      name,
      description,
      nodes: initialNodes,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const res = await apiFetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newFlow),
      });
      const saved = await res.json();
      set((state) => ({
        flows: [...state.flows, saved],
        activeFlowId: saved.id,
        activeView: 'flows',
      }));
      return saved;
    } catch (e) {
      console.error('Failed to create flow:', e);
    }
  },

  saveFlow: async (flow: Flow) => {
    try {
      const res = await apiFetch('/api/flows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(flow),
      });
      const saved = await res.json();
      set((state) => ({
        flows: state.flows.map((f) => (f.id === flow.id ? saved : f)),
      }));
    } catch (e) {
      console.error('Failed to save flow:', e);
    }
  },

  deleteFlow: async (id: string) => {
    if (!get().getUserPermissions().canDelete) {
      console.warn('Action blocked: user lacks delete permission');
      return;
    }
    try {
      await apiFetch(`/api/flows/${id}`, { method: 'DELETE' });
      set((state) => ({
        flows: state.flows.filter((f) => f.id !== id),
        activeFlowId: state.activeFlowId === id ? null : state.activeFlowId,
      }));
    } catch (e) {
      console.error('Failed to delete flow:', e);
    }
  },

  stopFlow: () => {
    set({ isFlowRunning: false });
  },

  runFlow: async (flowId: string) => {
    const { flows, activeEnvironmentId, activeWorkspaceId, environments } = get();
    const flow = flows.find((f) => f.id === flowId);
    if (!flow || !flow.nodes || flow.nodes.length === 0) return;

    // Load active environment variables
    const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
    const baseVars: Record<string, string> = {};
    if (activeEnv) {
      for (const v of activeEnv.variables) {
        if (v.isEnabled && v.key) baseVars[v.key] = v.value;
      }
    }

    const runtimeVars: Record<string, any> = { ...baseVars };
    const logs: FlowStepLog[] = [];
    const initialReport: FlowExecutionReport = {
      flowId,
      status: 'running',
      currentStepIndex: 0,
      totalSteps: flow.nodes.length,
      startTime: new Date().toISOString(),
      variables: { ...runtimeVars },
      logs: [],
    };

    set({ isFlowRunning: true, flowReport: initialReport });

    let lastResponse: ApiResponseData | null = null;
    let hasFailed = false;

    for (let i = 0; i < flow.nodes.length; i++) {
      if (!get().isFlowRunning) {
        logs.push({
          nodeId: flow.nodes[i].id,
          nodeTitle: flow.nodes[i].title,
          type: flow.nodes[i].type,
          status: 'skipped',
          message: 'Flow cancelled by user',
        });
        break;
      }

      const node = flow.nodes[i];
      const stepLog: FlowStepLog = {
        nodeId: node.id,
        nodeTitle: node.title,
        type: node.type,
        status: 'running',
      };

      set((state) => ({
        flowReport: state.flowReport
          ? {
              ...state.flowReport,
              currentStepIndex: i,
              logs: [...logs, stepLog],
              variables: { ...runtimeVars },
            }
          : null,
      }));

      const tStart = performance.now();

      try {
        if (node.type === 'start') {
          if (Array.isArray(node.config.initialVars)) {
            for (const item of node.config.initialVars) {
              if (item.key) runtimeVars[item.key] = item.value;
            }
          }
          stepLog.status = 'success';
          stepLog.message = `Initialized ${node.config.initialVars?.length || 0} variable(s)`;
        } else if (node.type === 'request') {
          const stringVars: Record<string, string> = {};
          for (const [k, v] of Object.entries(runtimeVars)) {
            stringVars[k] = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
          }

          const rawUrl = node.config.url || '';
          const resolvedUrl = interpolateVariables(rawUrl, stringVars);
          const resolvedBody = node.config.bodyContent
            ? interpolateVariables(node.config.bodyContent, stringVars)
            : '';

          const resolvedHeaders = (node.config.headers || []).map((h) => ({
            ...h,
            value: interpolateVariables(h.value, stringVars),
          }));

          const reqData: ApiRequestData = {
            name: node.title,
            method: node.config.method || 'GET',
            url: resolvedUrl,
            queryParams: [],
            headers: resolvedHeaders,
            pathVars: [],
            auth: { type: 'none' },
            bodyType: node.config.bodyType || 'json',
            bodyContent: resolvedBody,
            settings: { timeoutMs: 30000, followRedirects: true, verifySsl: true },
          };

          const res = await apiFetch('/api/proxy/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              request: reqData,
              environmentId: activeEnvironmentId,
              workspaceId: activeWorkspaceId,
            }),
          });

          if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`Proxy error (${res.status}): ${errorText || res.statusText}`);
          }

          const resp: ApiResponseData = await res.json();
          lastResponse = resp;
          runtimeVars['lastStatus'] = resp.status;
          runtimeVars['lastStatusText'] = resp.statusText;

          let parsedBody = resp.body;
          try {
            if (typeof resp.body === 'string') {
              parsedBody = JSON.parse(resp.body);
            }
          } catch {}
          runtimeVars['lastBody'] = parsedBody;

          stepLog.httpStatus = resp.status;
          stepLog.durationMs = Math.round(performance.now() - tStart);
          stepLog.data = {
            url: resolvedUrl,
            method: node.config.method || 'GET',
            status: resp.status,
            time: resp.time,
            bodySnippet:
              typeof resp.body === 'string'
                ? resp.body.slice(0, 300)
                : JSON.stringify(resp.body).slice(0, 300),
          };

          if (resp.status >= 200 && resp.status < 400) {
            stepLog.status = 'success';
            stepLog.message = `${node.config.method || 'GET'} ${resolvedUrl} -> ${resp.status} ${resp.statusText || 'OK'} (${resp.time}ms)`;
          } else {
            stepLog.status = 'failed';
            stepLog.message = `HTTP ${resp.status}: ${resp.statusText || 'Error response'}`;
            hasFailed = true;
          }
        } else if (node.type === 'extract') {
          const varName = node.config.extractVarName?.trim();
          const path = node.config.extractPath?.trim();
          if (!varName) {
            stepLog.status = 'failed';
            stepLog.message = 'No variable name specified';
            hasFailed = true;
          } else if (!lastResponse) {
            stepLog.status = 'failed';
            stepLog.message = 'No prior HTTP response found to extract from';
            hasFailed = true;
          } else {
            const sourceObj = runtimeVars['lastBody'];
            let val: any = undefined;

            if (path === 'status') {
              val = lastResponse.status;
            } else if (path?.startsWith('headers.')) {
              const hKey = path.slice(8).toLowerCase();
              val = (lastResponse.headers as any)?.[hKey] || (lastResponse.headers as any)?.[path.slice(8)];
            } else if (path) {
              const cleanPath = path.replace(/^(body|data|json)\./, '');
              const parts = cleanPath.split('.');
              let curr = sourceObj;
              // If sourceObj has 'json' wrapper or 'data' wrapper
              if (path.startsWith('json.') && sourceObj && sourceObj.json) {
                curr = sourceObj.json;
              }
              for (const part of parts) {
                if (curr == null) break;
                curr = curr[part];
              }
              val = curr !== undefined ? curr : sourceObj?.[cleanPath];
            } else {
              val = sourceObj;
            }

            runtimeVars[varName] = val;
            stepLog.status = 'success';
            stepLog.message = `Extracted variable {{${varName}}} = ${JSON.stringify(val)}`;
            stepLog.data = { variable: varName, value: val };
          }
        } else if (node.type === 'delay') {
          const ms = Number(node.config.delayMs) || 500;
          await new Promise((r) => setTimeout(r, ms));
          stepLog.status = 'success';
          stepLog.message = `Waited ${ms}ms`;
          stepLog.durationMs = Math.round(performance.now() - tStart);
        } else if (node.type === 'condition') {
          const stringVars: Record<string, string> = {};
          for (const [k, v] of Object.entries(runtimeVars)) {
            stringVars[k] = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
          }
          const fieldVal = interpolateVariables(node.config.conditionField || '', stringVars);
          const targetVal = interpolateVariables(node.config.conditionValue || '', stringVars);
          const op = node.config.conditionOperator || '==';

          let passed = false;
          if (op === '==') passed = String(fieldVal) === String(targetVal);
          else if (op === '!=') passed = String(fieldVal) !== String(targetVal);
          else if (op === '>') passed = Number(fieldVal) > Number(targetVal);
          else if (op === '<') passed = Number(fieldVal) < Number(targetVal);
          else if (op === 'contains') passed = String(fieldVal).includes(String(targetVal));

          if (passed) {
            stepLog.status = 'success';
            stepLog.message = `Condition met: "${fieldVal}" ${op} "${targetVal}"`;
          } else {
            stepLog.status = 'failed';
            stepLog.message = `Condition failed: "${fieldVal}" ${op} "${targetVal}"`;
            hasFailed = true;
          }
        } else if (node.type === 'output') {
          const stringVars: Record<string, string> = {};
          for (const [k, v] of Object.entries(runtimeVars)) {
            stringVars[k] = typeof v === 'object' ? JSON.stringify(v) : String(v ?? '');
          }
          const msg = interpolateVariables(node.config.logMessage || 'Flow step reached', stringVars);
          stepLog.status = 'success';
          stepLog.message = msg;
          stepLog.data = { output: msg };
        }
      } catch (err: any) {
        stepLog.status = 'failed';
        stepLog.message = err.message || 'Execution error';
        hasFailed = true;
      }

      stepLog.durationMs = stepLog.durationMs || Math.round(performance.now() - tStart);
      logs.push(stepLog);

      set((state) => ({
        flowReport: state.flowReport
          ? {
              ...state.flowReport,
              currentStepIndex: i,
              logs: [...logs],
              variables: { ...runtimeVars },
            }
          : null,
      }));
    }

    const finalDuration = logs.reduce((acc, l) => acc + (l.durationMs || 0), 0);
    set((state) => ({
      isFlowRunning: false,
      flowReport: state.flowReport
        ? {
            ...state.flowReport,
            status: hasFailed ? 'failed' : 'success',
            endTime: new Date().toISOString(),
            durationMs: finalDuration,
            logs: [...logs],
            variables: { ...runtimeVars },
          }
        : null,
    }));
  },
}));

