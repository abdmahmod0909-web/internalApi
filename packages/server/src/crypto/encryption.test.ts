import { describe, it, expect } from 'vitest';
import { encryptSecret, decryptSecret } from './encryption.js';

describe('AES-256-GCM Encryption', () => {
  it('encrypts and decrypts a secret value correctly', () => {
    const raw = 'my-super-secret-api-token-12345';
    const encrypted = encryptSecret(raw);

    expect(encrypted).not.toBe(raw);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = decryptSecret(encrypted);
    expect(decrypted).toBe(raw);
  });

  it('handles empty and plaintext gracefully', () => {
    expect(encryptSecret('')).toBe('');
    expect(decryptSecret('')).toBe('');
    expect(decryptSecret('non-encrypted-string')).toBe('non-encrypted-string');
  });
});

