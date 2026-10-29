export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type BodyType = 'none' | 'json' | 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'graphql';

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2' | 'custom';

export interface KeyValueItem {
  id: string;
  key: string;
  value: string;
  isEnabled: boolean;
  description?: string;
}

export interface FormDataItem extends KeyValueItem {
  type: 'text' | 'file';
  fileName?: string;
  fileBase64?: string;
  mimeType?: string;
}

export interface BearerAuthConfig {
  token: string;
}

export interface BasicAuthConfig {
  username: string;
  password: string;
}

export interface ApiKeyAuthConfig {
  key: string;
  value: string;
  addTo: 'header' | 'query';
}

export interface OAuth2AuthConfig {
  grantType: 'client_credentials' | 'authorization_code';
  tokenUrl: string;
  authUrl?: string;
  clientId: string;
  clientSecret: string;
  scope?: string;
  accessToken?: string;
}

export interface CustomHeaderAuthConfig {
  headerName: string;
  headerValue: string;
}

export interface AuthConfig {
  type: AuthType;
  bearer?: BearerAuthConfig;
  basic?: BasicAuthConfig;
  apiKey?: ApiKeyAuthConfig;
  oauth2?: OAuth2AuthConfig;
  custom?: CustomHeaderAuthConfig;
}

export interface RequestSettings {
  timeoutMs: number;
  followRedirects: boolean;
  maxRedirects: number;
  verifySsl: boolean;
}

export interface GraphQLBody {
  query: string;
  variables?: string;
}

export interface ApiRequestData {
  id?: string;
  collectionId?: string;
  folderId?: string | null;
  name: string;
  method: HttpMethod;
  url: string;
  queryParams: KeyValueItem[];
  headers: KeyValueItem[];
  pathVars?: KeyValueItem[];
  auth: AuthConfig;
  bodyType: BodyType;
  bodyContent?: string;
  bodyFormData?: FormDataItem[];
  bodyUrlEncoded?: KeyValueItem[];
  bodyGraphQL?: GraphQLBody;
  preScript?: string;
  postScript?: string;
  settings?: Partial<RequestSettings>;
}

export interface TimingBreakdown {
  dns?: number;
  tcp?: number;
  tls?: number;
  ttfb?: number;
  download?: number;
  total: number;
}

export interface CookieItem {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: string;
  httpOnly?: boolean;
  secure?: boolean;
}

export interface ApiResponseData {
  status: number;
  statusText: string;
  headers: Record<string, string | string[]>;
  cookies: CookieItem[];
  body: string;
  size: number;
  time: number;
  timings?: TimingBreakdown;
  contentType?: string;
  error?: string;
}

export interface EnvironmentVariable {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  isEnabled: boolean;
}

export interface DatabaseConnectionConfig {
  type: 'postgres' | 'mysql';
  host: string;
  port?: string | number;
  database: string;
  username: string;
  password?: string;
  ssl?: boolean;
}

export interface Environment {
  id: string;
  workspaceId: string;
  name: string;
  variables: EnvironmentVariable[];
  dbConnection?: DatabaseConnectionConfig;
  createdAt?: string;
  updatedAt?: string;
}

export interface Folder {
  id: string;
  collectionId: string;
  parentId?: string | null;
  name: string;
  description?: string;
  sortOrder: number;
  requests: ApiRequestData[];
  children?: Folder[];
}

export interface Collection {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  auth?: AuthConfig;
  variables?: Record<string, string>;
  sortOrder: number;
  folders: Folder[];
  requests: ApiRequestData[];
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

