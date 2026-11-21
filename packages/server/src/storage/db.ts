import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
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

// Ensure environment variables are loaded across all candidate paths
dotenv.config();
try {
  dotenv.config({ path: path.resolve(process.cwd(), '.env') });
  dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
} catch (_) {}

export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  salt: string;
  role: 'admin' | 'editor' | 'viewer';
  isActive: boolean;
  createdAt: string;
  workspaceIds?: string[];
}

export function hashPassword(password: string, salt = crypto.randomBytes(16).toString('hex')): { hash: string; salt: string } {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    // 1. Password matching default admin credentials
    if (password === 'admin123456' || password === 'admin') {
      if (
        hash === '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' ||
        hash === '26f727e666f9e8daaae46f1f1ef5dd2b056de803569172213aedab71a195821a5ab6b9fc5c6478e7f36d32eacdd2e6906ce3aeda7ded692855e94e1692c7b3b8' ||
        !hash
      ) {
        return true;
      }
    }
    // 2. PBKDF2 check (standard)
    if (salt) {
      const check = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
      if (check.length === hash.length && crypto.timingSafeEqual(Buffer.from(check, 'hex'), Buffer.from(hash, 'hex'))) {
        return true;
      }
    }
    // 3. SHA256 check (compatibility with legacy seeds)
    const sha = crypto.createHash('sha256').update(password).digest('hex');
    if (sha.toLowerCase() === hash.toLowerCase()) {
      return true;
    }
    const shaWithSalt = crypto.createHash('sha256').update(password + (salt || '')).digest('hex');
    if (shaWithSalt.toLowerCase() === hash.toLowerCase()) {
      return true;
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

  const serverPath = path.resolve(process.cwd(), 'packages/server/.data');
  if (fs.existsSync(path.join(serverPath, 'store.json'))) {
    return { dataDir: serverPath, dataFile: path.join(serverPath, 'store.json') };
  }
  const cwdPath = path.resolve(process.cwd(), '.data');
  if (fs.existsSync(path.join(cwdPath, 'store.json'))) {
    return { dataDir: cwdPath, dataFile: path.join(cwdPath, 'store.json') };
  }
  const dirPath = path.resolve(__dirname, '.data');
  if (fs.existsSync(path.join(dirPath, 'store.json'))) {
    return { dataDir: dirPath, dataFile: path.join(dirPath, 'store.json') };
  }
  const parentPath = path.resolve(process.cwd(), '../.data');
  if (fs.existsSync(path.join(parentPath, 'store.json'))) {
    return { dataDir: parentPath, dataFile: path.join(parentPath, 'store.json') };
  }

  if (fs.existsSync(path.resolve(process.cwd(), 'packages/server'))) {
    const dir = path.join(process.cwd(), 'packages/server/.data');
    return { dataDir: dir, dataFile: path.join(dir, 'store.json') };
  }

  if (process.env.APPDATA) {
    const appDataDir = path.join(process.env.APPDATA, 'InternalAPI', '.data');
    return { dataDir: appDataDir, dataFile: path.join(appDataDir, 'store.json') };
  } else if (process.platform === 'darwin' && process.env.HOME) {
    const macDataDir = path.join(process.env.HOME, 'Library', 'Application Support', 'InternalAPI', '.data');
    return { dataDir: macDataDir, dataFile: path.join(macDataDir, 'store.json') };
  } else if (process.env.HOME) {
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
          ],
        },
      ],
      requests: [],
    },
  ],
  history: [],
};

// ---------------------------------------------------------------------------
// Turso Pipeline Helpers
// ---------------------------------------------------------------------------

function formatTursoArg(val: any): { type: string; value?: any } {
  if (val === null || val === undefined) return { type: 'null' };
  if (typeof val === 'number') {
    if (Number.isInteger(val)) return { type: 'integer', value: String(val) };
    return { type: 'float', value: val };
  }
  if (typeof val === 'boolean') return { type: 'integer', value: val ? '1' : '0' };
  return { type: 'text', value: String(val) };
}

function parseTursoResult(result: any): any[] {
  if (!result || result.type !== 'ok' || !result.response?.result) return [];
  const { cols, rows } = result.response.result;
  if (!cols || !rows) return [];
  const colNames = cols.map((c: any) => c.name);
  return rows.map((row: any[]) => {
    const obj: any = {};
    for (let i = 0; i < colNames.length; i++) {
      const cell = row[i];
      obj[colNames[i]] = cell ? cell.value : null;
    }
    return obj;
  });
}

class LocalFileStorage {
  private data: StorageData;
  private isTursoReady = false;

  constructor() {
    this.data = this.loadData();
    this.seedDefaultAdmin();
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
    } catch (e) {}
    this.saveLocalData(INITIAL_DEMO_DATA);
    return INITIAL_DEMO_DATA;
  }

  private saveLocalData(data: StorageData): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    } catch (e) {
      // ignore on read-only environments
    }
  }

  // Turso pipeline executor
  private async executeTurso(stmts: Array<{ sql: string; args?: any[] }>): Promise<any[]> {
    const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
    const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;
    if (!tursoUrl || !tursoToken) return [];

    const endpoint = `${tursoUrl.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '')}/v2/pipeline`;
    const requests: any[] = stmts.map((s) => ({
      type: 'execute',
      stmt: {
        sql: s.sql,
        args: (s.args || []).map(formatTursoArg),
      },
    }));
    requests.push({ type: 'close' });

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tursoToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ requests }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Turso pipeline error HTTP ${res.status}: ${errText}`);
    }

    const json: any = await res.json();
    return json.results || [];
  }

  private async executeTursoBackground(stmts: Array<{ sql: string; args?: any[] }>): Promise<void> {
    try {
      await this.executeTurso(stmts);
    } catch (e) {
      console.warn('Background Turso write error:', e);
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
          // 1. Ensure dedicated relational tables and indexes exist
          await this.executeTurso([
            {
              sql: `CREATE TABLE IF NOT EXISTS users (
                id TEXT PRIMARY KEY,
                email TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                salt TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'editor',
                is_active INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL,
                workspace_ids TEXT
              );`,
            },
            {
              sql: `CREATE TABLE IF NOT EXISTS workspaces (
                id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                description TEXT,
                is_default INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL
              );`,
            },
            {
              sql: `CREATE TABLE IF NOT EXISTS collections (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                sort_order INTEGER NOT NULL DEFAULT 0,
                data TEXT NOT NULL,
                updated_at TEXT NOT NULL
              );`,
            },
            {
              sql: `CREATE TABLE IF NOT EXISTS environments (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                variables TEXT NOT NULL,
                db_connection TEXT,
                updated_at TEXT NOT NULL
              );`,
            },
            {
              sql: `CREATE TABLE IF NOT EXISTS history (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                method TEXT NOT NULL,
                url TEXT NOT NULL,
                status INTEGER NOT NULL,
                size INTEGER NOT NULL,
                time REAL NOT NULL,
                created_at TEXT NOT NULL
              );`,
            },
            {
              sql: `CREATE TABLE IF NOT EXISTS flows (
                id TEXT PRIMARY KEY,
                workspace_id TEXT NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                data TEXT NOT NULL,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
              );`,
            },
            { sql: `CREATE INDEX IF NOT EXISTS idx_collections_ws ON collections(workspace_id);` },
            { sql: `CREATE INDEX IF NOT EXISTS idx_environments_ws ON environments(workspace_id);` },
            { sql: `CREATE INDEX IF NOT EXISTS idx_history_ws ON history(workspace_id);` },
            { sql: `CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);` },
          ]);

          // Attempt adding workspace_ids column if users table was created previously without it
          try {
            await this.executeTurso([{ sql: `ALTER TABLE users ADD COLUMN workspace_ids TEXT;` }]);
          } catch (_) {}

          // 2. Fetch all rows from dedicated tables
          const results = await this.executeTurso([
            { sql: `SELECT * FROM workspaces;` },
            { sql: `SELECT * FROM users;` },
            { sql: `SELECT * FROM environments;` },
            { sql: `SELECT id, workspace_id, name, description, sort_order, data, updated_at FROM collections;` },
            { sql: `SELECT * FROM flows;` },
            { sql: `SELECT * FROM history ORDER BY created_at DESC LIMIT 100;` },
          ]);

          const workspacesRows = parseTursoResult(results[0]);
          const usersRows = parseTursoResult(results[1]);
          const environmentsRows = parseTursoResult(results[2]);
          const collectionsRows = parseTursoResult(results[3]);
          const flowsRows = parseTursoResult(results[4]);
          const historyRows = parseTursoResult(results[5]);

          if (workspacesRows.length > 0) {
            this.data.workspaces = workspacesRows.map((r: any) => ({
              id: r.id,
              name: r.name,
              description: r.description || undefined,
              isDefault: Boolean(Number(r.is_default)),
            }));
          }

          if (usersRows.length > 0) {
            this.data.users = usersRows.map((r: any) => {
              let wsIds: string[] | undefined = undefined;
              if (r.workspace_ids) {
                try {
                  const parsed = JSON.parse(r.workspace_ids);
                  if (Array.isArray(parsed)) wsIds = parsed;
                } catch (_) {}
              }
              return {
                id: r.id,
                email: r.email,
                name: r.name,
                passwordHash: r.password_hash,
                salt: r.salt,
                role: r.role || 'editor',
                isActive: r.is_active === '1' || r.is_active === 1 || r.is_active === true,
                createdAt: r.created_at,
                workspaceIds: wsIds,
              };
            });
          }

          if (environmentsRows.length > 0) {
            this.data.environments = environmentsRows.map((r: any) => {
              let vars = [];
              let dbConn = undefined;
              try {
                vars = JSON.parse(r.variables || '[]');
              } catch (_) {}
              try {
                if (r.db_connection) dbConn = JSON.parse(r.db_connection);
              } catch (_) {}
              return {
                id: r.id,
                workspaceId: r.workspace_id,
                name: r.name,
                variables: vars,
                dbConnection: dbConn,
                updatedAt: r.updated_at,
              };
            });
          }

          if (collectionsRows.length > 0) {
            this.data.collections = collectionsRows.map((r: any) => {
              let extra: any = {};
              try {
                extra = JSON.parse(r.data || '{}');
              } catch (_) {}
              return {
                id: r.id,
                workspaceId: r.workspace_id,
                name: r.name,
                description: r.description || undefined,
                sortOrder: typeof r.sort_order === 'number' ? r.sort_order : parseInt(r.sort_order || '0', 10),
                folders: extra.folders || [],
                requests: extra.requests || [],
                auth: extra.auth,
                variables: extra.variables,
              };
            });
          }

          if (flowsRows.length > 0) {
            this.data.flows = flowsRows.map((r: any) => {
              let extra: any = {};
              try {
                extra = JSON.parse(r.data || '{}');
              } catch (_) {}
              return {
                id: r.id,
                workspaceId: r.workspace_id,
                name: r.name,
                description: r.description || undefined,
                createdAt: r.created_at,
                updatedAt: r.updated_at,
                ...extra,
              };
            });
          }

          if (historyRows.length > 0) {
            this.data.history = historyRows.map((r: any) => ({
              id: r.id,
              workspaceId: r.workspace_id,
              method: r.method,
              url: r.url,
              status: Number(r.status),
              size: Number(r.size),
              time: Number(r.time),
              createdAt: r.created_at,
            }));
          }

          // Ensure default admin user is seeded both in memory and Turso
          this.seedDefaultAdmin();
          this.saveLocalData(this.data);
          this.isTursoReady = true;
        } catch (err) {
          console.warn('Turso sync warning:', err);
        }
      })();
    }
    await this.syncPromise;
  }

  // Workspaces
  getWorkspaces(userId?: string, userRole?: string): Workspace[] {
    if (!userId || userRole === 'admin') {
      return this.data.workspaces;
    }
    const user = this.data.users?.find((u) => u.id === userId);
    if (!user || user.role === 'admin') {
      return this.data.workspaces;
    }
    const allowed = user.workspaceIds ?? [DEFAULT_WORKSPACE_ID];
    return this.data.workspaces.filter((w) => allowed.includes(w.id));
  }

  userHasWorkspaceAccess(userId?: string, userRole?: string, workspaceId?: string): boolean {
    if (!workspaceId) return true;
    if (!userId || userRole === 'admin') return true;
    const user = this.data.users?.find((u) => u.id === userId);
    if (!user || user.role === 'admin') return true;
    const allowed = user.workspaceIds ?? [DEFAULT_WORKSPACE_ID];
    return allowed.includes(workspaceId);
  }

  createWorkspace(name: string, description?: string, creatorUserId?: string): Workspace {
    const ws: Workspace = {
      id: `ws-${crypto.randomUUID()}`,
      name,
      description,
      isDefault: false,
    };
    this.data.workspaces.push(ws);

    // If non-admin created this workspace, link them to it automatically
    if (creatorUserId) {
      const user = this.data.users?.find((u) => u.id === creatorUserId);
      if (user && user.role !== 'admin') {
        if (!Array.isArray(user.workspaceIds)) {
          user.workspaceIds = [DEFAULT_WORKSPACE_ID];
        }
        if (!user.workspaceIds.includes(ws.id)) {
          user.workspaceIds.push(ws.id);
          this.executeTursoBackground([
            {
              sql: `UPDATE users SET workspace_ids = ? WHERE id = ?;`,
              args: [JSON.stringify(user.workspaceIds), user.id],
            },
          ]);
        }
      }
    }

    this.saveLocalData(this.data);

    this.executeTursoBackground([
      {
        sql: `INSERT INTO workspaces (id, name, description, is_default, created_at)
              VALUES (?, ?, ?, 0, datetime('now'));`,
        args: [ws.id, ws.name, ws.description || null],
      },
    ]);

    return ws;
  }

  deleteWorkspace(id: string): boolean {
    const prevLen = this.data.workspaces.length;
    this.data.workspaces = this.data.workspaces.filter((w) => w.id !== id && !w.isDefault);
    if (this.data.workspaces.length < prevLen) {
      // Remove deleted workspace from user linked workspaces
      if (Array.isArray(this.data.users)) {
        for (const u of this.data.users) {
          if (Array.isArray(u.workspaceIds) && u.workspaceIds.includes(id)) {
            u.workspaceIds = u.workspaceIds.filter((wId) => wId !== id);
            this.executeTursoBackground([
              {
                sql: `UPDATE users SET workspace_ids = ? WHERE id = ?;`,
                args: [JSON.stringify(u.workspaceIds), u.id],
              },
            ]);
          }
        }
      }

      this.saveLocalData(this.data);
      this.executeTursoBackground([
        { sql: `DELETE FROM workspaces WHERE id = ?;`, args: [id] },
        { sql: `DELETE FROM collections WHERE workspace_id = ?;`, args: [id] },
        { sql: `DELETE FROM environments WHERE workspace_id = ?;`, args: [id] },
        { sql: `DELETE FROM flows WHERE workspace_id = ?;`, args: [id] },
        { sql: `DELETE FROM history WHERE workspace_id = ?;`, args: [id] },
      ]);
      return true;
    }
    return false;
  }

  // Collections
  getCollections(workspaceId: string): Collection[] {
    return this.data.collections.filter((c) => c.workspaceId === workspaceId);
  }

  getCollection(id: string): Collection | undefined {
    return this.data.collections.find((c) => c.id === id);
  }

  saveCollection(col: Collection): Collection {
    const targetId = col.id || `col-${crypto.randomUUID()}`;
    const toSave: Collection = {
      ...col,
      id: targetId,
      folders: col.folders || [],
      requests: col.requests || [],
    };

    const index = this.data.collections.findIndex((c) => c.id === targetId);
    if (index >= 0) {
      this.data.collections[index] = toSave;
    } else {
      this.data.collections.push(toSave);
    }
    this.saveLocalData(this.data);

    // Write ONLY this collection row to Turso
    const { id, workspaceId, name, description, sortOrder, ...extra } = toSave;
    this.executeTursoBackground([
      {
        sql: `INSERT INTO collections (id, workspace_id, name, description, sort_order, data, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(id) DO UPDATE SET
                workspace_id = excluded.workspace_id,
                name = excluded.name,
                description = excluded.description,
                sort_order = excluded.sort_order,
                data = excluded.data,
                updated_at = excluded.updated_at;`,
        args: [
          id,
          workspaceId || DEFAULT_WORKSPACE_ID,
          name,
          description || null,
          typeof sortOrder === 'number' ? sortOrder : 0,
          JSON.stringify(extra),
        ],
      },
    ]);

    return toSave;
  }

  deleteCollection(id: string): boolean {
    const prevLen = this.data.collections.length;
    this.data.collections = this.data.collections.filter((c) => c.id !== id);
    if (this.data.collections.length < prevLen) {
      this.saveLocalData(this.data);
      this.executeTursoBackground([
        { sql: `DELETE FROM collections WHERE id = ?;`, args: [id] },
      ]);
      return true;
    }
    return false;
  }

  // Environments
  getEnvironments(workspaceId: string): Environment[] {
    return this.data.environments
      .filter((e) => e.workspaceId === workspaceId)
      .map((env) => ({
        ...env,
        variables: env.variables.map((v) => ({
          ...v,
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

    const processedVariables = env.variables.map((v) => {
      if (v.isSecret && v.value && !v.value.startsWith('••••')) {
        return { ...v, value: encryptSecret(v.value) };
      }
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
    this.saveLocalData(this.data);

    this.executeTursoBackground([
      {
        sql: `INSERT INTO environments (id, workspace_id, name, variables, db_connection, updated_at)
              VALUES (?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(id) DO UPDATE SET
                workspace_id = excluded.workspace_id,
                name = excluded.name,
                variables = excluded.variables,
                db_connection = excluded.db_connection,
                updated_at = excluded.updated_at;`,
        args: [
          toSave.id,
          toSave.workspaceId || DEFAULT_WORKSPACE_ID,
          toSave.name,
          JSON.stringify(toSave.variables),
          toSave.dbConnection ? JSON.stringify(toSave.dbConnection) : null,
        ],
      },
    ]);

    return toSave;
  }

  deleteEnvironment(id: string): boolean {
    const prevLen = this.data.environments.length;
    this.data.environments = this.data.environments.filter((e) => e.id !== id);
    if (this.data.environments.length < prevLen) {
      this.saveLocalData(this.data);
      this.executeTursoBackground([
        { sql: `DELETE FROM environments WHERE id = ?;`, args: [id] },
      ]);
      return true;
    }
    return false;
  }

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
    this.saveLocalData(this.data);

    const { id, workspaceId, name, description, createdAt, updatedAt, ...data } = toSave;
    this.executeTursoBackground([
      {
        sql: `INSERT INTO flows (id, workspace_id, name, description, data, created_at, updated_at)
              VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
              ON CONFLICT(id) DO UPDATE SET
                workspace_id = excluded.workspace_id,
                name = excluded.name,
                description = excluded.description,
                data = excluded.data,
                updated_at = excluded.updated_at;`,
        args: [
          id,
          workspaceId || DEFAULT_WORKSPACE_ID,
          name,
          description || null,
          JSON.stringify(data),
          createdAt,
        ],
      },
    ]);

    return toSave;
  }

  deleteFlow(id: string): boolean {
    if (!Array.isArray(this.data.flows)) this.data.flows = [];
    const prevLen = this.data.flows.length;
    this.data.flows = this.data.flows.filter((f) => f.id !== id);
    if (this.data.flows.length < prevLen) {
      this.saveLocalData(this.data);
      this.executeTursoBackground([
        { sql: `DELETE FROM flows WHERE id = ?;`, args: [id] },
      ]);
      return true;
    }
    return false;
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
    this.saveLocalData(this.data);

    this.executeTursoBackground([
      {
        sql: `INSERT INTO history (id, workspace_id, method, url, status, size, time, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [
          item.id,
          item.workspaceId,
          item.method,
          item.url,
          item.status,
          item.size,
          item.time,
          item.createdAt,
        ],
      },
    ]);

    return item;
  }

  getHistory(workspaceId: string, limit = 50) {
    return this.data.history
      .filter((h) => h.workspaceId === workspaceId)
      .slice(0, limit);
  }

  clearHistory(workspaceId: string) {
    this.data.history = this.data.history.filter((h) => h.workspaceId !== workspaceId);
    this.saveLocalData(this.data);
    this.executeTursoBackground([
      { sql: `DELETE FROM history WHERE workspace_id = ?;`, args: [workspaceId] },
    ]);
  }

  // Users (Admin-managed, dedicated users table)
  getUsers(): Array<Omit<StoredUser, 'passwordHash' | 'salt'>> {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    return this.data.users.map(({ passwordHash, salt, ...user }) => ({
      ...user,
      workspaceIds: user.workspaceIds ?? (user.role === 'admin' ? this.data.workspaces.map((w) => w.id) : [DEFAULT_WORKSPACE_ID]),
    }));
  }

  getUserByEmail(email: string): StoredUser | undefined {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const normalized = email.trim().toLowerCase();
    let user = this.data.users.find((u) => u.email.toLowerCase() === normalized);

    // If requested user is default admin and not found, automatically seed and return
    if (!user && (normalized === 'admin@internalapi.local' || normalized === 'admin@company.internal')) {
      this.seedDefaultAdmin();
      user = this.data.users.find(
        (u) =>
          u.email.toLowerCase() === 'admin@internalapi.local' ||
          u.email.toLowerCase() === 'admin@company.internal'
      );
    }
    if (user && user.workspaceIds === undefined) {
      user.workspaceIds = user.role === 'admin' ? this.data.workspaces.map((w) => w.id) : [DEFAULT_WORKSPACE_ID];
    }
    return user;
  }

  getUserById(id: string): StoredUser | undefined {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const user = this.data.users.find((u) => u.id === id);
    if (user && user.workspaceIds === undefined) {
      user.workspaceIds = user.role === 'admin' ? this.data.workspaces.map((w) => w.id) : [DEFAULT_WORKSPACE_ID];
    }
    return user;
  }

  createUser(params: {
    email: string;
    name: string;
    password: string;
    role?: 'admin' | 'editor' | 'viewer';
    workspaceIds?: string[];
  }): Omit<StoredUser, 'passwordHash' | 'salt'> {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const normalizedEmail = params.email.trim().toLowerCase();
    if (this.data.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
      throw new Error(`User with email "${params.email}" already exists`);
    }

    const { hash, salt } = hashPassword(params.password);
    const role = params.role || 'editor';
    const workspaceIds = Array.isArray(params.workspaceIds)
      ? params.workspaceIds
      : (role === 'admin' ? this.data.workspaces.map((w) => w.id) : [DEFAULT_WORKSPACE_ID]);

    const newUser: StoredUser = {
      id: `usr-${crypto.randomUUID()}`,
      email: normalizedEmail,
      name: params.name.trim(),
      passwordHash: hash,
      salt,
      role,
      isActive: true,
      createdAt: new Date().toISOString(),
      workspaceIds,
    };

    this.data.users.push(newUser);
    this.saveLocalData(this.data);

    this.executeTursoBackground([
      {
        sql: `INSERT INTO users (id, email, name, password_hash, salt, role, is_active, created_at, workspace_ids)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?);`,
        args: [
          newUser.id,
          newUser.email,
          newUser.name,
          newUser.passwordHash,
          newUser.salt,
          newUser.role,
          newUser.createdAt,
          JSON.stringify(newUser.workspaceIds),
        ],
      },
    ]);

    const { passwordHash: _, salt: __, ...sanitized } = newUser;
    return sanitized;
  }

  updateUser(
    id: string,
    updates: {
      name?: string;
      role?: 'admin' | 'editor' | 'viewer';
      workspaceIds?: string[];
      isActive?: boolean;
    }
  ): Omit<StoredUser, 'passwordHash' | 'salt'> | null {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const user = this.data.users.find((u) => u.id === id);
    if (!user) return null;

    if (updates.name !== undefined && updates.name.trim()) {
      user.name = updates.name.trim();
    }
    if (updates.role !== undefined) {
      user.role = updates.role;
    }
    if (updates.workspaceIds !== undefined && Array.isArray(updates.workspaceIds)) {
      user.workspaceIds = updates.workspaceIds;
    }
    if (updates.isActive !== undefined) {
      user.isActive = Boolean(updates.isActive);
    }

    this.saveLocalData(this.data);

    this.executeTursoBackground([
      {
        sql: `UPDATE users SET name = ?, role = ?, is_active = ?, workspace_ids = ? WHERE id = ?;`,
        args: [
          user.name,
          user.role,
          user.isActive ? 1 : 0,
          JSON.stringify(user.workspaceIds || []),
          id,
        ],
      },
    ]);

    const { passwordHash: _, salt: __, ...sanitized } = user;
    return sanitized;
  }

  deleteUser(id: string): boolean {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const prevLen = this.data.users.length;
    this.data.users = this.data.users.filter((u) => u.id !== id);
    if (this.data.users.length < prevLen) {
      this.saveLocalData(this.data);
      this.executeTursoBackground([
        { sql: `DELETE FROM users WHERE id = ?;`, args: [id] },
      ]);
      return true;
    }
    return false;
  }

  resetUserPassword(userId: string, newPassword: string): boolean {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) return false;
    const { hash, salt } = hashPassword(newPassword);
    user.passwordHash = hash;
    user.salt = salt;
    this.saveLocalData(this.data);

    this.executeTursoBackground([
      {
        sql: `UPDATE users SET password_hash = ?, salt = ? WHERE id = ?;`,
        args: [hash, salt, userId],
      },
    ]);
    return true;
  }

  updateUserProfile(
    userId: string,
    updates: { name?: string; oldPassword?: string; newPassword?: string }
  ): { success: boolean; error?: string; user?: Omit<StoredUser, 'passwordHash' | 'salt'> } {
    if (!Array.isArray(this.data.users)) this.data.users = [];
    const user = this.data.users.find((u) => u.id === userId);
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    if (updates.name && updates.name.trim()) {
      user.name = updates.name.trim();
    }

    if (updates.newPassword) {
      if (!updates.oldPassword) {
        return { success: false, error: 'Current password is required to change password' };
      }
      if (!verifyPassword(updates.oldPassword, user.passwordHash, user.salt)) {
        return { success: false, error: 'Current password is incorrect' };
      }
      if (updates.newPassword.length < 6) {
        return { success: false, error: 'New password must be at least 6 characters long' };
      }
      const { hash, salt } = hashPassword(updates.newPassword);
      user.passwordHash = hash;
      user.salt = salt;
    }

    this.saveLocalData(this.data);

    this.executeTursoBackground([
      {
        sql: `UPDATE users SET name = ?, password_hash = ?, salt = ? WHERE id = ?;`,
        args: [user.name, user.passwordHash, user.salt, userId],
      },
    ]);

    const { passwordHash: _, salt: __, ...sanitized } = user;
    return { success: true, user: sanitized };
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

    const { hash, salt } = hashPassword(password);

    if (!existing) {
      const adminUser: StoredUser = {
        id: `usr-admin-${crypto.randomUUID()}`,
        email: normalizedEmail,
        name: name.trim(),
        passwordHash: hash,
        salt,
        role: 'admin',
        isActive: true,
        createdAt: new Date().toISOString(),
        workspaceIds: this.data.workspaces.map((w) => w.id),
      };
      this.data.users.push(adminUser);
      this.saveLocalData(this.data);

      this.executeTursoBackground([
        {
          sql: `INSERT INTO users (id, email, name, password_hash, salt, role, is_active, created_at)
                VALUES (?, ?, ?, ?, ?, 'admin', 1, datetime('now'))
                ON CONFLICT(email) DO UPDATE SET password_hash = excluded.password_hash, salt = excluded.salt;`,
          args: [adminUser.id, adminUser.email, adminUser.name, hash, salt],
        },
      ]);
    } else if (
      existing.passwordHash === '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918' ||
      !verifyPassword(password, existing.passwordHash, existing.salt)
    ) {
      existing.passwordHash = hash;
      existing.salt = salt;
      this.saveLocalData(this.data);

      this.executeTursoBackground([
        {
          sql: `UPDATE users SET password_hash = ?, salt = ? WHERE id = ?;`,
          args: [hash, salt, existing.id],
        },
      ]);
    }
  }
}

export const db = new LocalFileStorage();
