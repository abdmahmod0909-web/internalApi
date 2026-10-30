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
});
