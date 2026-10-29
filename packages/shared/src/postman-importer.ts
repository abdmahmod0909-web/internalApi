import type { Collection, Folder, ApiRequestData, HttpMethod, KeyValueItem, FormDataItem } from './types/index.js';

export function isPostmanCollection(json: any): boolean {
  return json && (json.info?.schema?.includes('collection.json') || (json.info?.name && Array.isArray(json.item)));
}

/**
 * Converts a Postman v2.1 URL representation into a standard URL string.
 */
function extractPostmanUrl(urlObj: any): { url: string; queryParams: KeyValueItem[] } {
  const queryParams: KeyValueItem[] = [];

  if (!urlObj) return { url: '', queryParams };

  if (typeof urlObj === 'string') {
    return { url: urlObj, queryParams };
  }

  const rawUrl = urlObj.raw || '';

  if (Array.isArray(urlObj.query)) {
    for (const q of urlObj.query) {
      if (q.key) {
        queryParams.push({
          id: `qp-${Date.now()}-${Math.random()}`,
          key: q.key,
          value: q.value || '',
          isEnabled: !q.disabled,
          description: q.description,
        });
      }
    }
  }

  return { url: rawUrl, queryParams };
}

/**
 * Converts a Postman v2.1 item into an InternalAPI ApiRequestData object.
 */
function convertPostmanItem(item: any, collectionId: string, folderId: string | null = null): ApiRequestData {
  const req = item.request || {};
  const { url, queryParams } = extractPostmanUrl(req.url);

  // Headers
  const headers: KeyValueItem[] = [];
  if (Array.isArray(req.header)) {
    for (const h of req.header) {
      if (h.key) {
        headers.push({
          id: `h-${Date.now()}-${Math.random()}`,
          key: h.key,
          value: h.value || '',
          isEnabled: !h.disabled,
          description: h.description,
        });
      }
    }
  }

  // Method
  const method = (req.method || 'GET').toUpperCase() as HttpMethod;

  // Body
  let bodyType: ApiRequestData['bodyType'] = 'none';
  let bodyContent = '';
  const bodyFormData: FormDataItem[] = [];
  const bodyUrlEncoded: KeyValueItem[] = [];

  if (req.body) {
    const mode = req.body.mode;
    if (mode === 'raw') {
      bodyContent = req.body.raw || '';
      bodyType = 'raw';
      try {
        JSON.parse(bodyContent);
        bodyType = 'json';
      } catch {
        // keep raw
      }
    } else if (mode === 'urlencoded' && Array.isArray(req.body.urlencoded)) {
      bodyType = 'x-www-form-urlencoded';
      for (const ue of req.body.urlencoded) {
        bodyUrlEncoded.push({
          id: `ue-${Date.now()}-${Math.random()}`,
          key: ue.key,
          value: ue.value || '',
          isEnabled: !ue.disabled,
        });
      }
    } else if (mode === 'formdata' && Array.isArray(req.body.formdata)) {
      bodyType = 'form-data';
      for (const fd of req.body.formdata) {
        bodyFormData.push({
          id: `fd-${Date.now()}-${Math.random()}`,
          key: fd.key,
          value: fd.value || '',
          type: fd.type === 'file' ? 'file' : 'text',
          isEnabled: !fd.disabled,
        });
      }
    } else if (mode === 'graphql' && req.body.graphql) {
      bodyType = 'graphql';
      bodyContent = req.body.graphql.query || '';
    }
  }

  // Scripts (events)
  let preScript = '';
  let postScript = '';
  if (Array.isArray(item.event)) {
    for (const evt of item.event) {
      const scriptCode = Array.isArray(evt.script?.exec) ? evt.script.exec.join('\n') : evt.script?.exec || '';
      if (evt.listen === 'prerequest') {
        preScript = scriptCode;
      } else if (evt.listen === 'test') {
        postScript = scriptCode;
      }
    }
  }

  return {
    id: `req-${Date.now()}-${Math.random()}`,
    collectionId,
    folderId,
    name: item.name || 'Untitled Request',
    method,
    url,
    queryParams: queryParams.length > 0 ? queryParams : [{ id: '1', key: '', value: '', isEnabled: true }],
    headers: headers.length > 0 ? headers : [{ id: '1', key: '', value: '', isEnabled: true }],
    auth: { type: 'none' },
    bodyType,
    bodyContent,
    bodyFormData: bodyFormData.length > 0 ? bodyFormData : [],
    bodyUrlEncoded: bodyUrlEncoded.length > 0 ? bodyUrlEncoded : [],
    preScript,
    postScript,
  };
}

/**
 * Parses a Postman Collection v2.1 JSON into an InternalAPI Collection.
 */
export function importPostmanCollection(postmanJson: any, workspaceId: string): Collection {
  const collectionId = `col-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const name = postmanJson.info?.name || 'Imported Postman Collection';
  const description = postmanJson.info?.description || '';

  const folders: Folder[] = [];
  const directRequests: ApiRequestData[] = [];

  const rawItems = postmanJson.item || [];

  for (const item of rawItems) {
    if (Array.isArray(item.item)) {
      // It's a folder!
      const folderId = `fld-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const folderRequests: ApiRequestData[] = [];

      for (const subItem of item.item) {
        if (!Array.isArray(subItem.item)) {
          folderRequests.push(convertPostmanItem(subItem, collectionId, folderId));
        }
      }

      folders.push({
        id: folderId,
        collectionId,
        name: item.name || 'Folder',
        description: item.description || '',
        sortOrder: folders.length,
        requests: folderRequests,
      });
    } else {
      // Direct request under collection
      directRequests.push(convertPostmanItem(item, collectionId, null));
    }
  }

  return {
    id: collectionId,
    workspaceId,
    name,
    description,
    sortOrder: 0,
    folders,
    requests: directRequests,
  };
}
