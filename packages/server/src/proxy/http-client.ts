import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';
import { performance } from 'node:perf_hooks';
import type {
  ApiRequestData,
  ApiResponseData,
  CookieItem,
  TimingBreakdown,
} from '@internalapi/shared';
import { validateSsrfTarget } from './ssrf.js';

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

  // SSRF Protection check
  await validateSsrfTarget(targetUrl);

  const url = new URL(targetUrl);
  const isHttps = url.protocol === 'https:';

  // Request settings
  const timeoutMs = requestData.settings?.timeoutMs || 30000;
  const followRedirects = requestData.settings?.followRedirects ?? true;
  const verifySsl = requestData.settings?.verifySsl ?? true;

  // Build Request Headers
  const requestHeaders: Record<string, string> = {
    'User-Agent': 'InternalAPI/1.0.0 (Self-Hosted; +https://internalapi.local)',
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

  if (requestPayload) {
    requestHeaders['Content-Length'] = String(requestPayload.length);
  }

  // Performance timings tracking
  const startTime = performance.now();
  let dnsTime = 0;
  let tcpTime = 0;
  let tlsTime = 0;
  let ttfbTime = 0;

  return new Promise<ApiResponseData>((resolve, reject) => {
    const protocolModule = isHttps ? https : http;

    const reqOptions: https.RequestOptions = {
      protocol: url.protocol,
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 80),
      path: `${url.pathname}${url.search}`,
      method: requestData.method,
      headers: requestHeaders,
      timeout: timeoutMs,
      rejectUnauthorized: verifySsl,
      ca: customCa,
    };

    let dnsLookupStart: number;
    let tcpConnectStart: number;
    let tlsHandshakeStart: number;

    const req = protocolModule.request(reqOptions, (res) => {
      ttfbTime = performance.now() - startTime;
      const chunks: Buffer[] = [];

      res.on('data', (chunk) => {
        chunks.push(chunk);
      });

      res.on('end', () => {
        const endTime = performance.now();
        const totalDuration = Math.round(endTime - startTime);
        const fullBuffer = Buffer.concat(chunks);

        const responseHeaders: Record<string, string | string[]> = {};
        for (const [key, val] of Object.entries(res.headers)) {
          if (val !== undefined) {
            responseHeaders[key] = val;
          }
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
          body: fullBuffer.toString('utf8'),
          size: fullBuffer.length,
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

    req.on('error', (err) => {
      reject(err);
    });

    if (requestPayload) {
      req.write(requestPayload);
    }
    req.end();
  });
}

