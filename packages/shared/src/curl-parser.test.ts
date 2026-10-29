import { describe, it, expect } from 'vitest';
import { parseCurlCommand, isCurlCommand } from './curl-parser.js';

describe('cURL Parser', () => {
  it('detects curl commands', () => {
    expect(isCurlCommand("curl 'https://api.com'")).toBe(true);
    expect(isCurlCommand('curl --url https://api.com')).toBe(true);
    expect(isCurlCommand('https://api.com')).toBe(false);
  });

  it('parses the user provided curl command with headers and query params', () => {
    const curl = `curl --url 'https://staging-lms-content-bank.joacademy.com/api/v1/exam?exam_id=5762' \\
  -H 'accept: application/json, text/plain, */*' \\
  -H 'accept-language: en-US,en;q=0.9' \\
  -H 'api: 1' \\
  -H 'authorization: Bearer 7666495|53b5ySjHmsqMd2FmzX00U1RwgsPSvVryGGKgCXAL546dad85' \\
  -H 'cache-control: no-cache' \\
  -H 'lang: ar' \\
  -H 'origin: https://new-pre-prod.d18axrryrol4bb.amplifyapp.com' \\
  -H 'pragma: no-cache' \\
  -H 'priority: u=1, i' \\
  -H 'program: 1' \\
  -H 'referer: https://new-pre-prod.d18axrryrol4bb.amplifyapp.com/' \\
  -H 'sec-ch-ua: "Not:A-Brand";v="8", "Chromium";v="156", "Google Chrome";v="156"' \\
  -H 'sec-ch-ua-mobile: ?0' \\
  -H 'sec-ch-ua-platform: "Windows"' \\
  -H 'sec-fetch-dest: empty' \\
  -H 'sec-fetch-mode: cors' \\
  -H 'sec-fetch-site: cross-site' \\
  -H 'shouldnotredirect401: true' \\
  -H 'shouldnotredirect404: true' \\
  -H 'user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/156.0.0.0 Safari/537.36'`;

    const parsed = parseCurlCommand(curl);

    expect(parsed.method).toBe('GET');
    expect(parsed.url).toBe('https://staging-lms-content-bank.joacademy.com/api/v1/exam?exam_id=5762');

    // Query param
    expect(parsed.queryParams?.some((q) => q.key === 'exam_id' && q.value === '5762')).toBe(true);

    // Headers
    expect(parsed.headers?.some((h) => h.key === 'api' && h.value === '1')).toBe(true);
    expect(parsed.headers?.some((h) => h.key === 'lang' && h.value === 'ar')).toBe(true);
    expect(parsed.headers?.some((h) => h.key === 'origin')).toBe(true);

    // Auth Bearer detection
    expect(parsed.auth?.type).toBe('bearer');
    expect(parsed.auth?.bearer?.token).toBe('7666495|53b5ySjHmsqMd2FmzX00U1RwgsPSvVryGGKgCXAL546dad85');
  });

  it('parses POST with JSON body and explicit method', () => {
    const curl = `curl -X POST https://api.example.com/login \\
  -H "Content-Type: application/json" \\
  --data '{"username":"admin","password":"secret"}'`;

    const parsed = parseCurlCommand(curl);

    expect(parsed.method).toBe('POST');
    expect(parsed.url).toBe('https://api.example.com/login');
    expect(parsed.bodyType).toBe('json');
    expect(JSON.parse(parsed.bodyContent!)).toEqual({ username: 'admin', password: 'secret' });
  });
});
