import { describe, it, expect } from 'vitest';
import { generateCurlCommand } from './curl-generator.js';

describe('cURL Generator', () => {
  it('generates accurate cURL for POST with headers and JSON body', () => {
    const curl = generateCurlCommand({
      name: 'Test Req',
      method: 'POST',
      url: 'https://api.example.com/v1/users',
      queryParams: [{ id: '1', key: 'active', value: 'true', isEnabled: true }],
      headers: [{ id: '1', key: 'Content-Type', value: 'application/json', isEnabled: true }],
      auth: { type: 'bearer', bearer: { token: 'my-jwt-token' } },
      bodyType: 'json',
      bodyContent: '{"name":"Alice"}',
    });

    expect(curl).toContain("curl --location \\\n  --request POST");
    expect(curl).toContain("'https://api.example.com/v1/users?active=true'");
    expect(curl).toContain("--header 'Content-Type: application/json'");
    expect(curl).toContain("--header 'Authorization: Bearer my-jwt-token'");
    expect(curl).toContain("--data-raw '{\"name\":\"Alice\"}'");
  });
});
