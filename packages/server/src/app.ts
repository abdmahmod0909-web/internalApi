import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import fastifyStatic from '@fastify/static';
import fastifyJwt from '@fastify/jwt';
import path from 'node:path';
import fs from 'node:fs';
import { interpolateDeep } from '@internalapi/shared';
import type { ApiRequestData } from '@internalapi/shared';
import { db, verifyPassword } from './storage/db.js';
import {
  testDatabaseConnection,
  getRemoteCollections,
  saveRemoteCollection,
  deleteRemoteCollection,
  isDbConfigured,
} from './storage/db-sync.js';
import { executeProxyRequest } from './proxy/http-client.js';
import { fetchOAuth2ClientCredentials } from './proxy/oauth2.js';
import {
  getOtaDistPath,
  getOtaStatus,
  getCurrentVersion,
  compareVersions,
  checkForUpdates,
  applyOtaUpdate,
  revertOtaUpdate,
} from './ota/ota-service.js';

export function buildApp(opts?: { logger?: boolean }): FastifyInstance {
  const isDesktop = process.env.DESKTOP_STANDALONE === 'true' || typeof (process as any).versions?.electron !== 'undefined';
  const enableLogger = opts?.logger !== undefined
    ? opts.logger
    : (process.env.NODE_ENV === 'test' || isDesktop ? false : true);

  const app = Fastify({
    logger: enableLogger,
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

  // Seed default initial admin account if users table is empty
  db.seedDefaultAdmin();

  // JWT Authentication Setup
  const jwtSecret = process.env.JWT_SECRET || 'internalapi-jwt-secret-key-change-this-in-production-random-64-chars';
  app.register(fastifyJwt, {
    secret: jwtSecret,
    sign: {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    },
  });

  app.decorate('authenticate', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized: Invalid or missing token' });
    }
  });

  app.decorate('requireAdmin', async (request: any, reply: any) => {
    try {
      await request.jwtVerify();
      const user = request.user;
      if (user?.role !== 'admin') {
        reply.status(403).send({ error: 'Forbidden: Admin access required' });
      }
    } catch (err) {
      reply.status(401).send({ error: 'Unauthorized: Invalid or missing token' });
    }
  });

  // Serve static client build if present (Smart OTA & Bundled version resolution)
  const otaPath = getOtaDistPath();
  const bundledDistPaths = [
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

  const bundledStaticPath = bundledDistPaths.find((p) => fs.existsSync(path.join(p, 'index.html'))) || null;
  const isOtaPresent = fs.existsSync(path.join(otaPath, 'index.html'));

  let staticPath: string | null = null;

  if (isOtaPresent && bundledStaticPath) {
    const otaVer = getCurrentVersion(otaPath);
    const bundledVer = getCurrentVersion(bundledStaticPath);
    // If bundled app version >= OTA version, prioritize bundled and purge stale OTA cache
    if (compareVersions(bundledVer, otaVer) >= 0) {
      staticPath = bundledStaticPath;
      try {
        fs.rmSync(otaPath, { recursive: true, force: true });
      } catch (_) {}
    } else {
      staticPath = otaPath;
    }
  } else if (isOtaPresent) {
    staticPath = otaPath;
  } else {
    staticPath = bundledStaticPath;
  }

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

  // =========================================================================
  // Auth & Team Management (Login-Only, No Public Registration)
  // =========================================================================

  // Login only (public)
  app.post('/api/auth/login', async (req) => {
    const body = req.body as { email?: string; password?: string };
    if (!body?.email || !body?.password) {
      throw app.httpErrors.badRequest('Email and password are required');
    }

    const user = db.getUserByEmail(body.email);
    if (!user) {
      throw app.httpErrors.unauthorized('Invalid email or password');
    }

    const isValid = verifyPassword(body.password, user.passwordHash, user.salt);
    if (!isValid) {
      throw app.httpErrors.unauthorized('Invalid email or password');
    }

    if (!user.isActive) {
      throw app.httpErrors.forbidden('Account is deactivated. Please contact your administrator.');
    }

    const token = app.jwt.sign({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
      },
    };
  });

  // Get current logged-in profile
  app.get('/api/auth/me', { onRequest: [(app as any).authenticate] }, async (req) => {
    const decoded = (req as any).user;
    const user = db.getUserById(decoded.id);
    if (!user) {
      throw app.httpErrors.notFound('User not found');
    }
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  });

  // Team Management: List Users (Authenticated)
  app.get('/api/users', { onRequest: [(app as any).authenticate] }, async () => {
    return db.getUsers();
  });

  // Team Management: Create User (Admin only)
  app.post('/api/users', { onRequest: [(app as any).requireAdmin] }, async (req) => {
    const body = req.body as { email?: string; name?: string; password?: string; role?: 'admin' | 'editor' | 'viewer' };
    if (!body?.email || !body?.name || !body?.password) {
      throw app.httpErrors.badRequest('Email, name, and password are required');
    }
    if (body.password.length < 6) {
      throw app.httpErrors.badRequest('Password must be at least 6 characters long');
    }

    try {
      const created = db.createUser({
        email: body.email,
        name: body.name,
        password: body.password,
        role: body.role || 'editor',
      });
      return created;
    } catch (err: any) {
      throw app.httpErrors.badRequest(err.message || 'Failed to create user');
    }
  });

  // Team Management: Delete User (Admin only)
  app.delete('/api/users/:id', { onRequest: [(app as any).requireAdmin] }, async (req) => {
    const { id } = req.params as { id: string };
    const requester = (req as any).user;
    if (requester?.id === id) {
      throw app.httpErrors.badRequest('You cannot delete your own account');
    }

    const success = db.deleteUser(id);
    if (!success) {
      throw app.httpErrors.notFound('User not found');
    }
    return { success: true };
  });

  // Workspaces (Protected: login required)
  app.get('/api/workspaces', { onRequest: [(app as any).authenticate] }, async () => {
    return db.getWorkspaces();
  });

  app.post('/api/workspaces', { onRequest: [(app as any).authenticate] }, async (req) => {
    const body = req.body as { name: string; description?: string };
    if (!body?.name) {
      throw app.httpErrors.badRequest('Workspace name is required');
    }
    return db.createWorkspace(body.name, body.description);
  });

  app.delete('/api/workspaces/:id', { onRequest: [(app as any).authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const success = db.deleteWorkspace(id);
    return { success };
  });

  // Flows (Protected: login required)
  app.get('/api/flows', { onRequest: [(app as any).authenticate] }, async (req) => {
    const query = req.query as { workspaceId?: string };
    const wsId = query.workspaceId || 'ws-default-company';
    return db.getFlows(wsId);
  });

  app.post('/api/flows', { onRequest: [(app as any).authenticate] }, async (req) => {
    const body = req.body as any;
    if (!body?.name) {
      throw app.httpErrors.badRequest('Flow name is required');
    }
    return db.saveFlow(body);
  });

  app.delete('/api/flows/:id', { onRequest: [(app as any).authenticate] }, async (req) => {
    const { id } = req.params as { id: string };
    const success = db.deleteFlow(id);
    return { success };
  });

  // Environments (Protected: login required)
  app.get('/api/environments', { onRequest: [(app as any).authenticate] }, async (req) => {
    const query = req.query as { workspaceId?: string };
    const wsId = query.workspaceId || 'ws-default-company';
    return db.getEnvironments(wsId);
  });

  app.post('/api/environments', { onRequest: [(app as any).authenticate] }, async (req) => {
    const body = req.body as any;
    if (!body?.name) {
      throw app.httpErrors.badRequest('Environment name is required');
    }
    return db.saveEnvironment(body);
  });

  app.delete('/api/environments/:id', { onRequest: [(app as any).authenticate] }, async (req) => {
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

  // Collections (Protected: login required)
  app.get('/api/collections', { onRequest: [(app as any).authenticate] }, async (req) => {
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

  app.post('/api/collections', { onRequest: [(app as any).authenticate] }, async (req) => {
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

  app.delete('/api/collections/:id', { onRequest: [(app as any).authenticate] }, async (req) => {
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

  // History (Protected: login required)
  app.get('/api/history', { onRequest: [(app as any).authenticate] }, async (req) => {
    const query = req.query as { workspaceId?: string; limit?: string };
    const wsId = query.workspaceId || 'ws-default-company';
    const limit = query.limit ? parseInt(query.limit, 10) : 30;
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

  // =========================================================================
  // Over-The-Air (OTA) UI Hot Push Endpoints
  // =========================================================================

  // Get current OTA and app version status
  app.get('/api/ota/status', async () => {
    return getOtaStatus(staticPath);
  });

  // Check GitHub Releases for newer UI bundle
  app.get('/api/ota/check', async (req) => {
    const query = req.query as { repo?: string };
    return checkForUpdates(staticPath, query?.repo);
  });

  // Apply downloaded UI bundle
  app.post('/api/ota/apply', async (req) => {
    const body = req.body as { assetUrl: string; latestVersion: string };
    if (!body?.assetUrl || !body?.latestVersion) {
      throw app.httpErrors.badRequest('assetUrl and latestVersion are required');
    }
    return applyOtaUpdate(body.assetUrl, body.latestVersion);
  });

  // Revert back to the bundled version that came with desktop installer
  app.post('/api/ota/revert', async () => {
    return revertOtaUpdate();
  });

  return app;
}

const defaultApp: FastifyInstance = buildApp();

// Named export kept so tests / dev.ts can still `import { app }` with types.
export const app = defaultApp;

let hasInitialSynced = false;

// Vercel Serverless Function entry point
const handler = async function (req: any, res: any) {
  await defaultApp.ready();
  if (!hasInitialSynced) {
    hasInitialSynced = true;
    await db.syncFromTurso();
  } else {
    // Non-blocking background sync so requests are never delayed
    db.syncFromTurso().catch(() => {});
  }

  // Ensure req.url matches Fastify registered routes whether the /api prefix was preserved or stripped
  if (req.url && !req.url.startsWith('/api') && !req.url.startsWith('/health')) {
    req.url = `/api${req.url.startsWith('/') ? req.url : `/${req.url}`}`;
  }

  return new Promise((resolve, reject) => {
    res.on('finish', () => resolve(true));
    res.on('close', () => resolve(true));
    res.on('error', (err: any) => reject(err));
    defaultApp.server.emit('request', req, res);
  });
};

// IMPORTANT: no `export default` here. When compiled to CommonJS, that produces an
// exports object ({ buildApp, app, default }) which Vercel rejects with
// "The default export must be a function or server".
// Instead the handler function itself becomes the module export.
// (Vercel's `module.exports` interop also exposes it as the default export.)
module.exports = handler;
module.exports.default = handler;
module.exports.buildApp = buildApp;
module.exports.app = defaultApp;