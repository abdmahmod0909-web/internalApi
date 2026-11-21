import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { buildApp } from './app.js';
import type { FastifyInstance } from 'fastify';

describe('Fastify Server Integration Tests', () => {
  let app: FastifyInstance;
  let adminToken: string;

  beforeAll(async () => {
    app = buildApp();
    await app.ready();

    // Authenticate as default admin
    const loginRes = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: process.env.ADMIN_EMAIL || 'admin@internalapi.local',
        password: process.env.ADMIN_PASSWORD || 'admin123456',
      },
    });

    const data = JSON.parse(loginRes.payload);
    adminToken = data.token;
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

  it('GET /api/workspaces returns workspaces list for admin', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/workspaces',
      headers: { authorization: `Bearer ${adminToken}` },
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
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { name: 'Payments Squad', description: 'Payments and checkout flows' },
    });
    expect(createRes.statusCode).toBe(200);
    const created = JSON.parse(createRes.payload);
    expect(created.name).toBe('Payments Squad');
    expect(created.id).toBeDefined();

    // Verify it appears in the list
    const listRes = await app.inject({
      method: 'GET',
      url: '/api/workspaces',
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const list = JSON.parse(listRes.payload);
    expect(list.some((w: any) => w.id === created.id)).toBe(true);

    // Delete it
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/workspaces/${created.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.statusCode).toBe(200);
    expect(JSON.parse(delRes.payload).success).toBe(true);
  });

  it('creates, fetches, and deletes flows with workspace isolation', async () => {
    const testWsId = 'ws-test-flow-isolation';
    // Create flow
    const flowRes = await app.inject({
      method: 'POST',
      url: '/api/flows',
      headers: { authorization: `Bearer ${adminToken}` },
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
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(listRes.statusCode).toBe(200);
    const flows = JSON.parse(listRes.payload);
    expect(Array.isArray(flows)).toBe(true);
    expect(flows.some((f: any) => f.id === savedFlow.id)).toBe(true);

    // Delete flow
    const delRes = await app.inject({
      method: 'DELETE',
      url: `/api/flows/${savedFlow.id}`,
      headers: { authorization: `Bearer ${adminToken}` },
    });
    expect(delRes.statusCode).toBe(200);
    expect(JSON.parse(delRes.payload).success).toBe(true);
  });

  it('GET /api/collections returns collections and folders', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/api/collections',
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(res.statusCode).toBe(200);
    const collections = JSON.parse(res.payload);
    expect(Array.isArray(collections)).toBe(true);
  });

  describe('User Workspace Access & Role Management', () => {
    let userOneToken: string;
    let userOneId: string;
    let workspaceOneId: string;
    let workspaceTwoId: string;

    it('admin creates workspace one and workspace two', async () => {
      const ws1 = await app.inject({
        method: 'POST',
        url: '/api/workspaces',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: 'Workspace One', description: 'Restricted workspace 1' },
      });
      expect(ws1.statusCode).toBe(200);
      workspaceOneId = JSON.parse(ws1.payload).id;

      const ws2 = await app.inject({
        method: 'POST',
        url: '/api/workspaces',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { name: 'Workspace Two', description: 'Restricted workspace 2' },
      });
      expect(ws2.statusCode).toBe(200);
      workspaceTwoId = JSON.parse(ws2.payload).id;
    });

    it('admin creates user account one and links ONLY workspace one', async () => {
      const res = await app.inject({
        method: 'POST',
        url: '/api/users',
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          email: 'account.one@company.internal',
          name: 'Account One',
          password: 'password123',
          role: 'editor',
          workspaceIds: [workspaceOneId],
        },
      });

      expect(res.statusCode).toBe(200);
      const user = JSON.parse(res.payload);
      expect(user.email).toBe('account.one@company.internal');
      expect(user.role).toBe('editor');
      expect(user.workspaceIds).toEqual([workspaceOneId]);
      userOneId = user.id;
    });

    it('user one can log in and see ONLY workspace one', async () => {
      const loginRes = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'account.one@company.internal',
          password: 'password123',
        },
      });

      expect(loginRes.statusCode).toBe(200);
      const data = JSON.parse(loginRes.payload);
      userOneToken = data.token;
      expect(data.user.workspaceIds).toEqual([workspaceOneId]);

      // Call GET /api/workspaces as user one
      const wsRes = await app.inject({
        method: 'GET',
        url: '/api/workspaces',
        headers: { authorization: `Bearer ${userOneToken}` },
      });

      expect(wsRes.statusCode).toBe(200);
      const userWorkspaces = JSON.parse(wsRes.payload);
      expect(Array.isArray(userWorkspaces)).toBe(true);
      expect(userWorkspaces.length).toBe(1);
      expect(userWorkspaces[0].id).toBe(workspaceOneId);
      expect(userWorkspaces[0].name).toBe('Workspace One');
    });

    it('user one is forbidden from accessing collections/flows in workspace two', async () => {
      const colRes = await app.inject({
        method: 'GET',
        url: `/api/collections?workspaceId=${workspaceTwoId}`,
        headers: { authorization: `Bearer ${userOneToken}` },
      });
      expect(colRes.statusCode).toBe(403);

      const flowRes = await app.inject({
        method: 'GET',
        url: `/api/flows?workspaceId=${workspaceTwoId}`,
        headers: { authorization: `Bearer ${userOneToken}` },
      });
      expect(flowRes.statusCode).toBe(403);
    });

    it('admin can edit user one role and link workspace two', async () => {
      const updateRes = await app.inject({
        method: 'PATCH',
        url: `/api/users/${userOneId}`,
        headers: { authorization: `Bearer ${adminToken}` },
        payload: {
          name: 'Account One Renamed',
          role: 'viewer',
          workspaceIds: [workspaceOneId, workspaceTwoId],
        },
      });

      expect(updateRes.statusCode).toBe(200);
      const updatedUser = JSON.parse(updateRes.payload);
      expect(updatedUser.name).toBe('Account One Renamed');
      expect(updatedUser.role).toBe('viewer');
      expect(updatedUser.workspaceIds).toEqual([workspaceOneId, workspaceTwoId]);

      // Verify user one can now see both workspaces
      const wsRes = await app.inject({
        method: 'GET',
        url: '/api/workspaces',
        headers: { authorization: `Bearer ${userOneToken}` },
      });

      expect(wsRes.statusCode).toBe(200);
      const userWorkspaces = JSON.parse(wsRes.payload);
      expect(userWorkspaces.length).toBe(2);
      expect(userWorkspaces.map((w: any) => w.id)).toContain(workspaceOneId);
      expect(userWorkspaces.map((w: any) => w.id)).toContain(workspaceTwoId);
    });

    it('admin can clean up test user and workspaces', async () => {
      const delUser = await app.inject({
        method: 'DELETE',
        url: `/api/users/${userOneId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(delUser.statusCode).toBe(200);

      await app.inject({
        method: 'DELETE',
        url: `/api/workspaces/${workspaceOneId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });

      await app.inject({
        method: 'DELETE',
        url: `/api/workspaces/${workspaceTwoId}`,
        headers: { authorization: `Bearer ${adminToken}` },
      });
    });
  });
});
