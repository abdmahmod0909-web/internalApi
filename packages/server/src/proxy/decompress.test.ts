import { describe, it, expect } from 'vitest';
import zlib from 'node:zlib';
import { decompressAndDecodeResponseBody } from './http-client.js';

describe('Proxy Response Decompression and Encoding', () => {
  it('correctly decompresses GZIP responses', () => {
    const rawText = JSON.stringify({ message: 'Welcome to Arabic API', data: 'مرحبا بكم في واجهة برمجة التطبيقات' });
    const gzippedBuffer = zlib.gzipSync(Buffer.from(rawText, 'utf8'));

    const result = decompressAndDecodeResponseBody(gzippedBuffer, {
      'content-encoding': 'gzip',
      'content-type': 'application/json; charset=utf-8',
    });

    expect(result.wasCompressed).toBe(true);
    expect(result.body).toBe(rawText);
    expect(result.body).toContain('مرحبا بكم في واجهة برمجة التطبيقات');
  });

  it('decompresses GZIP even if content-encoding header was missing (via magic bytes)', () => {
    const rawText = 'Long text with Arabic: مرحبًا بك في نظام الـ API الخاص بنا لنظام إدارة الطلبات';
    const gzippedBuffer = zlib.gzipSync(Buffer.from(rawText, 'utf8'));

    // No content-encoding header passed
    const result = decompressAndDecodeResponseBody(gzippedBuffer, {
      'content-type': 'text/plain; charset=utf-8',
    });

    expect(result.wasCompressed).toBe(true);
    expect(result.body).toBe(rawText);
  });

  it('correctly decompresses Deflate responses', () => {
    const rawText = 'Deflate compressed response with Arabic: تفاصيل الطلب رقم 12345';
    const deflatedBuffer = zlib.deflateSync(Buffer.from(rawText, 'utf8'));

    const result = decompressAndDecodeResponseBody(deflatedBuffer, {
      'content-encoding': 'deflate',
    });

    expect(result.wasCompressed).toBe(true);
    expect(result.body).toBe(rawText);
  });

  it('correctly decompresses Brotli responses', () => {
    const rawText = 'Brotli compressed text with special Arabic chars: تسجيل طالب جديد بنجاح';
    const brotliBuffer = zlib.brotliCompressSync(Buffer.from(rawText, 'utf8'));

    const result = decompressAndDecodeResponseBody(brotliBuffer, {
      'content-encoding': 'br',
      'content-type': 'text/plain; charset=utf-8',
    });

    expect(result.wasCompressed).toBe(true);
    expect(result.body).toBe(rawText);
  });

  it('passes uncompressed plain text and Arabic UTF-8 through cleanly without modification', () => {
    const rawText = '{"status":"ok","msg":"تم استلام الطلب"}';
    const buffer = Buffer.from(rawText, 'utf8');

    const result = decompressAndDecodeResponseBody(buffer, {
      'content-type': 'application/json; charset=utf-8',
    });

    expect(result.wasCompressed).toBe(false);
    expect(result.body).toBe(rawText);
  });
});
