import type { OAuth2AuthConfig } from '@internalapi/shared';

export interface OAuth2TokenResponse {
  access_token: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  refresh_token?: string;
}

export async function fetchOAuth2ClientCredentials(
  config: OAuth2AuthConfig
): Promise<OAuth2TokenResponse> {
  if (!config.tokenUrl) {
    throw new Error('Token URL is required for OAuth 2.0');
  }

  const credentials = Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64');
  const params = new URLSearchParams();
  params.append('grant_type', 'client_credentials');
  if (config.scope) {
    params.append('scope', config.scope);
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
      Accept: 'application/json',
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OAuth 2.0 Token request failed (${response.status}): ${errorText}`);
  }

  return (await response.json()) as OAuth2TokenResponse;
}

