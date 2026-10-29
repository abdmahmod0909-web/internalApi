import pg from 'pg';
import mysql from 'mysql2/promise';
import type { DatabaseConnectionConfig, Collection } from '@internalapi/shared';

export interface DbTestResult {
  success: boolean;
  message: string;
}

// Pool caches by connection signature
const pgPools = new Map<string, pg.Pool>();
const mysqlPools = new Map<string, mysql.Pool>();

function getPoolKey(config: DatabaseConnectionConfig): string {
  return `${config.type}://${config.username}@${config.host}:${config.port || (config.type === 'postgres' ? 5432 : 3306)}/${config.database}?ssl=${Boolean(config.ssl)}`;
}

export function isDbConfigured(config?: DatabaseConnectionConfig | null): boolean {
  if (!config) return false;
  return Boolean(config.host?.trim() && config.database?.trim() && config.username?.trim());
}

export async function testDatabaseConnection(config: DatabaseConnectionConfig): Promise<DbTestResult> {
  if (!isDbConfigured(config)) {
    return { success: false, message: 'Host, database name, and username are required.' };
  }

  const port = Number(config.port) || (config.type === 'postgres' ? 5432 : 3306);

  if (config.type === 'postgres') {
    const client = new pg.Client({
      host: config.host.trim(),
      port,
      database: config.database.trim(),
      user: config.username.trim(),
      password: config.password || '',
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      connectionTimeoutMillis: 5000,
    });
    try {
      await client.connect();
      await client.query('SELECT 1 AS check_alive');
      await ensurePostgresTable(client);
      await client.end();
      return {
        success: true,
        message: `Successfully connected to PostgreSQL database "${config.database}" at ${config.host}:${port}! Table "internalapi_collections" is ready.`,
      };
    } catch (err: any) {
      try { await client.end(); } catch {}
      return { success: false, message: `PostgreSQL connection failed: ${err.message || err}` };
    }
  } else if (config.type === 'mysql') {
    try {
      const conn = await mysql.createConnection({
        host: config.host.trim(),
        port,
        database: config.database.trim(),
        user: config.username.trim(),
        password: config.password || '',
        ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
        connectTimeout: 5000,
      });
      await conn.query('SELECT 1 AS check_alive');
      await ensureMysqlTable(conn);
      await conn.end();
      return {
        success: true,
        message: `Successfully connected to MySQL database "${config.database}" at ${config.host}:${port}! Table "internalapi_collections" is ready.`,
      };
    } catch (err: any) {
      return { success: false, message: `MySQL connection failed: ${err.message || err}` };
    }
  }

  return { success: false, message: `Unsupported database type: ${config.type}` };
}

async function ensurePostgresTable(client: pg.Client | pg.PoolClient): Promise<void> {
  await client.query(`
    CREATE TABLE IF NOT EXISTS internalapi_collections (
      id VARCHAR(255) PRIMARY KEY,
      workspace_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      data TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

async function ensureMysqlTable(conn: mysql.Connection | mysql.Pool): Promise<void> {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS internalapi_collections (
      id VARCHAR(255) PRIMARY KEY,
      workspace_id VARCHAR(255) NOT NULL,
      name VARCHAR(255) NOT NULL,
      data LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);
}

function getPgPool(config: DatabaseConnectionConfig): pg.Pool {
  const key = getPoolKey(config);
  let pool = pgPools.get(key);
  if (!pool) {
    const port = Number(config.port) || 5432;
    pool = new pg.Pool({
      host: config.host.trim(),
      port,
      database: config.database.trim(),
      user: config.username.trim(),
      password: config.password || '',
      ssl: config.ssl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
    pgPools.set(key, pool);
  }
  return pool;
}

function getMysqlPool(config: DatabaseConnectionConfig): mysql.Pool {
  const key = getPoolKey(config);
  let pool = mysqlPools.get(key);
  if (!pool) {
    const port = Number(config.port) || 3306;
    pool = mysql.createPool({
      host: config.host.trim(),
      port,
      database: config.database.trim(),
      user: config.username.trim(),
      password: config.password || '',
      ssl: config.ssl ? { rejectUnauthorized: false } : undefined,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      connectTimeout: 5000,
    });
    mysqlPools.set(key, pool);
  }
  return pool;
}

export async function getRemoteCollections(config: DatabaseConnectionConfig, workspaceId: string): Promise<Collection[]> {
  const port = Number(config.port) || (config.type === 'postgres' ? 5432 : 3306);

  if (config.type === 'postgres') {
    const pool = getPgPool(config);
    const client = await pool.connect();
    try {
      await ensurePostgresTable(client);
      const res = await client.query(
        'SELECT data FROM internalapi_collections WHERE workspace_id = $1 ORDER BY updated_at ASC',
        [workspaceId]
      );
      return res.rows.map((row) => JSON.parse(row.data) as Collection);
    } finally {
      client.release();
    }
  } else if (config.type === 'mysql') {
    const pool = getMysqlPool(config);
    await ensureMysqlTable(pool);
    const [rows] = await pool.query(
      'SELECT data FROM internalapi_collections WHERE workspace_id = ? ORDER BY updated_at ASC',
      [workspaceId]
    );
    const list = rows as Array<{ data: string }>;
    return list.map((r) => JSON.parse(r.data) as Collection);
  }

  return [];
}

export async function saveRemoteCollection(config: DatabaseConnectionConfig, col: Collection): Promise<Collection> {
  const colId = col.id;
  const wsId = col.workspaceId || 'ws-default-company';
  const name = col.name;
  const jsonStr = JSON.stringify(col);

  if (config.type === 'postgres') {
    const pool = getPgPool(config);
    const client = await pool.connect();
    try {
      await ensurePostgresTable(client);
      await client.query(
        `INSERT INTO internalapi_collections (id, workspace_id, name, data, updated_at)
         VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           data = EXCLUDED.data,
           updated_at = CURRENT_TIMESTAMP`,
        [colId, wsId, name, jsonStr]
      );
      return col;
    } finally {
      client.release();
    }
  } else if (config.type === 'mysql') {
    const pool = getMysqlPool(config);
    await ensureMysqlTable(pool);
    await pool.query(
      `INSERT INTO internalapi_collections (id, workspace_id, name, data)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         data = VALUES(data),
         updated_at = CURRENT_TIMESTAMP`,
      [colId, wsId, name, jsonStr]
    );
    return col;
  }

  return col;
}

export async function deleteRemoteCollection(config: DatabaseConnectionConfig, colId: string): Promise<boolean> {
  if (config.type === 'postgres') {
    const pool = getPgPool(config);
    const client = await pool.connect();
    try {
      await ensurePostgresTable(client);
      const res = await client.query('DELETE FROM internalapi_collections WHERE id = $1', [colId]);
      return (res.rowCount || 0) > 0;
    } finally {
      client.release();
    }
  } else if (config.type === 'mysql') {
    const pool = getMysqlPool(config);
    await ensureMysqlTable(pool);
    const [result] = await pool.query('DELETE FROM internalapi_collections WHERE id = ?', [colId]);
    return (result as any)?.affectedRows > 0;
  }

  return false;
}

