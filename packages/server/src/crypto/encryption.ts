import crypto from 'node:crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const TAG_LENGTH = 16;

/**
 * Returns a 32-byte Buffer derived from the environment key or a fallback development key.
 */
function getMasterKey(): Buffer {
  const secret = process.env.INTERNALAPI_SECRET_KEY || 'default-dev-secret-key-32chars-long!';
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts a plaintext string into a hex payload (iv:tag:ciphertext).
 */
export function encryptSecret(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, getMasterKey(), iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts a hex payload (iv:tag:ciphertext) back into plaintext.
 */
export function decryptSecret(cipherText: string): string {
  if (!cipherText || !cipherText.includes(':')) {
    return cipherText;
  }

  try {
    const parts = cipherText.split(':');
    if (parts.length !== 3) return cipherText;

    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(ALGORITHM, getMasterKey(), iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    // Return original if decryption fails (e.g. key mismatch or not encrypted)
    return cipherText;
  }
}

