import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import type {
  Workspace,
  Collection,
  Folder,
  ApiRequestData,
  Environment,
  EnvironmentVariable,
} from '@internalapi/shared';
import { encryptSecret, decryptSecret } from '../crypto/encryption.js';

export interface StorageData {
  workspaces: Workspace[];
  collections: Collection[];
  environments: Environment[];
  history: Array<{
    id: string;
    workspaceId: string;
    method: string;
    url: string;
    status: number;
    size: number;
    time: number;
    createdAt: string;
  }>;
}

const DEFAULT_WORKSPACE_ID = 'ws-default-company';

function getDataFilePath(): { dataDir: string; dataFile: string } {
  // Check packages/server/.data/store.json first
  const serverPath = path.resolve(process.cwd(), 'packages/server/.data');
  if (fs.existsSync(path.join(serverPath, 'store.json'))) {
    return { dataDir: serverPath, dataFile: path.join(serverPath, 'store.json') };
  }
  // Check local .data/store.json
  const cwdPath = path.resolve(process.cwd(), '.data');
  if (fs.existsSync(path.join(cwdPath, 'store.json'))) {
    return { dataDir: cwdPath, dataFile: path.join(cwdPath, 'store.json') };
  }
  // Check parent ../.data/store.json
  const parentPath = path.resolve(process.cwd(), '../.data');
  if (fs.existsSync(path.join(parentPath, 'store.json'))) {
    return { dataDir: parentPath, dataFile: path.join(parentPath, 'store.json') };
  }

  // Default to packages/server/.data
  const rootDir = fs.existsSync(path.resolve(process.cwd(), 'packages/server'))
    ? path.resolve(process.cwd(), 'packages/server')
    : process.cwd();
  const dir = path.join(rootDir, '.data');
  return { dataDir: dir, dataFile: path.join(dir, 'store.json') };
}

const { dataDir: DATA_DIR, dataFile: DATA_FILE } = getDataFilePath();

const INITIAL_DEMO_DATA: StorageData = {
  workspaces: [
    {
      id: DEFAULT_WORKSPACE_ID,
      name: 'Company Internal APIs',
      description: 'Default company workspace for internal and microservice testing',
      isDefault: true,
    },
  ],
  environments: [
    {
      id: 'env-development',
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: 'Development',
      variables: [
        {
          id: 'v1',
          key: 'base_url',
          value: 'https://httpbin.org',
          isSecret: false,
          isEnabled: true,
        },
        {
          id: 'v2',
          key: 'api_token',
          value: encryptSecret('dev-secret-api-token-xyz'),
          isSecret: true,
          isEnabled: true,
        },
      ],
    },
    {
      id: 'env-production',
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: 'Production',
      variables: [
        {
          id: 'v3',
          key: 'base_url',
          value: 'https://httpbin.org',
          isSecret: false,
          isEnabled: true,
        },
      ],
    },
  ],
  collections: [
    {
      id: 'col-getting-started',
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: 'Getting Started & Health Checks',
      description: 'Sample collection demonstrating GET, POST, Auth, and variable resolution',
      sortOrder: 0,
      folders: [
        {
          id: 'fld-samples',
          collectionId: 'col-getting-started',
          name: 'Demo Endpoints',
          sortOrder: 0,
          requests: [
            {
              id: 'req-httpbin-get',
              collectionId: 'col-getting-started',
              folderId: 'fld-samples',
              name: 'Sample GET Request',
              method: 'GET',
              url: '{{base_url}}/get',
              queryParams: [
                { id: 'q1', key: 'status', value: 'active', isEnabled: true },
                { id: 'q2', key: 'filter', value: 'all', isEnabled: false },
              ],
              headers: [
                { id: 'h1', key: 'Accept', value: 'application/json', isEnabled: true },
              ],
              auth: {
                type: 'none',
              },
              bodyType: 'none',
            },
            {
              id: 'req-httpbin-post',
              collectionId: 'col-getting-started',
              folderId: 'fld-samples',
              name: 'Sample POST JSON',
              method: 'POST',
              url: '{{base_url}}/post',
              queryParams: [],
              headers: [
                { id: 'h2', key: 'Content-Type', value: 'application/json', isEnabled: true },
              ],
              auth: {
                type: 'bearer',
                bearer: {
                  token: '{{api_token}}',
                },
              },
              bodyType: 'json',
              bodyContent: JSON.stringify(
                {
                  message: 'Hello from InternalAPI Postman clone!',
                  service: 'billing-service',
                  timestamp: new Date().toISOString(),
                },
                null,
                2
              ),
            },
          ],
        },
      ],
      requests: [],
    },
  ],
  history: [],
};

class LocalFileStorage {
  private data: StorageData;

  constructor() {
    this.data = this.loadData();
  }

  private loadData(): StorageData {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        const parsed = JSON.parse(content);
        if (!parsed.collections || parsed.collections.length === 0) {
          parsed.collections = [...INITIAL_DEMO_DATA.collections];
        }
        return parsed;
      }
    } catch (e) {
      // If error reading, fallback to initial demo
    }
    this.saveData(INITIAL_DEMO_DATA);
    return INITIAL_DEMO_DATA;
  }

  private saveData(data: StorageData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      // ignore in read-only setups
    }
  }

  // Workspaces
  getWorkspaces(): Workspace[] {
    return this.data.workspaces;
  }

  createWorkspace(name: string, description?: string): Workspace {
    const ws: Workspace = {
      id: `ws-${crypto.randomUUID()}`,
      name,
      description,
      isDefault: false,
    };
    this.data.workspaces.push(ws);
    this.saveData(this.data);
    return ws;
  }

  // Collections
  getCollections(workspaceId: string): Collection[] {
    return this.data.collections.filter((c) => c.workspaceId === workspaceId);
  }

  getCollection(id: string): Collection | undefined {
    return this.data.collections.find((c) => c.id === id);
  }

  saveCollection(col: Collection): Collection {
    const index = this.data.collections.findIndex((c) => c.id === col.id);
    if (index >= 0) {
      this.data.collections[index] = col;
    } else {
      if (!col.id) col.id = `col-${crypto.randomUUID()}`;
      this.data.collections.push(col);
    }
    this.saveData(this.data);
    return col;
  }

  deleteCollection(id: string): boolean {
    const prevLen = this.data.collections.length;
    this.data.collections = this.data.collections.filter((c) => c.id !== id);
    this.saveData(this.data);
    return this.data.collections.length < prevLen;
  }

  // Environments
  getEnvironments(workspaceId: string): Environment[] {
    return this.data.environments
      .filter((e) => e.workspaceId === workspaceId)
      .map((env) => ({
        ...env,
        variables: env.variables.map((v) => ({
          ...v,
          // Mask secret variables when returning to client
          value: v.isSecret ? '••••••••' : v.value,
        })),
      }));
  }

  getEnvironmentRaw(id: string): Environment | undefined {
    return this.data.environments.find((e) => e.id === id);
  }

  saveEnvironment(env: Environment): Environment {
    const index = this.data.environments.findIndex((e) => e.id === env.id);

    // Encrypt secret variables
    const processedVariables = env.variables.map((v) => {
      if (v.isSecret && v.value && !v.value.startsWith('••••')) {
        return { ...v, value: encryptSecret(v.value) };
      }
      // If masked value unchanged, keep existing encrypted value
      if (v.isSecret && v.value?.startsWith('••••') && index >= 0) {
        const existingVar = this.data.environments[index].variables.find((ev) => ev.id === v.id);
        if (existingVar) {
          return { ...v, value: existingVar.value };
        }
      }
      return v;
    });

    const toSave: Environment = {
      ...env,
      id: env.id || `env-${crypto.randomUUID()}`,
      variables: processedVariables,
    };

    if (index >= 0) {
      this.data.environments[index] = toSave;
    } else {
      this.data.environments.push(toSave);
    }
    this.saveData(this.data);
    return toSave;
  }

  deleteEnvironment(id: string): boolean {
    const prevLen = this.data.environments.length;
    this.data.environments = this.data.environments.filter((e) => e.id !== id);
    this.saveData(this.data);
    return this.data.environments.length < prevLen;
  }

  // Resolved variable map for execution
  getResolvedVariables(environmentId?: string): Record<string, string> {
    const vars: Record<string, string> = {};
    if (!environmentId) return vars;

    const env = this.data.environments.find((e) => e.id === environmentId);
    if (!env) return vars;

    for (const v of env.variables) {
      if (v.isEnabled && v.key) {
        vars[v.key] = v.isSecret ? decryptSecret(v.value) : v.value;
      }
    }
    return vars;
  }

  // History
  addHistory(entry: {
    workspaceId: string;
    method: string;
    url: string;
    status: number;
    size: number;
    time: number;
  }) {
    const item = {
      ...entry,
      id: `hist-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.history.unshift(item);
    if (this.data.history.length > 500) {
      this.data.history.pop();
    }
    this.saveData(this.data);
    return item;
  }

  getHistory(workspaceId: string, limit = 50) {
    return this.data.history
      .filter((h) => h.workspaceId === workspaceId)
      .slice(0, limit);
  }

  clearHistory(workspaceId: string) {
    this.data.history = this.data.history.filter((h) => h.workspaceId !== workspaceId);
    this.saveData(this.data);
  }
}

export const db = new LocalFileStorage();

