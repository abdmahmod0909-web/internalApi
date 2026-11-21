export interface HeaderDefinition {
  key: string;
  description: string;
  commonValues: string[];
}

export const STANDARD_HEADERS: HeaderDefinition[] = [
  {
    key: 'Accept',
    description: 'Media type(s) that are acceptable for the response',
    commonValues: [
      'application/json',
      'text/html',
      'application/xml',
      'text/plain',
      '*/*',
      'application/javascript',
      'image/png',
      'image/jpeg',
      'application/octet-stream',
      'text/css',
    ],
  },
  {
    key: 'Accept-Charset',
    description: 'Character sets that are acceptable',
    commonValues: ['utf-8', 'iso-8859-1', 'us-ascii'],
  },
  {
    key: 'Accept-Encoding',
    description: 'List of acceptable content encodings / compressions',
    commonValues: ['gzip, deflate, br', 'gzip', 'deflate', 'br', 'identity'],
  },
  {
    key: 'Accept-Language',
    description: 'List of acceptable human languages for response',
    commonValues: ['en-US,en;q=0.9', 'en-GB,en;q=0.8', '*'],
  },
  {
    key: 'Access-Control-Request-Headers',
    description: 'Used when issuing a preflight request to indicate HTTP headers to be used',
    commonValues: ['Content-Type', 'Authorization', 'X-Requested-With'],
  },
  {
    key: 'Access-Control-Request-Method',
    description: 'Used when issuing a preflight request to indicate HTTP method to be used',
    commonValues: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  },
  {
    key: 'Age',
    description: 'The time in seconds the object was in a proxy cache',
    commonValues: ['0', '60', '3600'],
  },
  {
    key: 'Allow',
    description: 'Valid actions for a specified resource',
    commonValues: ['GET, POST, HEAD', 'GET, HEAD', 'GET, POST, PUT, DELETE, OPTIONS'],
  },
  {
    key: 'Authorization',
    description: 'Authentication credentials for HTTP authentication',
    commonValues: [
      'Bearer {{token}}',
      'Bearer ',
      'Basic {{credentials}}',
      'Basic ',
      'ApiKey {{api_key}}',
    ],
  },
  {
    key: 'Cache-Control',
    description: 'Directives for caching mechanisms in requests and responses',
    commonValues: [
      'no-cache',
      'no-store',
      'no-cache, no-store, must-revalidate',
      'max-age=0',
      'public',
      'private',
      'must-revalidate',
    ],
  },
  {
    key: 'Clear-Site-Data',
    description: 'Clears browsing data (cookies, storage, cache) associated with the website',
    commonValues: ['"cache", "cookies", "storage"', '"*"'],
  },
  {
    key: 'Connection',
    description: 'Control options for the current connection and list of hop-by-hop headers',
    commonValues: ['keep-alive', 'close', 'upgrade'],
  },
  {
    key: 'Content-Disposition',
    description: 'Directs whether the response should be displayed inline or as an attachment',
    commonValues: [
      'inline',
      'attachment',
      'attachment; filename="file.pdf"',
      'form-data; name="field"',
    ],
  },
  {
    key: 'Content-Encoding',
    description: 'The type of encoding used on the payload',
    commonValues: ['gzip', 'deflate', 'br', 'identity'],
  },
  {
    key: 'Content-Language',
    description: 'The natural language or languages of the intended audience',
    commonValues: ['en', 'en-US', 'fr', 'es', 'de'],
  },
  {
    key: 'Content-Length',
    description: 'The size of the resource in decimal number of bytes',
    commonValues: ['0'],
  },
  {
    key: 'Content-Range',
    description: 'Where in a full body message this partial message belongs',
    commonValues: ['bytes 0-1023/2048'],
  },
  {
    key: 'Content-Security-Policy',
    description: 'Restricts where resources can be loaded from',
    commonValues: ["default-src 'self'", "default-src 'none'"],
  },
  {
    key: 'Content-Type',
    description: 'The MIME type of the body of the request or response',
    commonValues: [
      'application/json',
      'application/json; charset=utf-8',
      'application/x-www-form-urlencoded',
      'multipart/form-data',
      'text/plain',
      'application/xml',
      'text/html',
      'application/graphql',
      'application/octet-stream',
      'application/pdf',
    ],
  },
  {
    key: 'Cookie',
    description: 'Contains stored HTTP cookies previously sent by the server',
    commonValues: ['session_id={{sessionId}}', 'token={{token}}'],
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    description: 'Prevents loading cross-origin resources that do not explicitly grant permission',
    commonValues: ['require-corp', 'credentialless', 'unsafe-none'],
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    description: 'Ensures a top-level document does not share a browsing context group with cross-origin documents',
    commonValues: ['same-origin', 'same-origin-allow-popups', 'unsafe-none'],
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    description: 'Blocks other origins from reading the resource',
    commonValues: ['same-origin', 'same-site', 'cross-origin'],
  },
  {
    key: 'Date',
    description: 'Date and time at which the message was originated',
    commonValues: [new Date().toUTCString()],
  },
  {
    key: 'DNT',
    description: 'Do Not Track request header indicating tracking preference',
    commonValues: ['1', '0'],
  },
  {
    key: 'ETag',
    description: 'Identifier for a specific version of a resource',
    commonValues: ['"33a64df551425fcc55e4d42a148795d9f25f89d4"', 'W/"0815"'],
  },
  {
    key: 'Expect',
    description: 'Indicates expectations that need to be met by the server',
    commonValues: ['100-continue'],
  },
  {
    key: 'Expires',
    description: 'Date/time after which the response is considered stale',
    commonValues: ['0', '-1'],
  },
  {
    key: 'Forwarded',
    description: 'Disclose original information of a client connecting to a web server',
    commonValues: ['for=192.0.2.60;proto=http;by=203.0.113.43'],
  },
  {
    key: 'From',
    description: 'Internet email address for a human user who controls the requesting agent',
    commonValues: ['user@example.com'],
  },
  {
    key: 'Host',
    description: 'Domain name of the server, and the TCP port number on which the server is listening',
    commonValues: ['localhost', 'api.example.com'],
  },
  {
    key: 'If-Match',
    description: 'Only perform the action if the client etag matches the server',
    commonValues: ['*'],
  },
  {
    key: 'If-Modified-Since',
    description: 'Allows a 304 Not Modified to be returned if content is unchanged since specified date',
    commonValues: [new Date().toUTCString()],
  },
  {
    key: 'If-None-Match',
    description: 'Allows a 304 Not Modified to be returned if entity matches etag',
    commonValues: ['*'],
  },
  {
    key: 'If-Range',
    description: 'If entity is unchanged, send partial message; otherwise send full message',
    commonValues: ['*'],
  },
  {
    key: 'If-Unmodified-Since',
    description: 'Only send response if entity has not been modified since date',
    commonValues: [new Date().toUTCString()],
  },
  {
    key: 'Keep-Alive',
    description: 'Hints about connection persistence parameters',
    commonValues: ['timeout=5, max=1000'],
  },
  {
    key: 'Origin',
    description: 'Indicates where a fetch originates from',
    commonValues: ['http://localhost:3000', 'https://localhost:3000', 'https://example.com'],
  },
  {
    key: 'Pragma',
    description: 'Implementation-specific directives that may apply to any agent along the chain',
    commonValues: ['no-cache'],
  },
  {
    key: 'Proxy-Authorization',
    description: 'Credentials for authenticating a client to a proxy server',
    commonValues: ['Basic {{proxy_credentials}}'],
  },
  {
    key: 'Range',
    description: 'Request only part of an entity by byte range',
    commonValues: ['bytes=0-1023', 'bytes=0-'],
  },
  {
    key: 'Referer',
    description: 'The address of the previous web page from which a link to the currently requested page was followed',
    commonValues: ['https://example.com', 'https://localhost:3000'],
  },
  {
    key: 'Sec-Fetch-Dest',
    description: 'Indicates the request destination (document, image, empty, script)',
    commonValues: ['empty', 'document', 'image', 'script', 'style', 'font', 'worker'],
  },
  {
    key: 'Sec-Fetch-Mode',
    description: 'Indicates the mode of the request (cors, navigate, no-cors)',
    commonValues: ['cors', 'navigate', 'no-cors', 'same-origin', 'websocket'],
  },
  {
    key: 'Sec-Fetch-Site',
    description: 'Relationship between initiator origin and request target origin',
    commonValues: ['cross-site', 'same-origin', 'same-site', 'none'],
  },
  {
    key: 'Sec-Fetch-User',
    description: 'Whether a navigation request was triggered by user activation',
    commonValues: ['?1'],
  },
  {
    key: 'Server',
    description: 'Information about the software used by the origin server',
    commonValues: ['nginx', 'cloudflare', 'Apache'],
  },
  {
    key: 'Set-Cookie',
    description: 'Send cookies from the server to the user agent',
    commonValues: ['session_id=xyz; Path=/; Secure; HttpOnly'],
  },
  {
    key: 'Strict-Transport-Security',
    description: 'HSTS: forces browser to communicate only via HTTPS',
    commonValues: ['max-age=31536000; includeSubDomains', 'max-age=63072000; includeSubDomains; preload'],
  },
  {
    key: 'TE',
    description: 'Transfer-encodings the user agent is willing to accept',
    commonValues: ['trailers'],
  },
  {
    key: 'Transfer-Encoding',
    description: 'The form of encoding used to safely transfer the payload to the user',
    commonValues: ['chunked', 'compress', 'deflate', 'gzip'],
  },
  {
    key: 'Upgrade',
    description: 'Request the server to upgrade to a different protocol',
    commonValues: ['websocket', 'h2c'],
  },
  {
    key: 'Upgrade-Insecure-Requests',
    description: 'Sends signal to server that client prefers encrypted connection',
    commonValues: ['1'],
  },
  {
    key: 'User-Agent',
    description: 'Contains a characteristic string that allows the network protocol peers to identify the application',
    commonValues: [
      'PostmanRuntime/7.39.0',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'curl/7.68.0',
    ],
  },
  {
    key: 'Vary',
    description: 'Determines how to match future request headers to decide cache response',
    commonValues: ['Accept-Encoding', 'User-Agent', 'Origin'],
  },
  {
    key: 'Via',
    description: 'Informs the client of proxies through which the request was sent',
    commonValues: ['1.1 vegur', '1.0 fred, 1.1 p.example.net'],
  },
  {
    key: 'Warning',
    description: 'General warning about possible problems with status of the message',
    commonValues: ['199 Miscellaneous "warning"'],
  },
  {
    key: 'X-API-Key',
    description: 'Custom header often used for API key authentication',
    commonValues: ['{{apiKey}}', '{{api_key}}', '{{key}}'],
  },
  {
    key: 'X-CSRF-Token',
    description: 'Cross-Site Request Forgery protection token',
    commonValues: ['{{csrf_token}}', '{{csrfToken}}'],
  },
  {
    key: 'X-Forwarded-For',
    description: 'Identifies the originating IP address of a client connecting to a web server',
    commonValues: ['127.0.0.1', 'client1, proxy1, proxy2'],
  },
  {
    key: 'X-Forwarded-Host',
    description: 'Identifies original host requested that was in Host request header',
    commonValues: ['example.com'],
  },
  {
    key: 'X-Forwarded-Proto',
    description: 'Identifies the protocol (HTTP or HTTPS) that a client used to connect',
    commonValues: ['https', 'http'],
  },
  {
    key: 'X-Frame-Options',
    description: 'Indicates whether browser should be allowed to render a page in frame/iframe',
    commonValues: ['DENY', 'SAMEORIGIN'],
  },
  {
    key: 'X-Requested-With',
    description: 'Mainly used to identify Ajax/XHR requests',
    commonValues: ['XMLHttpRequest'],
  },
];

// Clean up standard headers fix
export const HEADERS_LIST: HeaderDefinition[] = STANDARD_HEADERS.map((h) => ({
  key: h.key,
  description: h.description || 'Standard HTTP header',
  commonValues: h.commonValues || [],
}));

/**
 * Filter header keys matching user query.
 */
export function getHeaderKeySuggestions(query: string, limit = 12): HeaderDefinition[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    // Return most common headers when query is empty
    const popularKeys = new Set(['Accept', 'Content-Type', 'Authorization', 'User-Agent', 'Cache-Control', 'Origin', 'Cookie', 'X-API-Key', 'Accept-Encoding', 'Accept-Language']);
    return HEADERS_LIST.filter((h) => popularKeys.has(h.key)).slice(0, limit);
  }

  // Exact prefix match first, then substring match
  const prefixMatches: HeaderDefinition[] = [];
  const substringMatches: HeaderDefinition[] = [];

  for (const item of HEADERS_LIST) {
    const k = item.key.toLowerCase();
    if (k.startsWith(q)) {
      prefixMatches.push(item);
    } else if (k.includes(q) || item.description.toLowerCase().includes(q)) {
      substringMatches.push(item);
    }
  }

  return [...prefixMatches, ...substringMatches].slice(0, limit);
}

export interface ValueSuggestionItem {
  value: string;
  label?: string;
  type: 'preset' | 'variable';
  scope?: string;
}

/**
 * Filter header value suggestions based on current header key, user query, and workspace variables.
 */
export function getHeaderValueSuggestions(
  headerKey: string,
  query: string,
  availableVariables: Array<{ key: string; value: string; scope?: string }> = [],
  limit = 12
): ValueSuggestionItem[] {
  const cleanKey = headerKey.trim().toLowerCase();
  const q = query.trim().toLowerCase();

  const results: ValueSuggestionItem[] = [];
  const seenValues = new Set<string>();

  // 1. Variable suggestions if user typed `{{` or just typing in value
  for (const v of availableVariables) {
    if (!v.key) continue;
    const token = `{{${v.key}}}`;
    if (!q || token.toLowerCase().includes(q) || v.key.toLowerCase().includes(q)) {
      seenValues.add(token);
      results.push({
        value: token,
        label: v.value ? `${v.key}: ${v.value}` : v.key,
        type: 'variable',
        scope: v.scope || 'Variable',
      });
    }
  }

  // 2. Preset value suggestions for this header key
  const matchingHeader = HEADERS_LIST.find((h) => h.key.toLowerCase() === cleanKey);
  if (matchingHeader && matchingHeader.commonValues) {
    for (const val of matchingHeader.commonValues) {
      if (seenValues.has(val)) continue;
      if (!q || val.toLowerCase().includes(q)) {
        seenValues.add(val);
        results.push({
          value: val,
          label: val,
          type: 'preset',
        });
      }
    }
  }

  // 3. Fallback generic MIME types if key relates to content/accept and not yet added
  if ((cleanKey.includes('content-type') || cleanKey.includes('accept')) && results.length < 5) {
    const genericMimes = ['application/json', 'application/xml', 'text/html', 'text/plain', '*/*'];
    for (const m of genericMimes) {
      if (!seenValues.has(m) && (!q || m.toLowerCase().includes(q))) {
        seenValues.add(m);
        results.push({
          value: m,
          label: m,
          type: 'preset',
        });
      }
    }
  }

  return results.slice(0, limit);
}
