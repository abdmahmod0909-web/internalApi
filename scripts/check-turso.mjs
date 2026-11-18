import { fetch } from 'undici';
import dotenv from 'dotenv';
import path from 'node:path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config();

const rawUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
const token = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

if (!rawUrl || !token) {
  console.error('❌ Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in environment.');
  process.exit(1);
}

const endpoint = `${rawUrl.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '')}/v2/pipeline`;

async function main() {
  console.log(`📡 Connecting to Turso Cloud at: ${rawUrl}`);
  
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      requests: [
        {
          type: 'execute',
          stmt: {
            sql: "SELECT data, updated_at FROM internalapi_store WHERE id = 'main';",
            args: [],
          },
        },
        { type: 'close' },
      ],
    }),
  });

  if (!res.ok) {
    console.error(`❌ HTTP error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  const json = await res.json();
  const row = json.results?.[0]?.response?.result?.rows?.[0];
  if (!row) {
    console.log('⚠️  Connected to Turso successfully, but table "internalapi_store" is not seeded yet.');
    return;
  }

  const updatedAt = row[1]?.value;
  const data = JSON.parse(row[0]?.value || '{}');

  console.log('✅ Connected to Turso successfully!');
  console.log(`🕒 Last synchronized at: ${updatedAt}`);
  console.log(`📁 Workspaces: ${data.workspaces?.length || 0} (${(data.workspaces || []).map((w) => w.name).join(', ')})`);
  console.log(`📦 Collections: ${data.collections?.length || 0} (${(data.collections || []).map((c) => c.name).join(', ')})`);
  console.log(`🌍 Environments: ${data.environments?.length || 0} (${(data.environments || []).map((e) => e.name).join(', ')})`);
  console.log(`👤 Users: ${data.users?.length || 0} (${(data.users || []).map((u) => u.email).join(', ')})`);
}

main().catch((err) => {
  console.error('❌ Connection failed:', err.message || err);
  process.exit(1);
});
