import { fetch } from 'undici';
import dotenv from 'dotenv';
import path from 'node:path';

// Load .env from workspace root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

const DEFAULT_WORKSPACE_ID = 'ws-default-company';

async function seedTurso(tursoUrl: string, tursoToken: string) {
  const cleanUrl = tursoUrl.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '');
  console.log('🌱 Seeding InternalAPI database...');
  console.log(`Connected to Turso Cloud (${cleanUrl})`);

  // 1. Ensure table exists
  await fetch(`${cleanUrl}/v2/pipeline`, {
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
        { type: 'close' },
      ],
    }),
  });

  // 2. Fetch existing data
  const getRes = await fetch(`${cleanUrl}/v2/pipeline`, {
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
            sql: "SELECT data FROM internalapi_store WHERE id = 'main';",
            args: [],
          },
        },
        { type: 'close' },
      ],
    }),
  });

  let existingData: any = {};
  if (getRes.ok) {
    const json: any = await getRes.json();
    const row = json.results?.[0]?.response?.result?.rows?.[0]?.[0]?.value;
    if (row && typeof row === 'string') {
      try {
        existingData = JSON.parse(row);
      } catch (_) {}
    }
  }

  // Workspaces
  const workspaces = Array.isArray(existingData.workspaces) && existingData.workspaces.length > 0
    ? existingData.workspaces
    : [
        {
          id: DEFAULT_WORKSPACE_ID,
          name: 'Company Internal APIs',
          description: 'Default company workspace for internal and microservice testing',
          isDefault: true,
        },
      ];

  // Users
  const users = Array.isArray(existingData.users) && existingData.users.length > 0
    ? existingData.users
    : [
        {
          id: 'usr-admin-default',
          email: 'admin@company.internal',
          name: 'InternalAPI Administrator',
          passwordHash: '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918',
          salt: 'default-admin-salt',
          role: 'admin',
          isActive: true,
          createdAt: new Date().toISOString(),
        },
      ];

  // Environments
  const environments = Array.isArray(existingData.environments) && existingData.environments.length > 0
    ? existingData.environments
    : [
        {
          id: 'env-development',
          workspaceId: DEFAULT_WORKSPACE_ID,
          name: 'Development',
          variables: [
            { id: 'v1', key: 'base_url', value: 'https://httpbin.org', isSecret: false, isEnabled: true },
            { id: 'v2', key: 'auth_token', value: 'dev-token-abc12345', isSecret: true, isEnabled: true },
          ],
        },
      ];

  // Collections (Preserve existing collections like "Revamped LMS")
  const collections = Array.isArray(existingData.collections) && existingData.collections.length > 0
    ? existingData.collections
    : [
        {
          id: 'col-getting-started',
          workspaceId: DEFAULT_WORKSPACE_ID,
          name: 'Demo Endpoints & Health',
          description: 'Getting started collection with samples of GET, POST, Auth, and Variables',
          sortOrder: 0,
          requests: [
            {
              id: 'req-demo-1',
              collectionId: 'col-getting-started',
              name: 'Health Check / GET Demo',
              method: 'GET',
              url: '{{base_url}}/get',
              queryParams: [{ id: '1', key: 'source', value: 'internalapi', isEnabled: true }],
              headers: [{ id: '1', key: 'Accept', value: 'application/json', isEnabled: true }],
              bodyType: 'none',
              auth: { type: 'none' },
            },
          ],
        },
      ];

  const fullStore = {
    ...existingData,
    workspaces,
    users,
    environments,
    collections,
    history: Array.isArray(existingData.history) ? existingData.history : [],
    flows: Array.isArray(existingData.flows) ? existingData.flows : [],
  };

  // 3. Save into Turso
  const saveRes = await fetch(`${cleanUrl}/v2/pipeline`, {
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
            args: [{ type: 'text', value: JSON.stringify(fullStore) }],
          },
        },
        { type: 'close' },
      ],
    }),
  });

  if (!saveRes.ok) {
    throw new Error(`Turso save failed (${saveRes.status}): ${await saveRes.text()}`);
  }

  console.log(`✓ Workspaces: ${workspaces.length} (${workspaces.map((w: any) => w.name).join(', ')})`);
  console.log(`✓ Admin user: ${users[0]?.email}`);
  console.log(`✓ Environments: ${environments.length}`);
  console.log(`✓ Collections: ${collections.length} (${collections.map((c: any) => c.name).join(', ')})`);
  console.log('✅ Seeding completed successfully!');
}

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    await seedTurso(tursoUrl, tursoToken);
    return;
  }

  // Fallback to Prisma if PostgreSQL DATABASE_URL is set
  if (process.env.DATABASE_URL) {
    const { PrismaClient } = await import('@prisma/client');
    const prisma = new PrismaClient();
    try {
      console.log('🌱 Seeding InternalAPI database via PostgreSQL Prisma...');
      const workspace = await prisma.workspace.upsert({
        where: { id: DEFAULT_WORKSPACE_ID },
        update: {},
        create: {
          id: DEFAULT_WORKSPACE_ID,
          name: 'Company Internal APIs',
          description: 'Default company workspace for internal and microservice testing',
          isDefault: true,
        },
      });
      console.log('✅ Seeding completed successfully!');
    } finally {
      await prisma.$disconnect();
    }
    return;
  }

  console.error('❌ Neither TURSO_DATABASE_URL nor DATABASE_URL found in environment.');
  process.exit(1);
}

main().catch((e) => {
  console.error('Seeding error:', e.message || e);
  process.exit(1);
});
