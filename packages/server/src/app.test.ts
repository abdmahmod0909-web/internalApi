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

