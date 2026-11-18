import { fetch } from 'undici';
import dotenv from 'dotenv';
import path from 'node:path';
import { spawn } from 'node:child_process';

// Load .env from workspace root or current directory
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config();

async function main() {
  const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
  const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

  if (tursoUrl && tursoToken) {
    const cleanUrl = tursoUrl.replace(/^libsql:\/\//, 'https://').replace(/\/+$/, '');
    console.log(`Prisma & Turso Migration Manager`);
    console.log(`Datasource "db": Turso libSQL Cloud Database (${cleanUrl})`);
    console.log(`Applying migrations to Turso...`);

    const res = await fetch(`${cleanUrl}/v2/pipeline`, {
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

    if (!res.ok) {
      throw new Error(`Turso HTTP error (${res.status}): ${await res.text()}`);
    }

    console.log(`✓ Table "internalapi_store" is ready in Turso.`);
    console.log(`✓ Schema is up to date with Turso Cloud Database!`);
    return;
  }

  // Fallback to prisma migrate dev if PostgreSQL DATABASE_URL is configured
  if (process.env.DATABASE_URL) {
    const child = spawn('npx', ['prisma', 'migrate', 'dev'], { stdio: 'inherit', shell: true });
    child.on('exit', (code) => process.exit(code || 0));
    return;
  }

  console.error('❌ Neither TURSO_DATABASE_URL nor DATABASE_URL found in environment.');
  process.exit(1);
}

main().catch((err) => {
  console.error('Migration error:', err.message || err);
  process.exit(1);
});
