import { buildApp } from './app.js';
import dotenv from 'dotenv';
import type { FastifyInstance } from 'fastify';

dotenv.config();

export const DEFAULT_PORT = 39281;
export const DEFAULT_HOST = '127.0.0.1';

let serverInstance: FastifyInstance | null = null;

function safeLog(...args: any[]) {
  try {
    if (typeof process !== 'undefined' && process.stdout && !process.stdout.destroyed) {
      console.log(...args);
    }
  } catch (_) {}
}

const isElectron = typeof (process as any).versions?.electron !== 'undefined';
export const app: FastifyInstance = buildApp({ logger: !isElectron && process.env.NODE_ENV !== 'test' });

export async function startServer(
  port = parseInt(process.env.PORT || String(DEFAULT_PORT), 10),
  host = process.env.HOST || DEFAULT_HOST
): Promise<FastifyInstance> {
  if (serverInstance) {
    return serverInstance;
  }

  try {
    await app.listen({ port, host });
    safeLog(`🚀 InternalAPI Server listening on http://${host}:${port}`);
    safeLog(`📊 Health check available at http://${host}:${port}/health`);
    serverInstance = app;
    return app;
  } catch (err: any) {
    if (host !== '127.0.0.1') {
      try {
        await app.listen({ port, host: '127.0.0.1' });
        safeLog(`🚀 InternalAPI Server listening on http://127.0.0.1:${port}`);
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
if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer().catch(() => {
    // If already running (e.g. spawned previously), log gracefully
    console.log('InternalAPI server already listening or starting.');
  });
}

// Vercel Serverless Function entry point
const handler = async function (req: any, res: any) {
  await app.ready();
  // Ensure req.url matches Fastify registered routes whether /api prefix was preserved or stripped
  if (req.url && !req.url.startsWith('/api') && req.url !== '/health' && !req.url.startsWith('/health')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }
  return new Promise((resolve, reject) => {
    res.on('finish', () => resolve(true));
    res.on('close', () => resolve(true));
    res.on('error', (err: any) => reject(err));
    app.server.emit('request', req, res);
  });
};

export default Object.assign(handler, app);
