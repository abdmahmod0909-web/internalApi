import { describe, it, expect } from 'vitest';
import { interpolateVariables, mergeVariableScopes, extractVariableNames } from './variable-engine.js';

describe('variable-engine', () => {
  it('interpolates simple variables', () => {
    const template = 'https://{{host}}/api/v1/{{resource}}';
    const vars = { host: 'api.example.com', resource: 'users' };
    expect(interpolateVariables(template, vars)).toBe('https://api.example.com/api/v1/users');
  });

  it('handles recursive variables up to max depth', () => {
    const template = '{{base_url}}/items';
    const vars = {
      base_url: 'https://{{domain}}:{{port}}',
      domain: 'internal.company.com',
      port: '8080',
    };
    expect(interpolateVariables(template, vars)).toBe('https://internal.company.com:8080/items');
  });

  it('keeps unmatched variables intact', () => {
    const template = 'https://{{known}}/{{unknown}}';
    const vars = { known: 'example.com' };
    expect(interpolateVariables(template, vars)).toBe('https://example.com/{{unknown}}');
  });

  it('merges scopes correctly with environment precedence', () => {
    const merged = mergeVariableScopes({
      global: { env: 'all', token: 'global-token' },
      collection: { token: 'collection-token', timeout: '5000' },
      environment: { token: 'staging-token' },
    });

    expect(merged).toEqual({
      env: 'all',
      collection: undefined,
      token: 'staging-token',
      timeout: '5000',
    });
  });

  it('extracts variable names', () => {
    const template = '{{base_url}}/users/{{userId}}?key={{apiKey}}';
    expect(extractVariableNames(template)).toEqual(['base_url', 'userId', 'apiKey']);
  });
});

