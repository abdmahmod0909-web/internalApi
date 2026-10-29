import type { ApiRequestData } from './types/index.js';

/**
 * Escapes single quotes for POSIX shell single-quoted strings: ' -> '\''
 */
function escapeShellSingleQuotes(str: string): string {
  return str.replace(/'/g, `'\\''`);
}

/**
 * Generates an executable cURL command string from an ApiRequestData object.
 */
export function generateCurlCommand(req: ApiRequestData): string {
  // Construct URL with query parameters and path variables
  let url = req.url.trim();

  // Path variables
  if (req.pathVars) {
    for (const pv of req.pathVars) {
      if (pv.isEnabled && pv.key) {
        url = url.replace(new RegExp(`:${pv.key}\\b`, 'g'), encodeURIComponent(pv.value));
        url = url.replace(new RegExp(`\\{${pv.key}\\}`, 'g'), encodeURIComponent(pv.value));
      }
    }
  }

  // Query params
  if (req.queryParams && req.queryParams.length > 0) {
    const enabledParams = req.queryParams.filter((p) => p.isEnabled && p.key);
    if (enabledParams.length > 0) {
      const separator = url.includes('?') ? '&' : '?';
      const search = enabledParams
        .map((p) => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value || '')}`)
        .join('&');
      url = `${url}${separator}${search}`;
    }
  }

  const parts: string[] = ['curl --location'];

  // Method
  if (req.method !== 'GET') {
    parts.push(`--request ${req.method}`);
  }

  // URL
  parts.push(`'${escapeShellSingleQuotes(url)}'`);

  // Headers
  if (req.headers) {
    for (const h of req.headers) {
      if (h.isEnabled && h.key) {
        parts.push(`--header '${escapeShellSingleQuotes(h.key)}: ${escapeShellSingleQuotes(h.value || '')}'`);
      }
    }
  }

  // Auth Helpers
  if (req.auth) {
    switch (req.auth.type) {
      case 'bearer':
        if (req.auth.bearer?.token) {
          parts.push(`--header 'Authorization: Bearer ${escapeShellSingleQuotes(req.auth.bearer.token)}'`);
        }
        break;
      case 'basic':
        if (req.auth.basic) {
          parts.push(`--user '${escapeShellSingleQuotes(req.auth.basic.username || '')}:${escapeShellSingleQuotes(req.auth.basic.password || '')}'`);
        }
        break;
      case 'apikey':
        if (req.auth.apiKey?.addTo === 'header' && req.auth.apiKey.key) {
          parts.push(`--header '${escapeShellSingleQuotes(req.auth.apiKey.key)}: ${escapeShellSingleQuotes(req.auth.apiKey.value || '')}'`);
        }
        break;
      case 'custom':
        if (req.auth.custom?.headerName) {
          parts.push(`--header '${escapeShellSingleQuotes(req.auth.custom.headerName)}: ${escapeShellSingleQuotes(req.auth.custom.headerValue || '')}'`);
        }
        break;
    }
  }

  // Body
  switch (req.bodyType) {
    case 'json':
    case 'raw':
      if (req.bodyContent) {
        parts.push(`--data-raw '${escapeShellSingleQuotes(req.bodyContent)}'`);
      }
      break;

    case 'graphql':
      if (req.bodyGraphQL?.query) {
        const payload = JSON.stringify({
          query: req.bodyGraphQL.query,
          variables: req.bodyGraphQL.variables ? JSON.parse(req.bodyGraphQL.variables) : undefined,
        });
        parts.push(`--data-raw '${escapeShellSingleQuotes(payload)}'`);
      }
      break;

    case 'x-www-form-urlencoded':
      if (req.bodyUrlEncoded && req.bodyUrlEncoded.length > 0) {
        for (const item of req.bodyUrlEncoded) {
          if (item.isEnabled && item.key) {
            parts.push(`--data-urlencode '${escapeShellSingleQuotes(item.key)}=${escapeShellSingleQuotes(item.value || '')}'`);
          }
        }
      }
      break;

    case 'form-data':
      if (req.bodyFormData && req.bodyFormData.length > 0) {
        for (const item of req.bodyFormData) {
          if (item.isEnabled && item.key) {
            if (item.type === 'file') {
              parts.push(`--form '${escapeShellSingleQuotes(item.key)}=@${escapeShellSingleQuotes(item.fileName || 'file.bin')}'`);
            } else {
              parts.push(`--form '${escapeShellSingleQuotes(item.key)}=${escapeShellSingleQuotes(item.value || '')}'`);
            }
          }
        }
      }
      break;
  }

  return parts.join(' \\\n  ');
}
