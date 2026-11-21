import type {
  Collection,
  Folder,
  ApiRequestData,
  KeyValueItem,
  FormDataItem,
} from './types/index.js';

export interface PostmanExportOptions {
  includeVariables?: boolean;
}

/**
 * Converts an InternalAPI Collection into a standard Postman Collection v2.1.0 format JSON.
 * Compatible with Postman, Insomnia, Bruno, and InternalAPI.
 */
export function exportPostmanCollection(
  collection: Collection,
  options: PostmanExportOptions = { includeVariables: true }
): Record<string, any> {
  const postmanItems: any[] = [];

  // 1. Convert Root Requests
  if (Array.isArray(collection.requests)) {
    for (const req of collection.requests) {
      // Only include requests that do not belong to a folder
      if (!req.folderId) {
        postmanItems.push(convertRequestToPostmanItem(req));
      }
    }
  }

  // 2. Convert Folders (recursively or flat)
  if (Array.isArray(collection.folders)) {
    for (const folder of collection.folders) {
      if (!folder.parentId) {
        postmanItems.push(convertFolderToPostmanItem(folder, collection.folders));
      }
    }
  }

  // 3. Convert Variables
  const variables: any[] = [];
  if (options.includeVariables) {
    if (Array.isArray(collection.collectionVariables)) {
      for (const cv of collection.collectionVariables) {
        if (cv.key) {
          variables.push({
            key: cv.key,
            value: cv.value || '',
            type: cv.isSecret ? 'secret' : 'string',
            disabled: cv.isEnabled === false,
            description: cv.description || '',
          });
        }
      }
    } else if (collection.variables) {
      for (const [key, value] of Object.entries(collection.variables)) {
        variables.push({
          key,
          value,
          type: 'string',
        });
      }
    }
  }

  // 4. Convert Collection Scripts (event)
  const collectionEvents: any[] = [];
  if (collection.preScript && collection.preScript.trim()) {
    collectionEvents.push({
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: collection.preScript.split('\n'),
      },
    });
  }
  if (collection.postScript && collection.postScript.trim()) {
    collectionEvents.push({
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: collection.postScript.split('\n'),
      },
    });
  }

  // 5. Convert Collection Auth (if any)
  let authObj: any = undefined;
  if (collection.auth && collection.auth.type !== 'none') {
    authObj = convertAuthToPostman(collection.auth);
  }

  return {
    info: {
      _postman_id: collection.id || `col-${Date.now()}`,
      name: collection.name || 'Exported Collection',
      description: collection.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
      _exporter_id: 'internalapi-client',
    },
    item: postmanItems,
    event: collectionEvents.length > 0 ? collectionEvents : undefined,
    auth: authObj,
    variable: variables.length > 0 ? variables : undefined,
  };
}

/**
 * Converts an internal folder into a Postman folder item.
 */
function convertFolderToPostmanItem(folder: Folder, allFolders: Folder[]): any {
  const folderItems: any[] = [];

  // Folder's requests
  if (Array.isArray(folder.requests)) {
    for (const req of folder.requests) {
      folderItems.push(convertRequestToPostmanItem(req));
    }
  }

  // Child folders
  const childFolders = allFolders.filter((f) => f.parentId === folder.id);
  for (const child of childFolders) {
    folderItems.push(convertFolderToPostmanItem(child, allFolders));
  }

  return {
    name: folder.name || 'Untitled Folder',
    description: folder.description || '',
    item: folderItems,
  };
}

/**
 * Converts an internal ApiRequestData object into a Postman item.
 */
function convertRequestToPostmanItem(req: ApiRequestData): any {
  // Headers
  const headerList: any[] = [];
  if (Array.isArray(req.headers)) {
    for (const h of req.headers) {
      if (h.key) {
        headerList.push({
          key: h.key,
          value: h.value || '',
          disabled: !h.isEnabled,
          description: h.description || '',
        });
      }
    }
  }

  // Query Params
  const queryList: any[] = [];
  if (Array.isArray(req.queryParams)) {
    for (const q of req.queryParams) {
      if (q.key) {
        queryList.push({
          key: q.key,
          value: q.value || '',
          disabled: !q.isEnabled,
          description: q.description || '',
        });
      }
    }
  }

  // URL Object
  const urlObj: any = {
    raw: req.url || '',
    query: queryList.length > 0 ? queryList : undefined,
  };

  // Body
  let bodyObj: any = undefined;
  if (req.bodyType && req.bodyType !== 'none') {
    if (req.bodyType === 'json') {
      bodyObj = {
        mode: 'raw',
        raw: req.bodyContent || '',
        options: {
          raw: {
            language: 'json',
          },
        },
      };
    } else if (req.bodyType === 'raw') {
      bodyObj = {
        mode: 'raw',
        raw: req.bodyContent || '',
      };
    } else if (req.bodyType === 'x-www-form-urlencoded') {
      const urlencoded: any[] = [];
      if (Array.isArray(req.bodyUrlEncoded)) {
        for (const item of req.bodyUrlEncoded) {
          if (item.key) {
            urlencoded.push({
              key: item.key,
              value: item.value || '',
              disabled: !item.isEnabled,
              description: item.description || '',
            });
          }
        }
      }
      bodyObj = {
        mode: 'urlencoded',
        urlencoded,
      };
    } else if (req.bodyType === 'form-data') {
      const formdata: any[] = [];
      if (Array.isArray(req.bodyFormData)) {
        for (const item of req.bodyFormData) {
          if (item.key) {
            formdata.push({
              key: item.key,
              value: item.value || '',
              type: item.type === 'file' ? 'file' : 'text',
              disabled: !item.isEnabled,
              description: item.description || '',
            });
          }
        }
      }
      bodyObj = {
        mode: 'formdata',
        formdata,
      };
    } else if (req.bodyType === 'graphql' && req.bodyGraphQL) {
      bodyObj = {
        mode: 'graphql',
        graphql: {
          query: req.bodyGraphQL.query || '',
          variables: req.bodyGraphQL.variables || '',
        },
      };
    }
  }

  // Auth
  let authObj: any = undefined;
  if (req.auth && req.auth.type !== 'none') {
    authObj = convertAuthToPostman(req.auth);
  }

  // Scripts / Events (Pre-request & Test scripts)
  const events: any[] = [];
  if (req.preScript && req.preScript.trim()) {
    events.push({
      listen: 'prerequest',
      script: {
        type: 'text/javascript',
        exec: req.preScript.split('\n'),
      },
    });
  }
  if (req.postScript && req.postScript.trim()) {
    events.push({
      listen: 'test',
      script: {
        type: 'text/javascript',
        exec: req.postScript.split('\n'),
      },
    });
  }

  return {
    name: req.name || 'Untitled Request',
    event: events.length > 0 ? events : undefined,
    request: {
      method: req.method || 'GET',
      header: headerList,
      body: bodyObj,
      url: urlObj,
      auth: authObj,
      description: '',
    },
    response: [],
  };
}

/**
 * Converts InternalAPI AuthConfig into Postman v2.1 auth schema.
 */
function convertAuthToPostman(auth: any): any {
  if (!auth || auth.type === 'none') return undefined;

  switch (auth.type) {
    case 'bearer':
      return {
        type: 'bearer',
        bearer: [
          {
            key: 'token',
            value: auth.bearer?.token || '',
            type: 'string',
          },
        ],
      };
    case 'basic':
      return {
        type: 'basic',
        basic: [
          {
            key: 'username',
            value: auth.basic?.username || '',
            type: 'string',
          },
          {
            key: 'password',
            value: auth.basic?.password || '',
            type: 'string',
          },
        ],
      };
    case 'apikey':
      return {
        type: 'apikey',
        apikey: [
          {
            key: 'key',
            value: auth.apiKey?.key || '',
            type: 'string',
          },
          {
            key: 'value',
            value: auth.apiKey?.value || '',
            type: 'string',
          },
          {
            key: 'in',
            value: auth.apiKey?.addTo || 'header',
            type: 'string',
          },
        ],
      };
    case 'oauth2':
      return {
        type: 'oauth2',
        oauth2: [
          {
            key: 'grant_type',
            value: auth.oauth2?.grantType || 'client_credentials',
            type: 'string',
          },
          {
            key: 'accessTokenUrl',
            value: auth.oauth2?.tokenUrl || '',
            type: 'string',
          },
          {
            key: 'clientId',
            value: auth.oauth2?.clientId || '',
            type: 'string',
          },
          {
            key: 'clientSecret',
            value: auth.oauth2?.clientSecret || '',
            type: 'string',
          },
        ],
      };
    default:
      return undefined;
  }
}
