import { describe, it, expect } from 'vitest';
import { exportPostmanCollection } from './postman-exporter.js';
import type { Collection } from './types/index.js';

describe('Postman Collection Exporter (v2.1.0)', () => {
  it('correctly exports a collection with requests, folders, headers, and body', () => {
    const mockCol: Collection = {
      id: 'col-test-1',
      workspaceId: 'ws-1',
      name: 'Test Payments API',
      description: 'API collection for payment testing',
      sortOrder: 0,
      folders: [
        {
          id: 'fld-1',
          collectionId: 'col-test-1',
          name: 'Invoices',
          sortOrder: 0,
          requests: [
            {
              id: 'req-invoice-create',
              collectionId: 'col-test-1',
              folderId: 'fld-1',
              name: 'Create Invoice',
              method: 'POST',
              url: 'https://api.example.com/invoices',
              queryParams: [
                { id: 'q1', key: 'notify', value: 'true', isEnabled: true },
              ],
              headers: [
                { id: 'h1', key: 'Content-Type', value: 'application/json', isEnabled: true },
              ],
              auth: {
                type: 'bearer',
                bearer: { token: '{{authToken}}' },
              },
              bodyType: 'json',
              bodyContent: JSON.stringify({ amount: 100, currency: 'USD' }),
            },
          ],
        },
      ],
      requests: [
        {
          id: 'req-ping',
          collectionId: 'col-test-1',
          folderId: null,
          name: 'Health Ping',
          method: 'GET',
          url: 'https://api.example.com/ping',
          queryParams: [],
          headers: [],
          auth: { type: 'none' },
          bodyType: 'none',
        },
      ],
    };

    const exported = exportPostmanCollection(mockCol);

    expect(exported.info.name).toBe('Test Payments API');
    expect(exported.info.schema).toBe('https://schema.getpostman.com/json/collection/v2.1.0/collection.json');
    expect(exported.item.length).toBe(2); // 1 root request + 1 folder

    // Verify root request
    const rootReq = exported.item.find((i: any) => i.name === 'Health Ping');
    expect(rootReq).toBeDefined();
    expect(rootReq.request.method).toBe('GET');
    expect(rootReq.request.url.raw).toBe('https://api.example.com/ping');

    // Verify folder
    const folder = exported.item.find((i: any) => i.name === 'Invoices');
    expect(folder).toBeDefined();
    expect(folder.item.length).toBe(1);

    const folderReq = folder.item[0];
    expect(folderReq.name).toBe('Create Invoice');
    expect(folderReq.request.method).toBe('POST');
    expect(folderReq.request.body.mode).toBe('raw');
    expect(folderReq.request.body.options.raw.language).toBe('json');
    expect(folderReq.request.auth.type).toBe('bearer');
  });
});
