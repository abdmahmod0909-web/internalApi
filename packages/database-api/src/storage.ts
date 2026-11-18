import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import pg from 'pg';
import { fetch } from 'undici';
import type {
  Workspace,
  Collection,
  Environment,
  Flow,
} from '@internalapi/shared';

export interface StorageData {
  users: Array<{
    id: string;
    email: string;
    name: string;
    passwordHash: string;
    salt: string;
    role: 'admin' | 'editor' | 'viewer';
    isActive: boolean;
    createdAt: string;
  }>;
  workspaces: Workspace[];
  collections: Collection[];
  environments: Environment[];
  flows: Flow[];
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

const DEFAULT_DATA: StorageData = {
  users: [
    {
      id: 'usr-admin-default',
      email: 'admin@internalapi.local',
      name: 'InternalAPI Admin',
      passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
      salt: 'default-admin-salt',
      role: 'admin',
      isActive: true,
      createdAt: new Date().toISOString(),
    },
  ],
  workspaces: [
    {
      id: DEFAULT_WORKSPACE_ID,
      name: 'Company Internal APIs',
      description: 'Default company workspace for internal and microservice testing',
      isDefault: true,
    },
  ],
  collections: [],
  environments: [
    {
      id: 'env-development',
      workspaceId: DEFAULT_WORKSPACE_ID,
      name: 'Development',
      variables: [
        { id: 'v1', key: 'base_url', value: 'https://httpbin.org', isSecret: false, isEnabled: true },
      ],
    },
  ],
  flows: [],
  history: [],
};

export class DatabaseService {
  private data: StorageData;
  private filePath: string;
  private driver: 'turso' | 'postgres' | 'local' = 'local';
  private pgPool?: pg.Pool;
  private tursoUrl?: string;
  private tursoToken?: string;

  private readyPromise: Promise<void> | null = null;

  constructor() {
    this.filePath = process.env.VERCEL
      ? '/tmp/db-api-store.json'
      : path.resolve(process.cwd(), '.data/store.json');

    this.initDrivers();
    this.data = this.loadInitial();

    if (this.driver === 'turso') {
      this.ensureReady().catch(() => {});
    }
  }

  private initDrivers() {
    const dbType = (process.env.DB_TYPE || '').toLowerCase();
    const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

    // Prioritize Turso cloud database above PostgreSQL
    if (tursoUrl && tursoToken) {
      this.driver = 'turso';
      this.tursoUrl = tursoUrl.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '');
      this.tursoToken = tursoToken;
    } else if (dbType !== 'turso' && (process.env.DATABASE_URL || process.env.POSTGRES_URL)) {
      this.driver = 'postgres';
      this.pgPool = new pg.Pool({
        connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
        ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
      });
    } else {
      this.driver = 'local';
    }
  }

  public getDriver() {
    return this.driver;
  }

  public async ensureReady(): Promise<void> {
    if (this.driver !== 'turso') return;
    if (!this.readyPromise) {
      this.readyPromise = this.initTurso().catch((err) => {
        console.error('Turso init error:', err);
      });
    }
    await this.readyPromise;
  }

  public async queryTurso(sql: string, args: any[] = []): Promise<any> {
    if (!this.tursoUrl || !this.tursoToken) return null;
    const endpoint = `${this.tursoUrl}/v2/pipeline`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.tursoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        requests: [
          {
            type: 'execute',
            stmt: {
              sql,
              args: args.map((a) => {
                if (typeof a === 'number') return { type: 'integer', value: String(a) };
                if (typeof a === 'boolean') return { type: 'integer', value: a ? '1' : '0' };
                if (a === null || a === undefined) return { type: 'null' };
                return { type: 'text', value: String(a) };
              }),
            },
          },
          { type: 'close' },
        ],
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Turso HTTP error (${res.status}): ${err}`);
    }

    const json: any = await res.json();
    return json.results?.[0]?.response?.result;
  }

  private async initTurso() {
    try {
      await this.queryTurso(`
        CREATE TABLE IF NOT EXISTS internalapi_store (
          id TEXT PRIMARY KEY,
          data TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
      `);

      const result = await this.queryTurso(`SELECT data FROM internalapi_store WHERE id = 'main';`);
      const row = result?.rows?.[0]?.[0];
      if (row && typeof row.value === 'string') {
        const remoteData = JSON.parse(row.value);
        if (remoteData?.workspaces) {
          this.data = remoteData;
        }
      } else {
        await this.syncToTurso();
      }
    } catch (_) {}
  }

  private async syncToTurso() {
    if (this.driver !== 'turso') return;
    try {
      const raw = JSON.stringify(this.data);
      await this.queryTurso(
        `INSERT INTO internalapi_store (id, data, updated_at) VALUES ('main', ?, datetime('now'))
         ON CONFLICT(id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at;`,
        [raw]
      );
    } catch (_) {}
  }

  private loadInitial(): StorageData {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        return JSON.parse(raw);
      }
      const bundled = [
        path.resolve(process.cwd(), 'packages/server/.data/store.json'),
        path.resolve(process.cwd(), '../server/.data/store.json'),
        path.resolve(process.cwd(), '.data/store.json'),
      ].find((p) => fs.existsSync(p));
      if (bundled) {
        const raw = fs.readFileSync(bundled, 'utf8');
        return JSON.parse(raw);
      }
    } catch (_) {}
    return { ...DEFAULT_DATA };
  }

  private persist() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (_) {}

    if (this.driver === 'turso') {
      this.syncToTurso().catch(() => {});
    }
  }

  // Workspaces
  getWorkspaces(): Workspace[] {
    return this.data.workspaces;
  }

  addWorkspace(name: string, description = ''): Workspace {
    const ws: Workspace = {
      id: `ws-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      name,
      description,
      isDefault: false,
    };
    this.data.workspaces.push(ws);
    this.persist();
    return ws;
  }

  deleteWorkspace(id: string): boolean {
    const prev = this.data.workspaces.length;
    this.data.workspaces = this.data.workspaces.filter((w) => w.id !== id && !w.isDefault);
    this.persist();
    return this.data.workspaces.length < prev;
  }

  // Collections
  getCollections(workspaceId?: string): Collection[] {
    if (!workspaceId) return this.data.collections;
    return this.data.collections.filter((c) => c.workspaceId === workspaceId);
  }

  saveCollection(col: Collection): Collection {
    const idx = this.data.collections.findIndex((c) => c.id === col.id);
    if (idx >= 0) {
      this.data.collections[idx] = col;
    } else {
      if (!col.id) col.id = `col-${Date.now()}`;
      this.data.collections.push(col);
    }
    this.persist();
    return col;
  }

  deleteCollection(id: string): boolean {
    const prev = this.data.collections.length;
    this.data.collections = this.data.collections.filter((c) => c.id !== id);
    this.persist();
    return this.data.collections.length < prev;
  }

  // Environments
  getEnvironments(workspaceId?: string): Environment[] {
    if (!workspaceId) return this.data.environments;
    return this.data.environments.filter((e) => e.workspaceId === workspaceId);
  }

  saveEnvironment(env: Environment): Environment {
    const idx = this.data.environments.findIndex((e) => e.id === env.id);
    if (idx >= 0) {
      this.data.environments[idx] = env;
    } else {
      if (!env.id) env.id = `env-${Date.now()}`;
      this.data.environments.push(env);
    }
    this.persist();
    return env;
  }

  deleteEnvironment(id: string): boolean {
    const prev = this.data.environments.length;
    this.data.environments = this.data.environments.filter((e) => e.id !== id);
    this.persist();
    return this.data.environments.length < prev;
  }

  // History
  getHistory(workspaceId?: string, limit = 50) {
    let items = this.data.history;
    if (workspaceId) {
      items = items.filter((h) => h.workspaceId === workspaceId);
    }
    return items.slice(0, limit);
  }

  addHistory(entry: Omit<StorageData['history'][0], 'id' | 'createdAt'>) {
    const item = {
      ...entry,
      id: `hist-${crypto.randomUUID()}`,
      createdAt: new Date().toISOString(),
    };
    this.data.history.unshift(item);
    if (this.data.history.length > 500) {
      this.data.history.pop();
    }
    this.persist();
    return item;
  }

  clearHistory(workspaceId?: string) {
    if (workspaceId) {
      this.data.history = this.data.history.filter((h) => h.workspaceId !== workspaceId);
    } else {
      this.data.history = [];
    }
    this.persist();
  }

  // Users
  getUsers() {
    return this.data.users.map(({ passwordHash, salt, ...u }) => u);
  }

  getUserByEmail(email: string) {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }
}

export const dbService = new DatabaseService();
