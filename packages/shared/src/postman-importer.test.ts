import { describe, it, expect } from 'vitest';
import { importPostmanCollection, isPostmanCollection } from './postman-importer.js';

describe('Postman Collection v2.1 Importer', () => {
  it('detects and converts postman collections with folders and requests', () => {
    const postmanJson = {
      info: {
        name: 'JoAcademy LMS API',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      },
      item: [
        {
          name: 'Auth',
          item: [
            {
              name: 'Login User',
              request: {
                method: 'POST',
                url: {
                  raw: 'https://api.joacademy.com/v1/login',
                },
                header: [
                  { key: 'Accept', value: 'application/json' },
                ],
                body: {
                  mode: 'raw',
                  raw: '{"email":"test@joacademy.com","password":"secret"}',
                },
              },
            },
          ],
        },
        {
          name: 'Get Exam 5762',
          request: {
            method: 'GET',
            url: {
              raw: 'https://staging-lms-content-bank.joacademy.com/api/v1/exam?exam_id=5762',
              query: [{ key: 'exam_id', value: '5762' }],
            },
            header: [{ key: 'api', value: '1' }],
          },
        },
      ],
    };

    expect(isPostmanCollection(postmanJson)).toBe(true);

    const imported = importPostmanCollection(postmanJson, 'ws-default-company');

    expect(imported.name).toBe('JoAcademy LMS API');
    expect(imported.folders.length).toBe(1);
    expect(imported.folders[0].name).toBe('Auth');
    expect(imported.folders[0].requests[0].name).toBe('Login User');
    expect(imported.folders[0].requests[0].method).toBe('POST');
    expect(imported.folders[0].requests[0].bodyType).toBe('json');

    expect(imported.requests.length).toBe(1);
    expect(imported.requests[0].name).toBe('Get Exam 5762');
    expect(imported.requests[0].queryParams.some((q) => q.key === 'exam_id' && q.value === '5762')).toBe(true);
  });
});
