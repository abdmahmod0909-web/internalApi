import { buildApp } from './app.js';
import dotenv from 'dotenv';
import type { FastifyInstance } from 'fastify';

dotenv.config();

export const DEFAULT_PORT = 39281;
export const DEFAULT_HOST = '127.0.0.1';

let serverInstance: FastifyInstance | null = null;

export async function startServer(
  port = parseInt(process.env.PORT || String(DEFAULT_PORT), 10),
  host = process.env.HOST || DEFAULT_HOST
): Promise<FastifyInstance> {
  if (serverInstance) {
    return serverInstance;
  }

  const app = buildApp();

  try {
    await app.listen({ port, host });
    console.log(`🚀 InternalAPI Server listening on http://${host}:${port}`);
    console.log(`📊 Health check available at http://${host}:${port}/health`);
    serverInstance = app;
    return app;
  } catch (err: any) {
    if (host !== '127.0.0.1') {
      try {
        await app.listen({ port, host: '127.0.0.1' });
        console.log(`🚀 InternalAPI Server listening on http://127.0.0.1:${port}`);
        serverInstance = app;
        return app;
      } catch (innerErr) {
        app.log.error(innerErr);
      }
    }
    app.log.error(err);
    throw err;
  }
}

// Auto-start when executed as standalone script (CLI or node index.js)
if (process.env.NODE_ENV !== 'test') {
  startServer().catch(() => {
    // If already running (e.g. spawned previously), log gracefully
    console.log('InternalAPI server already listening or starting.');
  });
}
