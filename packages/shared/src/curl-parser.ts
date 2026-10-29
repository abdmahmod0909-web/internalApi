import type { ApiRequestData, HttpMethod, KeyValueItem, FormDataItem, AuthConfig } from './types/index.js';

/**
 * Tokenizes a shell command string, taking into account single quotes, double quotes,
 * escape characters, and line continuations (\ or ^).
 */
export function tokenizeShell(cmd: string): string[] {
  // Normalize line continuations
  const normalized = cmd
    .replace(/\\\r?\n/g, ' ')
    .replace(/\^\r?\n/g, ' ')
    .trim();

  const tokens: string[] = [];
  let current = '';
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let isEscaped = false;

  for (let i = 0; i < normalized.length; i++) {
    const char = normalized[i];

    if (isEscaped) {
      current += char;
      isEscaped = false;
      continue;
    }

    if (char === '\\' && !inSingleQuote) {
      isEscaped = true;
      continue;
    }

    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }

    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }

    if (/\s/.test(char) && !inSingleQuote && !inDoubleQuote) {
      if (current.length > 0) {
        tokens.push(current);
        current = '';
      }
      continue;
    }

    current += char;
  }

  if (current.length > 0) {
    tokens.push(current);
  }

  return tokens;
}

/**
 * Checks if a string looks like a cURL command.
 */
export function isCurlCommand(input: string): boolean {
  if (!input) return false;
  const trimmed = input.trim();
  return trimmed.startsWith('curl ') || trimmed.startsWith('curl\n') || trimmed.startsWith('curl\r\n');
}

/**
 * Parses a cURL command string into an ApiRequestData object.
 */
export function parseCurlCommand(curlCommand: string): Partial<ApiRequestData> {
  const tokens = tokenizeShell(curlCommand);

  // If first token is curl, remove it
  if (tokens.length > 0 && tokens[0].toLowerCase() === 'curl') {
    tokens.shift();
  }

  let method: HttpMethod = 'GET';
  let url = '';
  const headers: KeyValueItem[] = [];
  const queryParams: KeyValueItem[] = [];
  let bodyType: ApiRequestData['bodyType'] = 'none';
  let bodyContent = '';
  const bodyFormData: FormDataItem[] = [];
  const bodyUrlEncoded: KeyValueItem[] = [];
  let auth: AuthConfig = { type: 'none' };
  let explicitMethod = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];

    // Method: -X, --request
    if (token === '-X' || token === '--request') {
      const next = tokens[++i];
      if (next) {
        method = next.toUpperCase() as HttpMethod;
        explicitMethod = true;
      }
      continue;
    }

    // URL: --url or positional argument
    if (token === '--url') {
      const next = tokens[++i];
      if (next) url = next;
      continue;
    }

    // Headers: -H, --header
    if (token === '-H' || token === '--header') {
      const next = tokens[++i];
      if (next) {
        const colonIdx = next.indexOf(':');
        if (colonIdx > 0) {
          const key = next.substring(0, colonIdx).trim();
          const value = next.substring(colonIdx + 1).trim();

          // Check if Authorization header
          if (key.toLowerCase() === 'authorization') {
            if (value.toLowerCase().startsWith('bearer ')) {
              auth = {
                type: 'bearer',
                bearer: { token: value.substring(7).trim() },
              };
            } else if (value.toLowerCase().startsWith('basic ')) {
              try {
                const decoded = atob(value.substring(6).trim());
                const [username, ...passParts] = decoded.split(':');
                auth = {
                  type: 'basic',
                  basic: { username, password: passParts.join(':') },
                };
              } catch {
                // Keep raw header if decoding fails
              }
            }
          }

          headers.push({
            id: `h-${Date.now()}-${Math.random()}`,
            key,
            value,
            isEnabled: true,
          });
        }
      }
      continue;
    }

    // Basic Auth: -u, --user
    if (token === '-u' || token === '--user') {
      const next = tokens[++i];
      if (next) {
        const [username, ...passParts] = next.split(':');
        auth = {
          type: 'basic',
          basic: { username, password: passParts.join(':') },
        };
      }
      continue;
    }

    // Request Data / Body: -d, --data, --data-raw, --data-binary, --data-ascii
    if (
      token === '-d' ||
      token === '--data' ||
      token === '--data-raw' ||
      token === '--data-binary' ||
      token === '--data-ascii'
    ) {
      const next = tokens[++i];
      if (next !== undefined) {
        bodyContent = next;
        bodyType = 'raw';
        // If method was not explicitly set to something else, cURL defaults to POST when -d is present
        if (!explicitMethod) {
          method = 'POST';
        }

        // Test if JSON
        try {
          JSON.parse(next);
          bodyType = 'json';
        } catch {
          // Check if looks like x-www-form-urlencoded (key=value&key2=val2)
          if (next.includes('=') && !next.includes('\n')) {
            const pairs = next.split('&');
            for (const p of pairs) {
              const [k, ...v] = p.split('=');
              if (k) {
                bodyUrlEncoded.push({
                  id: `ue-${Date.now()}-${Math.random()}`,
                  key: decodeURIComponent(k),
                  value: decodeURIComponent(v.join('=')),
                  isEnabled: true,
                });
              }
            }
            if (bodyUrlEncoded.length > 0) {
              bodyType = 'x-www-form-urlencoded';
            }
          }
        }
      }
      continue;
    }

    // Form Data: -F, --form
    if (token === '-F' || token === '--form') {
      const next = tokens[++i];
      if (next) {
        bodyType = 'form-data';
        if (!explicitMethod) {
          method = 'POST';
        }
        const eqIdx = next.indexOf('=');
        if (eqIdx > 0) {
          const key = next.substring(0, eqIdx);
          const val = next.substring(eqIdx + 1);
          if (val.startsWith('@')) {
            bodyFormData.push({
              id: `fd-${Date.now()}-${Math.random()}`,
              key,
              value: '',
              type: 'file',
              fileName: val.substring(1),
              isEnabled: true,
            });
          } else {
            bodyFormData.push({
              id: `fd-${Date.now()}-${Math.random()}`,
              key,
              value: val,
              type: 'text',
              isEnabled: true,
            });
          }
        }
      }
      continue;
    }

    // Positional URL (starts with http:// or https:// or domain/path, and not a flag)
    if (!token.startsWith('-') && !url) {
      url = token;
    }
  }

  // Extract query parameters from URL into params table
  if (url && url.includes('?')) {
    try {
      const parsedUrl = new URL(url.startsWith('http') ? url : `http://${url}`);
      parsedUrl.searchParams.forEach((value, key) => {
        queryParams.push({
          id: `qp-${Date.now()}-${Math.random()}`,
          key,
          value,
          isEnabled: true,
        });
      });
    } catch {
      // URL parsing fallback
      const qIndex = url.indexOf('?');
      const search = url.substring(qIndex + 1);
      const parts = search.split('&');
      for (const part of parts) {
        const [k, ...v] = part.split('=');
        if (k) {
          queryParams.push({
            id: `qp-${Date.now()}-${Math.random()}`,
            key: decodeURIComponent(k),
            value: decodeURIComponent(v.join('=')),
            isEnabled: true,
          });
        }
      }
    }
  }

  // Generate request name from URL
  let name = `${method} Request`;
  if (url) {
    try {
      const parsed = new URL(url.startsWith('http') ? url : `http://${url}`);
      const pathParts = parsed.pathname.split('/').filter(Boolean);
      name = pathParts.length > 0 ? `${method} /${pathParts.slice(-2).join('/')}` : `${method} ${parsed.hostname}`;
    } catch {
      name = `${method} Request`;
    }
  }

  return {
    name,
    method,
    url,
    headers: headers.length > 0 ? headers : [{ id: 'h1', key: '', value: '', isEnabled: true }],
    queryParams: queryParams.length > 0 ? queryParams : [{ id: 'q1', key: '', value: '', isEnabled: true }],
    bodyType,
    bodyContent,
    bodyFormData: bodyFormData.length > 0 ? bodyFormData : [],
    bodyUrlEncoded: bodyUrlEncoded.length > 0 ? bodyUrlEncoded : [],
    auth,
  };
}
