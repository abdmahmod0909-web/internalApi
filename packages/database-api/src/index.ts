import Fastify, { FastifyInstance } from 'fastify';
import dotenv from 'dotenv';
import { dbService } from './storage.js';

dotenv.config();

export const DEFAULT_PORT = 39282;

export function buildDatabaseApp(): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV !== 'test',
  });

  // Health
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'database-api',
      driver: dbService.getDriver(),
      timestamp: new Date().toISOString(),
    };
  });

  // Workspaces
  app.get('/data/workspaces', async () => {
    return dbService.getWorkspaces();
  });

  app.post('/data/workspaces', async (req, reply) => {
    const body = req.body as { name?: string; description?: string };
    if (!body?.name) {
      return reply.status(400).send({ error: 'Workspace name is required' });
    }
    return dbService.addWorkspace(body.name, body.description);
  });

  app.delete('/data/workspaces/:id', async (req) => {
    const { id } = req.params as { id: string };
    const success = dbService.deleteWorkspace(id);
    return { success };
  });

  // Collections
  app.get('/data/collections', async (req) => {
    const query = req.query as { workspaceId?: string };
    return dbService.getCollections(query.workspaceId);
  });

  app.post('/data/collections', async (req) => {
    const body = req.body as any;
    return dbService.saveCollection(body);
  });

  app.delete('/data/collections/:id', async (req) => {
    const { id } = req.params as { id: string };
    const success = dbService.deleteCollection(id);
    return { success };
  });

  // Environments
  app.get('/data/environments', async (req) => {
    const query = req.query as { workspaceId?: string };
    return dbService.getEnvironments(query.workspaceId);
  });

  app.post('/data/environments', async (req) => {
    const body = req.body as any;
    return dbService.saveEnvironment(body);
  });

  app.delete('/data/environments/:id', async (req) => {
    const { id } = req.params as { id: string };
    const success = dbService.deleteEnvironment(id);
    return { success };
  });

  // History
  app.get('/data/history', async (req) => {
    const query = req.query as { workspaceId?: string; limit?: string };
    return dbService.getHistory(query.workspaceId, query.limit ? parseInt(query.limit, 10) : 50);
  });

  app.post('/data/history', async (req) => {
    const body = req.body as any;
    return dbService.addHistory(body);
  });

  app.delete('/data/history', async (req) => {
    const query = req.query as { workspaceId?: string };
    dbService.clearHistory(query.workspaceId);
    return { success: true };
  });

  // Users
  app.get('/data/users', async () => {
    return dbService.getUsers();
  });

  return app;
}

export const app = buildDatabaseApp();

// Vercel serverless request handler
const handler = async function (req: any, res: any) {
  await app.ready();
  return new Promise((resolve, reject) => {
    res.on('finish', () => resolve(true));
    res.on('close', () => resolve(true));
    res.on('error', (err: any) => reject(err));
    app.server.emit('request', req, res);
  });
};

export default Object.assign(handler, app);
