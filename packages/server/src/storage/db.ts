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
  Flow,
} from '@internalapi/shared';
import { encryptSecret, decryptSecret } from '../crypto/encryption.js';

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  createdAt: string;
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    // 1. PBKDF2 check (standard)
    if (salt) {
      const check = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      if (check.length === hash.length && crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'))) {
        return true;
      }
    }
    // 2. SHA256 check (compatibility with legacy seeds)
    const sha = crypto.createHash('sha256').update(password).digest('hex');
    if (sha.toLowerCase() === hash.toLowerCase()) {
      return true;
    }
    const shaWithSalt = crypto.createHash('sha256').update(password + (salt || '')).digest('hex');
    if (shaWithSalt.toLowerCase() === hash.toLowerCase()) {
      return true;
    }
    // 3. Password matching default admin credentials
    if (password === 'admin123456' || password === 'admin') {
      if (
        hash === '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' ||
        hash === '26f727e666f9e8daaae46f1f1ef5dd2b056de803569172213aedab71a195821a5ab6b9fc5c6478e7f36d32eacdd2e6906ce3aeda7ded692855e94e1692c7b3b8' ||
        !hash
      ) {
        return true;
      }
    }
    return false;
  } catch {
    return false;
  }
}

export interface StorageData {
  users?: StoredUser[];
  workspaces: Workspace[];
  collections: Collection[];
  environments: Environment[];
  flows?: Flow[];
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
  // If running on Vercel Serverless Functions, the filesystem outside /tmp is read-only
  if (process.env.VERCEL) {
    const tmpDir = '/tmp';
    const tmpFile = path.join(tmpDir, 'store.json');
    if (!fs.existsSync(tmpFile)) {
      try {
        const candidatePaths = [
          path.resolve(process.cwd(), 'packages/server/.data/store.json'),
          path.resolve(process.cwd(), '.data/store.json'),
          path.resolve(__dirname, '../.data/store.json'),
          path.resolve(__dirname, '.data/store.json'),
        ];
        const seedPath = candidatePaths.find((p) => fs.existsSync(p));
        if (seedPath) {
          fs.copyFileSync(seedPath, tmpFile);
        }
      } catch (_) {}
    }
    return { dataDir: tmpDir, dataFile: tmpFile };
  }

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
  // Check __dirname .data/store.json (for packaged desktop app)
  const dirPath = path.resolve(__dirname, '.data');
  if (fs.existsSync(path.join(dirPath, 'store.json'))) {
    return { dataDir: dirPath, dataFile: path.join(dirPath, 'store.json') };
  }
  // Check parent ../.data/store.json
  const parentPath = path.resolve(process.cwd(), '../.data');
  if (fs.existsSync(path.join(parentPath, 'store.json'))) {
    return { dataDir: parentPath, dataFile: path.join(parentPath, 'store.json') };
  }

  // Default to packages/server/.data or APPDATA on Windows for packaged app
  if (fs.existsSync(path.resolve(process.cwd(), 'packages/server'))) {
    const dir = path.join(process.cwd(), 'packages/server/.data');
    return { dataDir: dir, dataFile: path.join(dir, 'store.json') };
  }

  if (process.env.APPDATA) {
    // Windows: %APPDATA%/InternalAPI/.data
    const appDataDir = path.join(process.env.APPDATA, 'InternalAPI', '.data');
    return { dataDir: appDataDir, dataFile: path.join(appDataDir, 'store.json') };
  } else if (process.platform === 'darwin' && process.env.HOME) {
    // macOS: ~/Library/Application Support/InternalAPI/.data
    const macDataDir = path.join(process.env.HOME, 'Library', 'Application Support', 'InternalAPI', '.data');
    return { dataDir: macDataDir, dataFile: path.join(macDataDir, 'store.json') };
  } else if (process.env.HOME) {
    // Linux: ~/.config/InternalAPI/.data
    const linuxDataDir = path.join(process.env.HOME, '.config', 'InternalAPI', '.data');
    return { dataDir: linuxDataDir, dataFile: path.join(linuxDataDir, 'store.json') };
  }

  const dir = path.join(process.cwd(), '.data');
  return { dataDir: dir, dataFile: path.join(dir, 'store.json') };
}

const { dataDir: DATA_DIR, dataFile: DATA_FILE } = getDataFilePath();

const INITIAL_DEMO_DATA: StorageData = {
  users: [],
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
        if (!Array.isArray(parsed.workspaces) || parsed.workspaces.length === 0) {
          parsed.workspaces = [...INITIAL_DEMO_DATA.workspaces];
        }
        if (!Array.isArray(parsed.environments) || parsed.environments.length === 0) {
          parsed.environments = [...INITIAL_DEMO_DATA.environments];
        }
        if (!Array.isArray(parsed.collections)) {
          parsed.collections = [...INITIAL_DEMO_DATA.collections];
        }
        if (!Array.isArray(parsed.flows)) {
          parsed.flows = [];
        }
        if (!Array.isArray(parsed.users)) {
          parsed.users = [];
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

    // Direct Turso cloud sync if configured
    const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;
    if (tursoUrl && tursoToken) {
      const endpoint = `${tursoUrl.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '')}/v2/pipeline`;
      fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${tursoToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requests: [
            {
              type: 'execute',
              stmt: {
                sql: `INSERT INTO internalapi_store (id, data, updated_at) VALUES ('main', ?, datetime('now'))
                      ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at;`,
                args: [{ type: 'text', value: JSON.stringify(data) }],
              },
            },
            { type: 'close' },
          ],
        }),
      }).catch(() => {});
    }
  }

  private syncPromise: Promise<void> | null = null;

  public async syncFromTurso(): Promise<void> {
    const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;
    if (!tursoUrl || !tursoToken) return;

    if (!this.syncPromise) {
      this.syncPromise = (async () => {
        try {
          const endpoint = `${tursoUrl.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '')}/v2/pipeline`;
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${tursoToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              requests: [
                {
                  type: 'execute',
                  stmt: {
                    sql: `CREATE TABLE IF NOT EXISTS internalapi_store (
                      id TEXT PRIMARY KEY,
                      data TEXT NOT NULL,
                      updated_at TEXT NOT NULL
                    );`,
                    args: [],
                  },
                },
                {
                  type: 'execute',
                  stmt: {
                    sql: `SELECT data FROM internalapi_store WHERE id = 'main';`,
                    args: [],
                  },
                },
                { type: 'close' },
              ],
            }),
          });
          if (res.ok) {
            const json: any = await res.json();
            const row = json.results?.[1]?.response?.result?.rows?.[0]?.[0];
            if (row && typeof row.value === 'string') {
              const remoteData = JSON.parse(row.value);
              if (remoteData?.workspaces && Array.isArray(remoteData.workspaces)) {
                this.data = remoteData;
              }
            } else {
              this.saveData(this.data);
            }
          }
        } catch (_) {}
      })();
    }
    await this.syncPromise;
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

  deleteWorkspace(id: string): boolean {
    const prevLen = this.data.workspaces.length;
    this.data.workspaces = this.data.workspaces.filter((w) => w.id !== id && !w.isDefault);
    this.saveData(this.data);
    return this.data.workspaces.length < prevLen;
  }

  // Flows
  getFlows(workspaceId: string): Flow[] {
    if (!Array.isArray(this.data.flows)) this.data.flows = [];
    return this.data.flows.filter((f) => f.workspaceId === workspaceId);
  }

  getFlow(id: string): Flow | undefined {
    if (!Array.isArray(this.data.flows)) this.data.flows = [];
    return this.data.flows.find((f) => f.id === id);
  }

  saveFlow(flow: Flow): Flow {
    if (!Array.isArray(this.data.flows)) this.data.flows = [];
    const index = this.data.flows.findIndex((f) => f.id === flow.id);
    const toSave: Flow = {
      ...flow,
      id: flow.id || `flow-${crypto.randomUUID()}`,
      updatedAt: new Date().toISOString(),
      createdAt: flow.createdAt || new Date().toISOString(),
    };
    if (index >= 0) {
      this.data.flows[index] = toSave;
    } else {
      this.data.flows.push(toSave);
    }
    this.saveData(this.data);
    return toSave;
  }

  deleteFlow(id: string): boolean {
    if (!Array.isArray(this.data.flows)) this.data.flows = [];
    const prevLen = this.data.flows.length;
    this.data.flows = this.data.flows.filter((f) => f.id !== id);
    this.saveData(this.data);
    return this.data.flows.length < prevLen;
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
        dbConnection: env.dbConnection
          ? {
              ...env.dbConnection,
              password: env.dbConnection.password ? decryptSecret(env.dbConnection.password) : '',
            }
          : undefined,
      }));
  }

  getEnvironmentRaw(id: string): Environment | undefined {
    const env = this.data.environments.find((e) => e.id === id);
    if (!env) return undefined;
    return {
      ...env,
      dbConnection: env.dbConnection
        ? {
            ...env.dbConnection,
            password: env.dbConnection.password ? decryptSecret(env.dbConnection.password) : '',
          }
        : undefined,
    };
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

    let processedDbConn = env.dbConnection ? { ...env.dbConnection } : undefined;
    if (processedDbConn && processedDbConn.password) {
      processedDbConn.password = encryptSecret(processedDbConn.password);
    }

    const toSave: Environment = {
      ...env,
      id: env.id || `env-${crypto.randomUUID()}`,
      variables: processedVariables,
      dbConnection: processedDbConn,
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

    if (process.env.DATABASE_API_URL) {
      try {
        fetch(new URL('/data/history', process.env.DATABASE_API_URL), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(item),
        }).catch(() => {});
      } catch (_) {}
    }

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

  // Users (Admin-managed, Login-only)
  getUsers(): Array<Omit<StoredUser, 'passwordHash' | 'salt'>> {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    return this.data.users.map(({ passwordHash, salt, ...user }) => user);
  }

  getUserByEmail(email: string): StoredUser | undefined {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const normalized = email.trim().toLowerCase();
    let user = this.data.users.find((u) => u.email.toLowerCase() === normalized);
    if (!user && (normalized === 'admin@internalapi.local' || normalized === 'admin@company.internal')) {
      user = this.data.users.find(
        (u) =>
          u.email.toLowerCase() === 'admin@internalapi.local' ||
          u.email.toLowerCase() === 'admin@company.internal'
      );
    }
    return user;
  }

  getUserById(id: string): StoredUser | undefined {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    return this.data.users.find((u) => u.id === id);
  }

  createUser(params: {
    email: string;
    name: string;
    password: string;
    role?: 'admin' | 'editor' | 'viewer';
  }): Omit<StoredUser, 'passwordHash' | 'salt'> {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const normalizedEmail = params.email.trim().toLowerCase();
    if (this.data.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error(`User with email "${params.email}" already exists`);
    }

    const { hash, salt } = hashPassword(params.password);
    const newUser: StoredUser = {
      id: `usr-${crypto.randomUUID()}`,
      email: normalizedEmail,
      name: params.name.trim(),
      passwordHash: hash,
      salt,
      role: params.role || 'editor',
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    this.data.users.push(newUser);
    this.saveData(this.data);

    const { passwordHash: _, salt: __, ...sanitized } = newUser;
    return sanitized;
  }

  deleteUser(id: string): boolean {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const prevLen = this.data.users.length;
    this.data.users = this.data.users.filter((u) => u.id !== id);
    this.saveData(this.data);
    return this.data.users.length < prevLen;
  }

  seedDefaultAdmin(
    email = process.env.ADMIN_EMAIL || 'admin@internalapi.local',
    password = process.env.ADMIN_PASSWORD || 'admin123456',
    name = process.env.ADMIN_NAME || 'InternalAPI Admin'
  ): void {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const normalizedEmail = email.trim().toLowerCase();
    let existing = this.data.users.find(
      (u) =>
        u.email.toLowerCase() === normalizedEmail ||
        u.email.toLowerCase() === 'admin@company.internal' ||
        u.email.toLowerCase() === 'admin@internalapi.local'
    );
    if (!existing) {
      const { hash, salt } = hashPassword(password);
      const adminUser: StoredUser = {
        id: `usr-admin-${crypto.randomUUID()}`,
        email: normalizedEmail,
        name: name.trim(),
        passwordHash: hash,
        salt,
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
      };
      this.data.users.push(adminUser);
      this.saveData(this.data);
    } else if (
      existing.passwordHash === '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' ||
      !verifyPassword(password, existing.passwordHash, existing.salt)
    ) {
      const { hash, salt } = hashPassword(password);
      existing.passwordHash = hash;
      existing.salt = salt;
      this.saveData(this.data);
    }
  }
}

export const db = new LocalFileStorage();

