import http from 'node:http';
import https from 'node:https';
import zlib from 'node:zlib';
import { URL } from 'node:url';
import { performance } from 'node:perf_hooks';
import type {
  ApiRequestData,
  ApiResponseData,
  CookieItem,
  TimingBreakdown,
} from '@internalapi/shared';
import { validateSsrfTarget } from './ssrf.js';

const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
const MAX_REDIRECTS = 10;

/**
 * If LOCALHOST_REWRITE is set (e.g. "host.docker.internal"), requests aimed at
 * localhost/loopback are redirected to that host. This lets a backend running in
 * Docker/WSL/VM reach APIs running on the developer's machine.
 */
function applyLocalhostRewrite(url: URL): void {
  const rewriteHost = process.env.LOCALHOST_REWRITE;
  if (rewriteHost && LOCAL_HOSTNAMES.has(url.hostname)) {
    url.hostname = rewriteHost;
  }
}

/**
 * Parses Set-Cookie header strings into structured Cookie objects.
 */
function parseSetCookie(cookies: string | string[]): CookieItem[] {
  if (!cookies) return [];
  const list = Array.isArray(cookies) ? cookies : [cookies];
  return list.map((item) => {
    const parts = item.split(';').map((p) => p.trim());
    const [name, ...valueParts] = parts[0].split('=');
    const value = valueParts.join('=');
    const cookie: CookieItem = { name, value };

    for (let i = 1; i < parts.length; i++) {
      const [k, v] = parts[i].split('=');
      const lowerKey = k.toLowerCase();
      if (lowerKey === 'domain') cookie.domain = v;
      else if (lowerKey === 'path') cookie.path = v;
      else if (lowerKey === 'expires') cookie.expires = v;
      else if (lowerKey === 'httponly') cookie.httpOnly = true;
      else if (lowerKey === 'secure') cookie.secure = true;
    }
    return cookie;
  });
}

/**
 * Decompresses and decodes the HTTP response buffer based on Content-Encoding and Content-Type charset.
 * Prevents garbled/corrupted binary text when upstream servers return gzip, deflate, or brotli compressed data,
 * and ensures Arabic and non-ASCII characters are cleanly decoded.
 */
export function decompressAndDecodeResponseBody(
  buffer: Buffer,
  headers: http.IncomingHttpHeaders | Record<string, any>
): { body: string; decompressedBuffer: Buffer; wasCompressed: boolean } {
  if (!buffer || buffer.length === 0) {
    return { body: '', decompressedBuffer: buffer, wasCompressed: false };
  }

  const contentEncoding = String(headers['content-encoding'] || '').toLowerCase().trim();
  let decompressed = buffer;
  let wasCompressed = false;

  // Check gzip by header or magic bytes (0x1f, 0x8b)
  const isGzip =
    contentEncoding.includes('gzip') ||
    (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b);
  const isBrotli = contentEncoding.includes('br');
  const isDeflate = contentEncoding.includes('deflate');

  try {
    if (isGzip) {
      try {
        decompressed = zlib.gunzipSync(buffer);
        wasCompressed = true;
      } catch {
        // Fallback to inflate if header claimed gzip but actually zlib wrapped
        decompressed = zlib.inflateSync(buffer);
        wasCompressed = true;
      }
    } else if (isBrotli) {
      decompressed = zlib.brotliDecompressSync(buffer);
      wasCompressed = true;
    } else if (isDeflate) {
      try {
        decompressed = zlib.inflateSync(buffer);
        wasCompressed = true;
      } catch {
        // Fallback for raw deflate stream without zlib header
        decompressed = zlib.inflateRawSync(buffer);
        wasCompressed = true;
      }
    }
  } catch {
    // If decompression fails, retain original buffer
    decompressed = buffer;
  }

  // Detect character encoding from Content-Type (e.g. text/html; charset=windows-1256, utf-8)
  const contentType = String(headers['content-type'] || '');
  const charsetMatch = contentType.match(/charset=([a-zA-Z0-9_\-]+)/i);
  const charset = charsetMatch ? charsetMatch[1].toLowerCase().trim() : 'utf-8';

  let body: string;
  try {
    const decoder = new TextDecoder(charset);
    body = decoder.decode(decompressed);
  } catch {
    // If TextDecoder fails with specified charset, fallback to utf-8
    try {
      body = new TextDecoder('utf-8').decode(decompressed);
    } catch {
      body = decompressed.toString('utf8');
    }
  }

  return { body, decompressedBuffer: decompressed, wasCompressed };
}

/**
 * Builds the effective target URL with query parameters and path variable substitutions.
 */
export function buildTargetUrl(request: ApiRequestData): string {
  let urlStr = request.url.trim();

  // Path variables replacement, e.g. /users/:id or /users/{id}
  if (request.pathVars && request.pathVars.length > 0) {
    for (const pv of request.pathVars) {
      if (pv.isEnabled && pv.key) {
        urlStr = urlStr.replace(new RegExp(`:${pv.key}\\b`, 'g'), encodeURIComponent(pv.value));
        urlStr = urlStr.replace(new RegExp(`\\{${pv.key}\\}`, 'g'), encodeURIComponent(pv.value));
      }
    }
  }

  // Handle protocol defaults
  if (!urlStr.startsWith('http://') && !urlStr.startsWith('https://')) {
    urlStr = `http://${urlStr}`;
  }

  const url = new URL(urlStr);

  // Append enabled query parameters
  if (request.queryParams && request.queryParams.length > 0) {
    for (const qp of request.queryParams) {
      if (qp.isEnabled && qp.key) {
        url.searchParams.append(qp.key, qp.value);
      }
    }
  }

  // Auth: API Key in Query Param
  if (
    request.auth?.type === 'apikey' &&
    request.auth.apiKey?.addTo === 'query' &&
    request.auth.apiKey.key
  ) {
    url.searchParams.set(request.auth.apiKey.key, request.auth.apiKey.value || '');
  }

  return url.toString();
}

/**
 * Executes an HTTP/HTTPS request through the backend proxy.
 */
export async function executeProxyRequest(
  requestData: ApiRequestData,
  customCa?: string
): Promise<ApiResponseData> {
  const targetUrl = buildTargetUrl(requestData);

  // SSRF Protection check (runs on the URL the user entered)
  await validateSsrfTarget(targetUrl);

  // Request settings
  const timeoutMs = requestData.settings?.timeoutMs || 30000;
  const followRedirects = requestData.settings?.followRedirects ?? true;
  const verifySsl = requestData.settings?.verifySsl ?? true;

  // Build Request Headers with standard Postman-compatible defaults
  const requestHeaders: Record<string, string> = {
    'User-Agent': 'PostmanRuntime/7.39.0',
    'Accept': '*/*',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
  };

  // Add custom headers from request
  if (requestData.headers) {
    for (const h of requestData.headers) {
      if (h.isEnabled && h.key) {
        requestHeaders[h.key] = h.value;
      }
    }
  }

  // Handle Authentication
  if (requestData.auth) {
    switch (requestData.auth.type) {
      case 'bearer':
        if (requestData.auth.bearer?.token) {
          requestHeaders['Authorization'] = `Bearer ${requestData.auth.bearer.token}`;
        }
        break;
      case 'basic':
        if (requestData.auth.basic) {
          const credentials = Buffer.from(
            `${requestData.auth.basic.username || ''}:${requestData.auth.basic.password || ''}`
          ).toString('base64');
          requestHeaders['Authorization'] = `Basic ${credentials}`;
        }
        break;
      case 'apikey':
        if (requestData.auth.apiKey?.addTo === 'header' && requestData.auth.apiKey.key) {
          requestHeaders[requestData.auth.apiKey.key] = requestData.auth.apiKey.value || '';
        }
        break;
      case 'oauth2':
        if (requestData.auth.oauth2?.accessToken) {
          requestHeaders['Authorization'] = `Bearer ${requestData.auth.oauth2.accessToken}`;
        }
        break;
      case 'custom':
        if (requestData.auth.custom?.headerName) {
          requestHeaders[requestData.auth.custom.headerName] =
            requestData.auth.custom.headerValue || '';
        }
        break;
    }
  }

  // Prepare Request Body
  let requestPayload: Buffer | undefined;

  switch (requestData.bodyType) {
    case 'json':
      if (requestData.bodyContent) {
        if (!requestHeaders['Content-Type']) {
          requestHeaders['Content-Type'] = 'application/json';
        }
        requestPayload = Buffer.from(requestData.bodyContent, 'utf8');
      }
      break;

    case 'raw':
      if (requestData.bodyContent) {
        if (!requestHeaders['Content-Type']) {
          requestHeaders['Content-Type'] = 'text/plain; charset=utf-8';
        }
        requestPayload = Buffer.from(requestData.bodyContent, 'utf8');
      }
      break;

    case 'graphql':
      if (requestData.bodyGraphQL?.query) {
        if (!requestHeaders['Content-Type']) {
          requestHeaders['Content-Type'] = 'application/json';
        }
        const gqlPayload: { query: string; variables?: Record<string, unknown> } = {
          query: requestData.bodyGraphQL.query,
        };
        if (requestData.bodyGraphQL.variables) {
          try {
            gqlPayload.variables = JSON.parse(requestData.bodyGraphQL.variables);
          } catch {
            // Keep as undefined if parsing fails
          }
        }
        requestPayload = Buffer.from(JSON.stringify(gqlPayload), 'utf8');
      }
      break;

    case 'x-www-form-urlencoded':
      if (requestData.bodyUrlEncoded && requestData.bodyUrlEncoded.length > 0) {
        if (!requestHeaders['Content-Type']) {
          requestHeaders['Content-Type'] = 'application/x-www-form-urlencoded';
        }
        const params = new URLSearchParams();
        for (const item of requestData.bodyUrlEncoded) {
          if (item.isEnabled && item.key) {
            params.append(item.key, item.value || '');
          }
        }
        requestPayload = Buffer.from(params.toString(), 'utf8');
      }
      break;

    case 'form-data':
      if (requestData.bodyFormData && requestData.bodyFormData.length > 0) {
        const boundary = '----InternalAPIFormBoundary' + Math.random().toString(36).substring(2);
        requestHeaders['Content-Type'] = `multipart/form-data; boundary=${boundary}`;

        const buffers: Buffer[] = [];
        for (const item of requestData.bodyFormData) {
          if (!item.isEnabled || !item.key) continue;

          if (item.type === 'file' && item.fileBase64) {
            const fileName = item.fileName || 'upload.bin';
            const mime = item.mimeType || 'application/octet-stream';
            buffers.push(
              Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${item.key}"; filename="${fileName}"\r\nContent-Type: ${mime}\r\n\r\n`
              )
            );
            buffers.push(Buffer.from(item.fileBase64, 'base64'));
            buffers.push(Buffer.from('\r\n'));
          } else {
            buffers.push(
              Buffer.from(
                `--${boundary}\r\nContent-Disposition: form-data; name="${item.key}"\r\n\r\n${item.value || ''}\r\n`
              )
            );
          }
        }
        buffers.push(Buffer.from(`--${boundary}--\r\n`));
        requestPayload = Buffer.concat(buffers);
      }
      break;
  }

  // Overall timer (spans all redirect hops)
  const startTime = performance.now();

  /**
   * Performs a single HTTP hop. Resolves with the final response, following
   * redirects (with SSRF re-validation on every hop) when enabled.
   */
  const performHop = (
    hopUrlStr: string,
    method: string,
    payload: Buffer | undefined,
    headers: Record<string, string>,
    redirectsLeft: number
  ): Promise<ApiResponseData> => {
    return new Promise<ApiResponseData>((resolve, reject) => {
      const url = new URL(hopUrlStr);
      applyLocalhostRewrite(url);

      const isHttps = url.protocol === 'https:';
      const protocolModule = isHttps ? https : http;

      const hopHeaders: Record<string, string> = { ...headers };
      if (payload) {
        hopHeaders['Content-Length'] = String(payload.length);
      } else {
        delete hopHeaders['Content-Length'];
      }

      // Per-hop timing state
      let dnsTime = 0;
      let tcpTime = 0;
      let tlsTime = 0;
      let ttfbTime = 0;
      let dnsLookupStart = 0;
      let tcpConnectStart = 0;
      let tlsHandshakeStart = 0;

      const reqOptions: https.RequestOptions = {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: `${url.pathname}${url.search}`,
        method,
        headers: hopHeaders,
        timeout: timeoutMs,
        rejectUnauthorized: verifySsl,
        ca: customCa,
      };

      const req = protocolModule.request(reqOptions, (res) => {
        ttfbTime = performance.now() - startTime;

        // ---- Redirect handling ----
        const status = res.statusCode || 0;
        const location = res.headers.location;
        if (followRedirects && location && [301, 302, 303, 307, 308].includes(status)) {
          res.resume(); // discard body

          if (redirectsLeft <= 0) {
            reject(new Error(`Maximum redirects (${MAX_REDIRECTS}) exceeded`));
            return;
          }

          let nextUrl: URL;
          try {
            // Use the original (non-rewritten) URL as base for relative redirects
            nextUrl = new URL(location, hopUrlStr);
          } catch {
            reject(new Error(`Invalid redirect location: ${location}`));
            return;
          }

          let nextMethod = method;
          let nextPayload = payload;
          const nextHeaders = { ...hopHeaders };

          // 303 always -> GET; 301/302 -> GET for non-GET/HEAD (browser/curl behaviour)
          if (
            status === 303 ||
            ((status === 301 || status === 302) && method !== 'GET' && method !== 'HEAD')
          ) {
            if (method !== 'HEAD') nextMethod = 'GET';
            nextPayload = undefined;
            for (const k of Object.keys(nextHeaders)) {
              const lk = k.toLowerCase();
              if (lk === 'content-type' || lk === 'content-length') delete nextHeaders[k];
            }
          }

          // Never leak credentials to a different host
          if (nextUrl.host !== new URL(hopUrlStr).host) {
            for (const k of Object.keys(nextHeaders)) {
              if (k.toLowerCase() === 'authorization') delete nextHeaders[k];
            }
          }

          // Validate every redirect target against SSRF rules
          validateSsrfTarget(nextUrl.toString())
            .then(() =>
              performHop(nextUrl.toString(), nextMethod, nextPayload, nextHeaders, redirectsLeft - 1)
            )
            .then(resolve, reject);
          return;
        }

        // ---- Final response ----
        const chunks: Buffer[] = [];

        res.on('data', (chunk) => {
          chunks.push(chunk);
        });

        res.on('error', reject);

        res.on('end', () => {
          const endTime = performance.now();
          const totalDuration = Math.round(endTime - startTime);
          const fullBuffer = Buffer.concat(chunks);
          const { body, decompressedBuffer, wasCompressed } = decompressAndDecodeResponseBody(
            fullBuffer,
            res.headers
          );

          const responseHeaders: Record<string, string | string[]> = {};
          for (const [key, val] of Object.entries(res.headers)) {
            if (val !== undefined) {
              responseHeaders[key] = val;
            }
          }

          // If body was decompressed, update content-encoding and content-length headers
          if (wasCompressed) {
            delete responseHeaders['content-encoding'];
            responseHeaders['content-length'] = String(decompressedBuffer.length);
          }

          const cookies = parseSetCookie(res.headers['set-cookie'] || []);
          const contentType = String(res.headers['content-type'] || '');

          const timings: TimingBreakdown = {
            dns: Math.round(dnsTime),
            tcp: Math.round(tcpTime),
            tls: Math.round(tlsTime),
            ttfb: Math.round(ttfbTime),
            download: Math.round(totalDuration - ttfbTime),
            total: totalDuration,
          };

          resolve({
            status: res.statusCode || 200,
            statusText: res.statusMessage || 'OK',
            headers: responseHeaders,
            cookies,
            body,
            size: decompressedBuffer.length,
            time: totalDuration,
            timings,
            contentType,
          });
        });
      });

      // Capture low-level socket timings
      req.on('socket', (socket) => {
        dnsLookupStart = performance.now();

        socket.on('lookup', () => {
          dnsTime = performance.now() - dnsLookupStart;
          tcpConnectStart = performance.now();
        });

        socket.on('connect', () => {
          if (tcpConnectStart) {
            tcpTime = performance.now() - tcpConnectStart;
          }
          tlsHandshakeStart = performance.now();
        });

        socket.on('secureConnect', () => {
          if (tlsHandshakeStart) {
            tlsTime = performance.now() - tlsHandshakeStart;
          }
        });
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error(`Request timed out after ${timeoutMs}ms`));
      });

      req.on('error', (err: NodeJS.ErrnoException) => {
        // Give a more helpful hint for the common "local API unreachable" case
        if (err.code === 'ECONNREFUSED' && LOCAL_HOSTNAMES.has(new URL(hopUrlStr).hostname)) {
          err.message +=
            ' (the proxy backend could not reach this address from its own environment. ' +
            'If the backend runs in Docker/WSL/a VM, set LOCALHOST_REWRITE=host.docker.internal ' +
            'or use a host-reachable IP.)';
        }
        reject(err);
      });

      if (payload) {
        req.write(payload);
      }
      req.end();
    });
  };

  return performHop(targetUrl, requestData.method, requestPayload, requestHeaders, MAX_REDIRECTS);
}