import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { KeyValueEditor } from './KeyValueEditor.js';
import { FormDataEditor } from './FormDataEditor.js';
import { Play, Save, Loader2, Sparkles, Key, Terminal, Check, Copy } from 'lucide-react';
import { isCurlCommand, parseCurlCommand, generateCurlCommand } from '@internalapi/shared';
import type { HttpMethod, BodyType, AuthType } from '@internalapi/shared';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const RequestBuilder: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'params' | 'auth' | 'headers' | 'body' | 'prereq' | 'tests' | 'settings'>('params');
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [curlImportNotice, setCurlImportNotice] = useState<string | null>(null);
  const [isCurlCopied, setIsCurlCopied] = useState(false);

  const { tabs, activeTabId, updateActiveRequest, sendRequest, saveCurrentRequest } = useAppStore();
  const currentTab = tabs.find((t) => t.id === activeTabId);

  if (!currentTab) {
    return <div className="p-8 text-center text-gray-500">No active request tab.</div>;
  }

  const req = currentTab.request;

  // Handle cURL import
  const applyCurlImport = (curlText: string) => {
    try {
      const parsed = parseCurlCommand(curlText);
      updateActiveRequest((prev) => ({
        ...prev,
        ...parsed,
        id: prev.id,
        collectionId: prev.collectionId,
        folderId: prev.folderId,
      }));
      setCurlImportNotice(`cURL imported: ${parsed.method} with ${parsed.headers?.length || 0} headers`);
      setTimeout(() => setCurlImportNotice(null), 4000);
    } catch (e: any) {
      console.error('Failed to parse cURL:', e);
    }
  };

  const handleUrlPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (isCurlCommand(pasted)) {
      e.preventDefault();
      applyCurlImport(pasted);
    }
  };

  const handleUrlChange = (value: string) => {
    if (isCurlCommand(value)) {
      applyCurlImport(value);
      return;
    }
    updateActiveRequest((prev) => ({ ...prev, url: value }));
  };

  // Auto-sync query params into URL string
  const handleQueryParamsChange = (items: any[]) => {
    updateActiveRequest((prev) => {
      let urlBase = prev.url.split('?')[0];
      const enabled = items.filter((i) => i.isEnabled && i.key);
      let newUrl = urlBase;
      if (enabled.length > 0) {
        const search = enabled.map((i) => `${encodeURIComponent(i.key)}=${encodeURIComponent(i.value || '')}`).join('&');
        newUrl = `${urlBase}?${search}`;
      }
      return { ...prev, queryParams: items, url: newUrl };
    });
  };

  // Prettify JSON body
  const handlePrettifyJson = () => {
    try {
      if (req.bodyContent) {
        const parsed = JSON.parse(req.bodyContent);
        updateActiveRequest((prev) => ({
          ...prev,
          bodyContent: JSON.stringify(parsed, null, 2),
        }));
      }
    } catch {
      alert('Invalid JSON content');
    }
  };

  // Fetch OAuth 2.0 Token
  const handleFetchOAuthToken = async () => {
    if (!req.auth?.oauth2?.tokenUrl) {
      alert('Please enter Token URL');
      return;
    }
    setIsFetchingToken(true);
    try {
      const res = await fetch('/api/proxy/oauth/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req.auth.oauth2),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Token request failed');

      updateActiveRequest((prev) => ({
        ...prev,
        auth: {
          ...prev.auth,
          oauth2: {
            ...prev.auth?.oauth2!,
            accessToken: data.access_token,
          },
        },
      }));
      alert('Access Token acquired successfully!');
    } catch (err: any) {
      alert(err.message || 'Failed to fetch OAuth token');
    } finally {
      setIsFetchingToken(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-950">
      {/* Header Row: Editable Request Title & Save / Copy cURL Actions */}
      <div className="px-3 py-2 border-b border-gray-800 flex items-center justify-between gap-2 bg-gray-950/80">
        <div className="flex items-center space-x-2 flex-1 min-w-0">
          <input
            type="text"
            value={req.name ?? ''}
            onChange={(e) => {
              const newName = e.target.value;
              updateActiveRequest((prev) => ({ ...prev, name: newName }));
            }}
            placeholder="Untitled Request"
            className="bg-transparent hover:bg-gray-900 focus:bg-gray-900 border border-transparent hover:border-gray-800 focus:border-orange-500 rounded px-2 py-1 text-sm font-semibold text-gray-100 placeholder-gray-500 outline-none transition-colors w-full max-w-sm truncate"
            title="Click to rename request"
          />
          {currentTab.isDirty && (
            <span
              className="w-2 h-2 rounded-full bg-orange-500 shrink-0"
              title="Unsaved changes (Ctrl+S to save)"
            />
          )}
        </div>

        {/* Action Buttons: Save + Copy cURL */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => saveCurrentRequest()}
            className="flex items-center space-x-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-3 py-1.5 rounded border border-gray-700 transition-colors"
            title="Save Request (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5 text-orange-400" />
            <span>Save</span>
          </button>

          <button
            onClick={() => {
              const curl = generateCurlCommand(req);
              navigator.clipboard.writeText(curl);
              setIsCurlCopied(true);
              setTimeout(() => setIsCurlCopied(false), 2000);
            }}
            className={`flex items-center space-x-1 text-xs px-3 py-1.5 rounded border transition-colors ${
              isCurlCopied
                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                : 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-700'
            }`}
            title="Generate and copy as executable cURL command"
          >
            {isCurlCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-gray-400" />}
            <span>{isCurlCopied ? 'Copied!' : 'Copy cURL'}</span>
          </button>
        </div>
      </div>

      {/* URL Execution Bar: Method + URL + Send (Unified Postman-style bar) */}
      <div className="p-3 border-b border-gray-800 flex items-center space-x-2">
        <div className="flex flex-1 min-w-0 rounded-md bg-gray-900 border border-gray-700 focus-within:border-orange-500 transition-colors overflow-hidden">
          <select
            value={req.method}
            onChange={(e) =>
              updateActiveRequest((prev) => ({ ...prev, method: e.target.value as HttpMethod }))
            }
            className="bg-gray-850 hover:bg-gray-800 border-r border-gray-700 font-bold text-xs px-3 py-2 text-orange-400 outline-none cursor-pointer shrink-0"
          >
            {HTTP_METHODS.map((m) => (
              <option key={m} value={m} className="bg-gray-900 text-gray-200">
                {m}
              </option>
            ))}
          </select>

          {/* URL Input */}
          <input
            type="text"
            placeholder="Enter request URL or paste cURL command here..."
            value={req.url}
            onChange={(e) => handleUrlChange(e.target.value)}
            onPaste={handleUrlPaste}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && req.url?.trim()) {
                sendRequest();
              }
            }}
            className="flex-1 bg-transparent px-3 py-2 text-xs text-gray-100 placeholder-gray-500 font-mono outline-none min-w-0"
          />

          {/* Clean Integrated cURL Button */}
          <button
            onClick={async () => {
              try {
                const text = await navigator.clipboard.readText();
                if (text && isCurlCommand(text)) {
                  applyCurlImport(text);
                  return;
                }
              } catch {}
              const promptCurl = prompt('Paste your cURL command here:');
              if (promptCurl && isCurlCommand(promptCurl)) {
                applyCurlImport(promptCurl);
              } else if (promptCurl) {
                alert('Input does not start with curl');
              }
            }}
            className="flex items-center space-x-1 px-2.5 py-1 text-gray-400 hover:text-orange-400 hover:bg-gray-800 rounded transition-colors shrink-0 my-1 mr-1"
            title="Import or paste cURL command"
          >
            <Terminal className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[11px] font-medium hidden sm:inline">cURL</span>
          </button>
        </div>

        {/* Send Button */}
        <button
          onClick={() => {
            if (req.url?.trim()) {
              sendRequest();
            }
          }}
          disabled={currentTab.isLoading || !req.url?.trim()}
          className="flex items-center justify-center space-x-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-orange-600 text-white text-xs font-semibold px-5 py-2 rounded-md transition-colors shrink-0 shadow-sm min-w-[76px]"
          title={!req.url?.trim() ? 'Enter a URL to send request' : 'Send Request'}
        >
          {currentTab.isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current" />
          )}
          <span>Send</span>
        </button>
      </div>

      {/* Auto-imported cURL Notice Banner */}
      {curlImportNotice && (
        <div className="bg-emerald-950/70 border-b border-emerald-800/80 px-4 py-2 flex items-center space-x-2 text-xs text-emerald-300 animate-fadeIn">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{curlImportNotice}</span>
        </div>
      )}

      {/* Sub Tabs Bar */}
      <div className="flex border-b border-gray-800 text-xs font-medium text-gray-400 px-3 bg-gray-950">
        {[
          { key: 'params', label: `Params ${req.queryParams?.filter((p) => p.isEnabled && p.key).length ? `(${req.queryParams.filter((p) => p.isEnabled && p.key).length})` : ''}` },
          { key: 'auth', label: `Auth ${req.auth?.type !== 'none' ? '•' : ''}` },
          { key: 'headers', label: `Headers ${req.headers?.filter((h) => h.isEnabled && h.key).length ? `(${req.headers.filter((h) => h.isEnabled && h.key).length})` : ''}` },
          { key: 'body', label: `Body ${req.bodyType !== 'none' ? '•' : ''}` },
          { key: 'prereq', label: `Pre-req ${req.preScript ? '•' : ''}` },
          { key: 'tests', label: `Tests ${req.postScript ? '•' : ''}` },
          { key: 'settings', label: 'Settings' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveSubTab(tab.key as any)}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeSubTab === tab.key
                ? 'border-orange-500 text-orange-500'
                : 'border-transparent hover:text-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Sub Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeSubTab === 'params' && (
          <div className="p-3">
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Query Parameters</h3>
            <KeyValueEditor
              items={req.queryParams || []}
              onChange={handleQueryParamsChange}
              keyPlaceholder="Parameter"
              valuePlaceholder="Value"
            />
          </div>
        )}

        {activeSubTab === 'auth' && (
          <div className="p-4 space-y-4 max-w-lg text-xs">
            <div>
              <label className="block text-gray-400 mb-1 font-medium">Type</label>
              <select
                value={req.auth?.type || 'none'}
                onChange={(e) =>
                  updateActiveRequest((prev) => ({
                    ...prev,
                    auth: { ...prev.auth, type: e.target.value as AuthType },
                  }))
                }
                className="bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-gray-200 outline-none w-full"
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apikey">API Key</option>
                <option value="oauth2">OAuth 2.0 (Client Credentials)</option>
                <option value="custom">Custom Header</option>
              </select>
            </div>

            {req.auth?.type === 'bearer' && (
              <div>
                <label className="block text-gray-400 mb-1">Token</label>
                <input
                  type="text"
                  placeholder="Bearer token or {{token}}"
                  value={req.auth.bearer?.token || ''}
                  onChange={(e) =>
                    updateActiveRequest((prev) => ({
                      ...prev,
                      auth: {
                        ...prev.auth,
                        bearer: { token: e.target.value },
                      },
                    }))
                  }
                  className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-gray-100 font-mono outline-none"
                />
              </div>
            )}

            {req.auth?.type === 'basic' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-400 mb-1">Username</label>
                  <input
                    type="text"
                    value={req.auth.basic?.username || ''}
                    onChange={(e) =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        auth: {
                          ...prev.auth,
                          basic: { username: e.target.value, password: prev.auth.basic?.password || '' },
                        },
                      }))
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-gray-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Password</label>
                  <input
                    type="password"
                    value={req.auth.basic?.password || ''}
                    onChange={(e) =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        auth: {
                          ...prev.auth,
                          basic: { username: prev.auth.basic?.username || '', password: e.target.value },
                        },
                      }))
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-gray-100 outline-none"
                  />
                </div>
              </div>
            )}

            {req.auth?.type === 'apikey' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-400 mb-1">Key</label>
                  <input
                    type="text"
                    placeholder="X-API-Key"
                    value={req.auth.apiKey?.key || ''}
                    onChange={(e) =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        auth: {
                          ...prev.auth,
                          apiKey: {
                            key: e.target.value,
                            value: prev.auth.apiKey?.value || '',
                            addTo: prev.auth.apiKey?.addTo || 'header',
                          },
                        },
                      }))
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-gray-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Value</label>
                  <input
                    type="text"
                    placeholder="api_key_secret_value"
                    value={req.auth.apiKey?.value || ''}
                    onChange={(e) =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        auth: {
                          ...prev.auth,
                          apiKey: {
                            key: prev.auth.apiKey?.key || '',
                            value: e.target.value,
                            addTo: prev.auth.apiKey?.addTo || 'header',
                          },
                        },
                      }))
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-gray-100 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Add To</label>
                  <select
                    value={req.auth.apiKey?.addTo || 'header'}
                    onChange={(e) =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        auth: {
                          ...prev.auth,
                          apiKey: {
                            key: prev.auth.apiKey?.key || '',
                            value: prev.auth.apiKey?.value || '',
                            addTo: e.target.value as 'header' | 'query',
                          },
                        },
                      }))
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded px-2.5 py-1.5 text-gray-200 outline-none"
                  >
                    <option value="header">Header</option>
                    <option value="query">Query Params</option>
                  </select>
                </div>
              </div>
            )}

            {req.auth?.type === 'oauth2' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-400 mb-1">Token URL</label>
                  <input
                    type="text"
                    placeholder="https://auth.company.com/oauth/token"
                    value={req.auth.oauth2?.tokenUrl || ''}
                    onChange={(e) =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        auth: {
                          ...prev.auth,
                          oauth2: {
                            ...prev.auth.oauth2!,
                            tokenUrl: e.target.value,
                            grantType: 'client_credentials',
                          },
                        },
                      }))
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-gray-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Client ID</label>
                  <input
                    type="text"
                    value={req.auth.oauth2?.clientId || ''}
                    onChange={(e) =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        auth: {
                          ...prev.auth,
                          oauth2: { ...prev.auth.oauth2!, clientId: e.target.value },
                        },
                      }))
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-gray-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Client Secret</label>
                  <input
                    type="password"
                    value={req.auth.oauth2?.clientSecret || ''}
                    onChange={(e) =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        auth: {
                          ...prev.auth,
                          oauth2: { ...prev.auth.oauth2!, clientSecret: e.target.value },
                        },
                      }))
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-gray-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 mb-1">Scope (Optional)</label>
                  <input
                    type="text"
                    value={req.auth.oauth2?.scope || ''}
                    onChange={(e) =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        auth: {
                          ...prev.auth,
                          oauth2: { ...prev.auth.oauth2!, scope: e.target.value },
                        },
                      }))
                    }
                    className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-gray-100 outline-none"
                  />
                </div>
                <div className="pt-2">
                  <button
                    onClick={handleFetchOAuthToken}
                    disabled={isFetchingToken}
                    className="flex items-center space-x-1.5 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white px-3 py-1.5 rounded font-medium"
                  >
                    <Key className="w-3.5 h-3.5" />
                    <span>{isFetchingToken ? 'Acquiring...' : 'Get New Access Token'}</span>
                  </button>
                </div>
                {req.auth.oauth2?.accessToken && (
                  <div className="p-2 bg-emerald-950/40 border border-emerald-800/60 rounded text-[11px] text-emerald-300">
                    Active Access Token available and attached.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'headers' && (
          <div className="p-3">
            <h3 className="text-xs font-semibold text-gray-400 mb-2">Request Headers</h3>
            <KeyValueEditor
              items={req.headers || []}
              onChange={(items) => updateActiveRequest((prev) => ({ ...prev, headers: items }))}
              keyPlaceholder="Header"
              valuePlaceholder="Value"
            />
          </div>
        )}

        {activeSubTab === 'body' && (
          <div className="p-3 flex flex-col h-full">
            {/* Body Type Selectors */}
            <div className="flex items-center space-x-4 mb-3 text-xs">
              {(['none', 'json', 'raw', 'form-data', 'x-www-form-urlencoded', 'graphql'] as BodyType[]).map((type) => (
                <label key={type} className="flex items-center space-x-1.5 text-gray-300 cursor-pointer">
                  <input
                    type="radio"
                    name="bodyType"
                    checked={req.bodyType === type}
                    onChange={() => updateActiveRequest((prev) => ({ ...prev, bodyType: type }))}
                    className="text-orange-500 focus:ring-0"
                  />
                  <span>{type}</span>
                </label>
              ))}

              {req.bodyType === 'json' && (
                <button
                  onClick={handlePrettifyJson}
                  className="flex items-center space-x-1 ml-auto text-orange-400 hover:text-orange-300 text-xs px-2 py-0.5 rounded bg-gray-900 border border-gray-800"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Prettify JSON</span>
                </button>
              )}
            </div>

            {/* Body Editors */}
            {req.bodyType === 'none' && (
              <div className="text-center py-12 text-xs text-gray-500">
                This request does not have a body.
              </div>
            )}

            {(req.bodyType === 'json' || req.bodyType === 'raw') && (
              <div className="flex-1 min-h-[220px]">
                <textarea
                  value={req.bodyContent || ''}
                  onChange={(e) => updateActiveRequest((prev) => ({ ...prev, bodyContent: e.target.value }))}
                  placeholder={req.bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Raw text content'}
                  className="w-full h-full min-h-[220px] bg-gray-900 border border-gray-800 rounded p-3 text-xs text-gray-100 font-mono outline-none focus:border-gray-700 resize-y"
                />
              </div>
            )}

            {req.bodyType === 'form-data' && (
              <div className="flex-1 overflow-y-auto">
                <FormDataEditor
                  items={req.bodyFormData || []}
                  onChange={(items) =>
                    updateActiveRequest((prev) => ({ ...prev, bodyFormData: items }))
                  }
                />
              </div>
            )}

            {req.bodyType === 'x-www-form-urlencoded' && (
              <div className="flex-1 overflow-y-auto">
                <KeyValueEditor
                  items={req.bodyUrlEncoded || []}
                  onChange={(items) =>
                    updateActiveRequest((prev) => ({ ...prev, bodyUrlEncoded: items }))
                  }
                  keyPlaceholder="Parameter"
                  valuePlaceholder="Value"
                />
              </div>
            )}

            {req.bodyType === 'graphql' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">Query</label>
                  <textarea
                    rows={8}
                    value={req.bodyGraphQL?.query || ''}
                    onChange={(e) =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        bodyGraphQL: { ...prev.bodyGraphQL, query: e.target.value },
                      }))
                    }
                    placeholder="query {\n  user {\n    id\n    name\n  }\n}"
                    className="w-full bg-gray-900 border border-gray-800 rounded p-3 text-xs text-gray-100 font-mono outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">GraphQL Variables (JSON)</label>
                  <textarea
                    rows={3}
                    value={req.bodyGraphQL?.variables || ''}
                    onChange={(e) =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        bodyGraphQL: { ...prev.bodyGraphQL, query: prev.bodyGraphQL?.query || '', variables: e.target.value },
                      }))
                    }
                    placeholder='{ "limit": 10 }'
                    className="w-full bg-gray-900 border border-gray-800 rounded p-3 text-xs text-gray-100 font-mono outline-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'prereq' && (
          <div className="flex h-full min-h-[300px]">
            {/* Editor Area */}
            <div className="flex-1 p-3 flex flex-col">
              <div className="text-[11px] text-gray-400 mb-1 flex items-center justify-between">
                <span>Pre-request Script (JavaScript executed before request is sent)</span>
                <span className="text-gray-500 font-mono">pm.environment.*</span>
              </div>
              <textarea
                value={req.preScript || ''}
                onChange={(e) => updateActiveRequest((prev) => ({ ...prev, preScript: e.target.value }))}
                placeholder="// Execute JavaScript before sending the request&#10;pm.environment.set('timestamp', Date.now());"
                className="flex-1 min-h-[250px] bg-gray-900 border border-gray-800 rounded p-3 text-xs text-emerald-300 font-mono outline-none focus:border-gray-700 resize-none leading-relaxed"
              />
            </div>

            {/* Snippets Sidebar */}
            <div className="w-56 border-l border-gray-800/80 p-3 bg-gray-950/50 select-none">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Snippets
              </div>
              <div className="space-y-1 text-xs">
                {[
                  {
                    label: 'Set an environment variable',
                    code: 'pm.environment.set("variable_key", "variable_value");\n',
                  },
                  {
                    label: 'Get an environment variable',
                    code: 'const val = pm.environment.get("variable_key");\n',
                  },
                  {
                    label: 'Clear an environment variable',
                    code: 'pm.environment.unset("variable_key");\n',
                  },
                ].map((snip, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        preScript: (prev.preScript || '') + (prev.preScript ? '\n' : '') + snip.code,
                      }))
                    }
                    className="w-full text-left p-1.5 rounded hover:bg-gray-800 text-orange-400 hover:text-orange-300 transition-colors text-[11px] truncate block"
                  >
                    {snip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'tests' && (
          <div className="flex h-full min-h-[300px]">
            {/* Editor Area */}
            <div className="flex-1 p-3 flex flex-col">
              <div className="text-[11px] text-gray-400 mb-1 flex items-center justify-between">
                <span>Post-response Test Script (Assertions & Variable Extraction)</span>
                <span className="text-gray-500 font-mono">pm.test, pm.expect, pm.response</span>
              </div>
              <textarea
                value={req.postScript || ''}
                onChange={(e) => updateActiveRequest((prev) => ({ ...prev, postScript: e.target.value }))}
                placeholder="// Write tests with assertions&#10;pm.test('Status code is 200', function () {&#10;    pm.response.to.have.status(200);&#10;});"
                className="flex-1 min-h-[250px] bg-gray-900 border border-gray-800 rounded p-3 text-xs text-sky-300 font-mono outline-none focus:border-gray-700 resize-none leading-relaxed"
              />
            </div>

            {/* Snippets Sidebar */}
            <div className="w-56 border-l border-gray-800/80 p-3 bg-gray-950/50 select-none">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-2">
                Snippets
              </div>
              <div className="space-y-1 text-xs">
                {[
                  {
                    label: 'Status code: Code is 200',
                    code: 'pm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});\n',
                  },
                  {
                    label: 'Response body: JSON value check',
                    code: 'pm.test("Response body check", function () {\n    const jsonData = pm.response.json();\n    pm.expect(jsonData).to.have.property("data");\n});\n',
                  },
                  {
                    label: 'Response time is less than 200ms',
                    code: 'pm.test("Response time is less than 200ms", function () {\n    pm.expect(pm.response.responseTime).to.be.below(200);\n});\n',
                  },
                  {
                    label: 'Set env variable from JSON response',
                    code: 'const data = pm.response.json();\npm.environment.set("token", data.token || "value");\n',
                  },
                ].map((snip, i) => (
                  <button
                    key={i}
                    onClick={() =>
                      updateActiveRequest((prev) => ({
                        ...prev,
                        postScript: (prev.postScript || '') + (prev.postScript ? '\n' : '') + snip.code,
                      }))
                    }
                    className="w-full text-left p-1.5 rounded hover:bg-gray-800 text-orange-400 hover:text-orange-300 transition-colors text-[11px] truncate block"
                  >
                    {snip.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'settings' && (
          <div className="p-4 space-y-4 max-w-md text-xs">
            <div>
              <label className="block text-gray-400 mb-1">Request Timeout (ms)</label>
              <input
                type="number"
                value={req.settings?.timeoutMs ?? 30000}
                onChange={(e) =>
                  updateActiveRequest((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, timeoutMs: parseInt(e.target.value, 10) || 30000 },
                  }))
                }
                className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-1.5 text-gray-100 outline-none"
              />
            </div>
            <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={req.settings?.followRedirects ?? true}
                onChange={(e) =>
                  updateActiveRequest((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, followRedirects: e.target.checked },
                  }))
                }
                className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0"
              />
              <span>Follow HTTP Redirects</span>
            </label>
            <label className="flex items-center space-x-2 text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={req.settings?.verifySsl ?? true}
                onChange={(e) =>
                  updateActiveRequest((prev) => ({
                    ...prev,
                    settings: { ...prev.settings, verifySsl: e.target.checked },
                  }))
                }
                className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0"
              />
              <span>Verify SSL / TLS Certificates (Turn off for self-signed certs)</span>
            </label>
          </div>
        )}
      </div>
    </div>
  );
};

