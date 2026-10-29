import { describe, it, expect } from 'vitest';
import { isDbConfigured, testDatabaseConnection } from './db-sync.js';

describe('db-sync configuration and validation', () => {
  it('correctly detects unconfigured / empty database configurations', () => {
    expect(isDbConfigured(null)).toBe(false);
    expect(isDbConfigured(undefined)).toBe(false);
    expect(
      isDbConfigured({
        type: 'postgres',
        host: '',
        database: '',
        username: '',
      })
    ).toBe(false);
    expect(
      isDbConfigured({
        type: 'postgres',
        host: 'localhost',
        database: '',
        username: 'postgres',
      })
    ).toBe(false);
  });

  it('correctly detects configured database credentials', () => {
    expect(
      isDbConfigured({
        type: 'postgres',
        host: '127.0.0.1',
        database: 'my_db',
        username: 'postgres',
        password: 'password',
      })
    ).toBe(true);
  });

  it('returns graceful error message when connection parameters are invalid or unreachable', async () => {
    const result = await testDatabaseConnection({
      type: 'postgres',
      host: '127.0.0.1',
      port: 59999, // Unused port
      database: 'nonexistent',
      username: 'user',
      password: 'wrong',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('failed');
  });

  it('rejects completely empty connection attempt gracefully', async () => {
    const result = await testDatabaseConnection({
      type: 'postgres',
      host: '',
      database: '',
      username: '',
    });
    expect(result.success).toBe(false);
    expect(result.message).toContain('required');
  });
});
