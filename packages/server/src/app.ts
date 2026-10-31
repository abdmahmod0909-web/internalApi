import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import path from 'node:path';
import fs from 'node:fs';
import { interpolateDeep } from '@internalapi/shared';
import type { ApiRequestData } from '@internalapi/shared';
import { db } from './storage/db.js';
import {
  testDatabaseConnection,
  getRemoteCollections,
  saveRemoteCollection,
  deleteRemoteCollection,
  isDbConfigured,
} from './storage/db-sync.js';
import { executeProxyRequest } from './proxy/http-client.js';
import { fetchOAuth2ClientCredentials } from './proxy/oauth2.js';

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true,
    bodyLimit: 50 * 1024 * 1024, // 50MB for large payloads
  });

  app.register(sensible);
  app.register(cors, {
    origin: true,
    credentials: true,
  });
  app.register(helmet, {
    crossOriginResourcePolicy: false,
    contentSecurityPolicy: false,
  });
  app.register(multipart, {
    limits: {
      fileSize: 30 * 1024 * 1024, // 30MB
    },
  });

  // Serve static client build if present
  const possibleDistPaths = [
    path.resolve(__dirname, 'client_dist'),
    path.resolve(__dirname, '../client_dist'),
    path.resolve(process.cwd(), 'client_dist'),
    path.resolve(process.cwd(), 'resources/app/client_dist'),
    path.resolve(__dirname, 'dist'),
    path.resolve(__dirname, '../dist'),
    path.resolve(process.cwd(), 'packages/client/dist'),
    path.resolve(process.cwd(), '../client/dist'),
    path.resolve(process.cwd(), 'client/dist'),
    path.resolve(__dirname, '../../client/dist'),
    path.resolve(__dirname, '../../../client/dist'),
    path.resolve(__dirname, '../../../../packages/client/dist'),
  ];
  const staticPath = possibleDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || null;

  if (staticPath) {
    app.register(fastifyStatic, {
      root: staticPath,
      prefix: '/',
    });
    app.setNotFoundHandler((req, reply) => {
      if (req.raw.url && req.raw.url.startsWith('/api')) {
        reply.status(404).send({ error: 'Endpoint not found' });
      } else {
        reply.sendFile('index.html');
      }
    });
  }

  // Health check endpoint
  app.get('/health', async () => {
    return {
      status: 'ok',
      service: 'internalapi-backend',
      version: '1.0.0',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      memory: process.memoryUsage(),
    };
  });

  // Workspaces
  app.get('/api/workspaces', async () => {
    return db.getWorkspaces();
  });

  app.post('/api/workspaces', async (req) => {
    const body = req.body as { name: string; description?: string };
    if (!body?.name) {
      throw app.httpErrors.badRequest('Workspace name is required');
    }
    return db.createWorkspace(body.name, body.description);
  });

  app.delete('/api/workspaces/:id', async (req) => {
    const { id } = req.params as { id: string };
    const success = db.deleteWorkspace(id);
    return { success };
  });

  // Flows (Workflows / API Flow Tool)
  app.get('/api/flows', async (req) => {
    const query = req.query as { workspaceId?: string };
    const wsId = query.workspaceId || 'ws-default-company';
    return db.getFlows(wsId);
  });

  app.post('/api/flows', async (req) => {
    const body = req.body as any;
    if (!body?.name) {
      throw app.httpErrors.badRequest('Flow name is required');
    }
    return db.saveFlow(body);
  });

  app.delete('/api/flows/:id', async (req) => {
    const { id } = req.params as { id: string };
    const success = db.deleteFlow(id);
    return { success };
  });

  // Environments
  app.get('/api/environments', async (req) => {
    const query = req.query as { workspaceId?: string };
    const wsId = query.workspaceId || 'ws-default-company';
    return db.getEnvironments(wsId);
  });

  app.post('/api/environments', async (req) => {
    const body = req.body as any;
    if (!body?.name) {
      throw app.httpErrors.badRequest('Environment name is required');
    }
    return db.saveEnvironment(body);
  });

  app.delete('/api/environments/:id', async (req) => {
    const { id } = req.params as { id: string };
    const success = db.deleteEnvironment(id);
    return { success };
  });

  // Database Connection Test
  app.post('/api/db/test', async (req) => {
    const body = req.body as { dbConnection?: any } | any;
    const config = body?.dbConnection || body;
    return testDatabaseConnection(config);
  });

  // Collections
  app.get('/api/collections', async (req) => {
    const query = req.query as { workspaceId?: string; environmentId?: string };
    const wsId = query.workspaceId || 'ws-default-company';

    if (query.environmentId) {
      const env = db.getEnvironmentRaw(query.environmentId);
      if (isDbConfigured(env?.dbConnection)) {
        try {
          const remoteCols = await getRemoteCollections(env!.dbConnection!, wsId);
          return remoteCols;
        } catch (err) {
          app.log.warn({ err }, 'Failed to fetch collections from remote DB, falling back to local storage');
        }
      }
    }

    return db.getCollections(wsId);
  });

  app.post('/api/collections', async (req) => {
    const query = req.query as { environmentId?: string };
    const body = req.body as any;
    if (!body?.name) {
      throw app.httpErrors.badRequest('Collection name is required');
    }
    const saved = db.saveCollection(body);

    if (query.environmentId) {
      const env = db.getEnvironmentRaw(query.environmentId);
      if (isDbConfigured(env?.dbConnection)) {
        try {
          await saveRemoteCollection(env!.dbConnection!, saved);
        } catch (err) {
          app.log.warn({ err }, 'Failed to sync saved collection to remote DB');
        }
      }
    }

    return saved;
  });

  app.delete('/api/collections/:id', async (req) => {
    const { id } = req.params as { id: string };
    const query = req.query as { environmentId?: string };
    const success = db.deleteCollection(id);

    if (query.environmentId) {
      const env = db.getEnvironmentRaw(query.environmentId);
      if (isDbConfigured(env?.dbConnection)) {
        try {
          await deleteRemoteCollection(env!.dbConnection!, id);
        } catch (err) {
          app.log.warn({ err }, 'Failed to delete collection from remote DB');
        }
      }
    }

    return { success };
  });

  // History
  app.get('/api/history', async (req) => {
    const query = req.query as { workspaceId?: string; limit?: string };
    const wsId = query.workspaceId || 'ws-default-company';
    const limit = query.limit ? parseInt(query.limit, 10) : 50;
    return db.getHistory(wsId, limit);
  });

  app.delete('/api/history', async (req) => {
    const query = req.query as { workspaceId?: string };
    const wsId = query.workspaceId || 'ws-default-company';
    db.clearHistory(wsId);
    return { success: true };
  });

  // OAuth 2.0 Client Credentials Token Fetcher
  app.post('/api/proxy/oauth/token', async (req) => {
    const body = req.body as any;
    try {
      const token = await fetchOAuth2ClientCredentials(body);
      return token;
    } catch (err: any) {
      throw app.httpErrors.badRequest(err.message || 'Failed to fetch OAuth token');
    }
  });

  // Core Proxy Request Execution
  app.post('/api/proxy/send', async (req) => {
    const body = req.body as {
      request: ApiRequestData;
      environmentId?: string;
      workspaceId?: string;
    };

    if (!body?.request || !body.request.url || !body.request.url.trim()) {
      throw app.httpErrors.badRequest('Invalid request: URL is required and cannot be empty');
    }

    const wsId = body.workspaceId || 'ws-default-company';

    // 1. Resolve Variables: Environment overrides Collection
    const resolvedVars = db.getResolvedVariables(body.environmentId);

    // 2. Deeply interpolate all template strings in the request
    const effectiveRequest: ApiRequestData = interpolateDeep(body.request, resolvedVars);

    try {
      // 3. Execute via backend proxy
      const response = await executeProxyRequest(effectiveRequest);

      // 4. Log to history
      db.addHistory({
        workspaceId: wsId,
        method: effectiveRequest.method,
        url: effectiveRequest.url,
        status: response.status,
        size: response.size,
        time: response.time,
      });

      return response;
    } catch (err: any) {
      // Log failed attempt to history as well
      db.addHistory({
        workspaceId: wsId,
        method: effectiveRequest.method,
        url: effectiveRequest.url,
        status: 0,
        size: 0,
        time: 0,
      });

      return {
        status: 0,
        statusText: 'Client / Network Error',
        headers: {},
        cookies: [],
        body: '',
        size: 0,
        time: 0,
        error: err.message || 'Failed to execute request',
      };
    }
  });

  return app;
}
