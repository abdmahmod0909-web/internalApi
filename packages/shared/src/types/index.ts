export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';

export type BodyType = 'none' | 'json' | 'raw' | 'form-data' | 'x-www-form-urlencoded' | 'graphql';

export type AuthType = 'inherit' | 'none' | 'bearer' | 'basic' | 'apikey' | 'oauth2' | 'custom';

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

export interface CollectionVariable {
  id: string;
  key: string;
  value: string;
  currentValue?: string;
  isSecret?: boolean;
  isEnabled?: boolean;
  description?: string;
}

export interface Collection {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  auth?: AuthConfig;
  variables?: Record<string, string>;
  collectionVariables?: CollectionVariable[];
  preScript?: string;
  postScript?: string;
  sortOrder: number;
  folders: Folder[];
  requests: ApiRequestData[];
  createdAt?: string;
  updatedAt?: string;
}

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  isDefault?: boolean;
}

export type FlowNodeType = 'start' | 'request' | 'extract' | 'delay' | 'condition' | 'output';

export interface FlowNode {
  id: string;
  type: FlowNodeType;
  title: string;
  config: {
    // start node
    initialVars?: Array<{ key: string; value: string }>;
    // request node
    method?: HttpMethod;
    url?: string;
    headers?: KeyValueItem[];
    bodyType?: BodyType;
    bodyContent?: string;
    collectionRequestId?: string;
    // extract node
    extractVarName?: string;
    extractPath?: string; // e.g. "token", "data.user.id", "status"
    // delay node
    delayMs?: number;
    // condition node
    conditionField?: string; // e.g. "response.status" or "token"
    conditionOperator?: '==' | '!=' | '>' | '<' | 'contains';
    conditionValue?: string;
    // output/log node
    logMessage?: string;
  };
}

export interface Flow {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  nodes: FlowNode[];
  createdAt?: string;
  updatedAt?: string;
}

export interface FlowStepLog {
  nodeId: string;
  nodeTitle: string;
  type: FlowNodeType;
  status: 'pending' | 'running' | 'success' | 'failed' | 'skipped';
  durationMs?: number;
  httpStatus?: number;
  message?: string;
  data?: any;
}

export interface FlowExecutionReport {
  flowId: string;
  status: 'idle' | 'running' | 'success' | 'failed';
  currentStepIndex: number;
  totalSteps: number;
  startTime?: string;
  endTime?: string;
  durationMs?: number;
  variables: Record<string, any>;
  logs: FlowStepLog[];
}

// User & Authentication Types (Admin-managed, Login-only)
export type UserRole = 'admin' | 'editor' | 'viewer';

export interface UserPermissions {
  canAdd: boolean;
  canEdit: boolean;
  canDelete: boolean;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  workspaceIds?: string[];
  permissions?: UserPermissions;
}

export function resolveUserPermissions(user?: { role?: UserRole; permissions?: Partial<UserPermissions> } | null): UserPermissions {
  if (!user) {
    return { canAdd: true, canEdit: true, canDelete: true };
  }
  if (user.role === 'admin') {
    return { canAdd: true, canEdit: true, canDelete: true };
  }
  const roleDefaults: Record<UserRole, UserPermissions> = {
    admin: { canAdd: true, canEdit: true, canDelete: true },
    editor: { canAdd: true, canEdit: true, canDelete: true },
    viewer: { canAdd: false, canEdit: false, canDelete: false },
  };
  const base = roleDefaults[user.role as UserRole] || roleDefaults.editor;
  return {
    canAdd: user.permissions?.canAdd !== undefined ? Boolean(user.permissions.canAdd) : base.canAdd,
    canEdit: user.permissions?.canEdit !== undefined ? Boolean(user.permissions.canEdit) : base.canEdit,
    canDelete: user.permissions?.canDelete !== undefined ? Boolean(user.permissions.canDelete) : base.canDelete,
  };
}

export interface AuthSession {
  user: User;
  token: string;
}



