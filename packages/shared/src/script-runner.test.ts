import { describe, it, expect } from 'vitest';
import { executeScript } from './script-runner.js';

describe('Postman-compatible pm script runner', () => {
  it('executes assertions and pm.test', () => {
    const script = `
      pm.test("Status code is 200", function () {
        pm.response.to.have.status(200);
      });

      pm.test("JSON payload has exam_id", function () {
        const data = pm.response.json();
        pm.expect(data.data.exam_id).to.equal(5762);
      });

      pm.environment.set("auth_token", "new_extracted_token");
    `;

    const result = executeScript(script, {
      environment: { base_url: 'https://api.com' },
      variables: {},
      request: { url: 'https://api.com/exam', method: 'GET', headers: {} },
      response: {
        status: 200,
        statusText: 'OK',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ data: { exam_id: 5762 } }),
        time: 85,
      },
    });

    expect(result.tests.length).toBe(2);
    expect(result.tests[0].passed).toBe(true);
    expect(result.tests[1].passed).toBe(true);
    expect(result.environmentMutations['auth_token']).toBe('new_extracted_token');
  });

  it('captures assertion failures accurately', () => {
    const script = `
      pm.test("Status is 201 Created", function () {
        pm.response.to.have.status(201);
      });
    `;

    const result = executeScript(script, {
      environment: {},
      variables: {},
      request: { url: 'https://api.com', method: 'GET', headers: {} },
      response: { status: 200, statusText: 'OK', headers: {}, body: '{}', time: 50 },
    });

    expect(result.tests.length).toBe(1);
    expect(result.tests[0].passed).toBe(false);
    expect(result.tests[0].error).toContain('expected status 200 to equal 201');
  });
});

