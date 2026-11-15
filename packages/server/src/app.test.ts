import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import type { FastifyInstance } from 'fastify';

describe('Fastify Server Integration Tests', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health returns healthy status', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.payload);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('internalapi-backend');
  });

  it('GET /api/workspaces returns workspaces list', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/workspaces',
    });

    expect(res.statusCode).toBe(200);
    const workspaces = JSON.parse(res.payload);
    expect(Array.isArray(workspaces)).toBe(true);
    expect(workspaces.length).toBeGreaterThan(0);
  });

  it('creates, lists, and deletes a workspace', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/workspaces',
      payload: { name: 'Payments Squad', description: 'Payments and checkout flows' },
    });
    expect(createRes.statusCode).toBe(200);
    const created = JSON.parse(createRes.payload);
    expect(created.name).toBe('Payments Squad');
    expect(created.id).toBeDefined();

    // Verify it appears in the list
    const listRes = await app.inject({ method: 'GET', url: '/api/workspaces' });
    const list = JSON.parse(listRes.payload);
    expect(list.some((w: any) => w.id === created.id)).toBe(true);

    // Delete it
    const delRes = await app.inject({ method: 'DELETE', url: `/api/workspaces/${created.id}` });
    expect(delRes.statusCode).toBe(200);
    expect(JSON.parse(delRes.payload).success).toBe(true);
  });

  it('creates, fetches, and deletes flows with workspace isolation', async () => {
    const testWsId = 'ws-test-flow-isolation';
    // Create flow
    const flowRes = await app.inject({
      method: 'POST',
      url: '/api/flows',
      payload: {
        workspaceId: testWsId,
        name: 'Login & Fetch User Flow',
        description: 'Chained authentication flow',
        nodes: [
          {
            id: 'node-1',
            type: 'start',
            title: 'Start',
            config: { initialVars: [{ key: 'apiUrl', value: 'https://httpbin.org' }] },
          },
          {
            id: 'node-2',
            type: 'request',
            title: 'Auth Request',
            config: { method: 'POST', url: '{{apiUrl}}/post' },
          },
        ],
      },
    });
    expect(flowRes.statusCode).toBe(200);
    const savedFlow = JSON.parse(flowRes.payload);
    expect(savedFlow.id).toBeDefined();
    expect(savedFlow.nodes.length).toBe(2);

    // Query for that workspace
    const listRes = await app.inject({
      method: 'GET',
      url: `/api/flows?workspaceId=${testWsId}`,
    });
    expect(listRes.statusCode).toBe(200);
    const flows = JSON.parse(listRes.payload);
    expect(flows.length).toBe(1);
    expect(flows[0].name).toBe('Login & Fetch User Flow');

    // Query for another workspace -> should be isolated (0 flows)
    const emptyRes = await app.inject({
      method: 'GET',
      url: '/api/flows?workspaceId=ws-different-workspace',
    });
    expect(emptyRes.statusCode).toBe(200);
    expect(JSON.parse(emptyRes.payload).length).toBe(0);

    // Delete flow
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/flows/${savedFlow.id}`,
    });
    expect(delRes.statusCode).toBe(200);
    expect(JSON.parse(delRes.payload).success).toBe(true);
  });

  it('GET /api/collections returns collections and folders', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/collections?workspaceId=ws-default-company',
    });

    expect(res.statusCode).toBe(200);
    const collections = JSON.parse(res.payload);
    expect(Array.isArray(collections)).toBe(true);
    expect(collections.length).toBeGreaterThan(0);
  });

  it('POST /api/proxy/send executes a request and returns response', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/proxy/send',
      payload: {
        request: {
          name: 'Echo Test',
          method: 'GET',
          url: 'https://httpbin.org/get',
          queryParams: [{ id: '1', key: 'test', value: 'true', isEnabled: true }],
          headers: [],
          auth: { type: 'none' },
          bodyType: 'none',
        },
      },
    });

    expect(res.statusCode).toBe(200);
    const response = JSON.parse(res.payload);
    expect(response).toHaveProperty('status');
    expect(response).toHaveProperty('headers');
    expect(response).toHaveProperty('body');
  });

  describe('Authentication & Team Management (Login-Only)', () => {
    let adminToken: string;
    let createdUserId: string;

    it('rejects login with wrong credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@internalapi.local',
          password: 'wrongpassword',
        },
      });
      expect(res.statusCode).toBe(401);
    });

    it('logs in successfully with default admin credentials', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'admin@internalapi.local',
          password: 'admin123456',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data).toHaveProperty('token');
      expect(data.user.email).toBe('admin@internalapi.local');
      expect(data.user.role).toBe('admin');
      adminToken = data.token;
    });

    it('fetches current user profile via /api/auth/me', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const user = JSON.parse(res.payload);
      expect(user.email).toBe('admin@internalapi.local');
      expect(user.role).toBe('admin');
    });

    it('allows admin to create a new team member account', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
        payload: {
          email: 'developer@internalapi.local',
          name: 'Team Developer',
          password: 'developer123',
          role: 'editor',
        },
      });

      expect(res.statusCode).toBe(200);
      const user = JSON.parse(res.payload);
      expect(user.email).toBe('developer@internalapi.local');
      expect(user.role).toBe('editor');
      expect(user.passwordHash).toBeUndefined();
      createdUserId = user.id;
    });

    it('allows the newly created team member to log in', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'developer@internalapi.local',
          password: 'developer123',
        },
      });

      expect(res.statusCode).toBe(200);
      const data = JSON.parse(res.payload);
      expect(data.user.email).toBe('developer@internalapi.local');
      expect(data.user.role).toBe('editor');

      // Verify that editor cannot create other users (requiresAdmin)
      const forbiddenRes = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: {
          authorization: `Bearer ${data.token}`,
        },
        payload: {
          email: 'another@test.local',
          name: 'Another',
          password: 'pass',
        },
      });
      expect(forbiddenRes.statusCode).toBe(403);
    });

    it('lists team members for authenticated users', async () => {
      const res = await app.inject({
        method: 'GET',
        url: '/api/users',
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      const users = JSON.parse(res.payload);
      expect(Array.isArray(users)).toBe(true);
      expect(users.some((u: any) => u.email === 'developer@internalapi.local')).toBe(true);
    });

    it('allows admin to delete the team member account', async () => {
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/users/${createdUserId}`,
        headers: {
          authorization: `Bearer ${adminToken}`,
        },
      });

      expect(res.statusCode).toBe(200);
      expect(JSON.parse(res.payload).success).toBe(true);
    });
  });
});
