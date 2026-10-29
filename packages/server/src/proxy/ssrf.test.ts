import { describe, it, expect } from 'vitest';
import { validateSsrfTarget } from './ssrf.js';

describe('SSRF Protection', () => {
  it('blocks cloud metadata endpoint 169.254.169.254', async () => {
    await expect(validateSsrfTarget('http://169.254.169.254/latest/meta-data/')).rejects.toThrow(
      /forbidden/i
    );
  });

  it('rejects dangerous protocols like file:// or gopher://', async () => {
    await expect(validateSsrfTarget('file:///etc/passwd')).rejects.toThrow(/not supported/i);
    await expect(validateSsrfTarget('gopher://127.0.0.1:70/')).rejects.toThrow(/not supported/i);
  });

  it('blocks private IPs when allowInternalIps is false', async () => {
    await expect(
      validateSsrfTarget('http://127.0.0.1:8080/internal', { allowInternalIps: false })
    ).rejects.toThrow(/restricted/i);
  });
});

