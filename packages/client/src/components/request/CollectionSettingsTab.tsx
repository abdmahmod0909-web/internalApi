import React, { useState, useEffect, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import type { Collection, AuthConfig, AuthType, CollectionVariable } from '@internalapi/shared';
import {
  Folder,
  Save,
  Check,
  Copy,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Code,
  Key,
  Database,
  FileText,
  Clock,
  Layers,
  Sparkles,
  Info,
  CheckCircle2,
} from 'lucide-react';

interface CollectionSettingsTabProps {
  collectionId: string;
}

export const CollectionSettingsTab: React.FC<CollectionSettingsTabProps> = ({ collectionId }) => {
  const { collections, saveCollectionSettings, getUserPermissions, activeWorkspaceId, workspaces } = useAppStore();
  const userPerms = getUserPermissions();

  const originalCollection = useMemo(() => {
    return collections.find((c) => c.id === collectionId);
  }, [collections, collectionId]);

  // Local draft state initialized immediately from store
  const [colDraft, setColDraft] = useState<Collection | null>(() => {
    const col = collections.find((c) => c.id === collectionId);
    return col ? JSON.parse(JSON.stringify(col)) : null;
  });

  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'auth' | 'prereq' | 'tests' | 'variables'>('overview');
  const [descMode, setDescMode] = useState<'write' | 'preview'>('write');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isCopiedId, setIsCopiedId] = useState(false);

  // Auth secrets visibility
  const [showBearerToken, setShowBearerToken] = useState(false);
  const [showBasicPassword, setShowBasicPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [showClientSecret, setShowClientSecret] = useState(false);

  // Sync draft when original collection changes in store
  useEffect(() => {
    if (originalCollection) {
      setColDraft(JSON.parse(JSON.stringify(originalCollection)));
    }
  }, [originalCollection]);

  // Dirty check
  const isDirty = useMemo(() => {
    if (!originalCollection || !colDraft) return false;
    return JSON.stringify(originalCollection) !== JSON.stringify(colDraft);
  }, [originalCollection, colDraft]);

  const handleSave = async () => {
    if (!colDraft || !userPerms.canEdit) return;
    setIsSaving(true);
    const success = await saveCollectionSettings(colDraft);
    setIsSaving(false);
    if (success) {
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2500);
    }
  };

  // Keyboard shortcut Ctrl+S
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [colDraft, userPerms.canEdit]);

  if (!originalCollection || !colDraft) {
    return (
      <div className="flex-1 flex items-center justify-center text-gray-500 text-xs">
        Collection not found or has been deleted.
      </div>
    );
  }

  const handleCopyId = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(colDraft.id);
      setIsCopiedId(true);
      setTimeout(() => setIsCopiedId(false), 2000);
    }
  };

  // Metadata calculations
  const totalFolders = colDraft.folders?.length || 0;
  const directRequests = colDraft.requests?.length || 0;
  const nestedRequests = (colDraft.folders || []).reduce((acc, f) => acc + (f.requests?.length || 0), 0);
  const totalRequests = directRequests + nestedRequests;
  const currentWorkspace = workspaces.find((w) => w.id === (colDraft.workspaceId || activeWorkspaceId));

  // Snippet Insertion Helper
  const insertSnippet = (target: 'pre' | 'post', code: string) => {
    if (target === 'pre') {
      const current = colDraft.preScript || '';
      const updated = current ? `${current}\n\n${code}` : code;
      setColDraft({ ...colDraft, preScript: updated });
    } else {
      const current = colDraft.postScript || '';
      const updated = current ? `${current}\n\n${code}` : code;
      setColDraft({ ...colDraft, postScript: updated });
    }
  };

  // Variables helpers
  const variablesList: CollectionVariable[] = colDraft.collectionVariables || [];

  const handleAddVariable = () => {
    const newVar: CollectionVariable = {
      id: `var-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      key: '',
      value: '',
      currentValue: '',
      isSecret: false,
      isEnabled: true,
      description: '',
    };
    setColDraft({
      ...colDraft,
      collectionVariables: [...variablesList, newVar],
    });
  };

  const handleUpdateVariable = (id: string, updates: Partial<CollectionVariable>) => {
    const nextList = variablesList.map((v) => (v.id === id ? { ...v, ...updates } : v));
    setColDraft({
      ...colDraft,
      collectionVariables: nextList,
    });
  };

  const handleDeleteVariable = (id: string) => {
    const nextList = variablesList.filter((v) => v.id !== id);
    setColDraft({
      ...colDraft,
      collectionVariables: nextList,
    });
  };

  return (
    <div className="flex flex-col h-full bg-gray-950 text-gray-200 overflow-hidden font-sans">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-gray-800 bg-gray-900/60 shrink-0">
        <div className="flex items-center space-x-3 min-w-0">
          <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400 border border-orange-500/20">
            <Folder className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-base font-bold text-white truncate">{colDraft.name}</span>
              {isDirty && (
                <span className="w-2 h-2 rounded-full bg-orange-400 shrink-0" title="Unsaved changes" />
              )}
            </div>
            <p className="text-xs text-gray-400 truncate">
              Collection Configuration &bull; Postman-compatible
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {savedSuccess && (
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved!</span>
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={!isDirty || isSaving || !userPerms.canEdit}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-md transition-all ${
              isDirty && userPerms.canEdit
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-gray-800 text-gray-400 cursor-not-allowed opacity-60'
            }`}
            title="Save Collection Settings (Ctrl+S)"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSaving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </div>

      {/* Subtab Navigation */}
      <div className="flex items-center space-x-1 px-6 border-b border-gray-800 bg-gray-900/30 text-xs shrink-0 select-none">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeSubTab === 'overview'
              ? 'border-orange-500 text-orange-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          <span>Overview</span>
        </button>

        <button
          onClick={() => setActiveSubTab('auth')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeSubTab === 'auth'
              ? 'border-orange-500 text-orange-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Key className="w-3.5 h-3.5" />
          <span>Authorization</span>
          {colDraft.auth && colDraft.auth.type !== 'none' && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('prereq')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeSubTab === 'prereq'
              ? 'border-orange-500 text-orange-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Code className="w-3.5 h-3.5" />
          <span>Pre-request Script</span>
          {Boolean(colDraft.preScript?.trim()) && (
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 ml-1" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('tests')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeSubTab === 'tests'
              ? 'border-orange-500 text-orange-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Tests</span>
          {Boolean(colDraft.postScript?.trim()) && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 ml-1" />
          )}
        </button>

        <button
          onClick={() => setActiveSubTab('variables')}
          className={`flex items-center space-x-1.5 px-4 py-2.5 border-b-2 font-medium transition-colors ${
            activeSubTab === 'variables'
              ? 'border-orange-500 text-orange-400 font-semibold'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Variables</span>
          {variablesList.length > 0 && (
            <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 py-0.2 rounded-full font-mono">
              {variablesList.length}
            </span>
          )}
        </button>
      </div>

      {/* Main Tab Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* ===================== OVERVIEW SUBTAB ===================== */}
        {activeSubTab === 'overview' && (
          <div className="max-w-4xl space-y-6">
            <div>
              <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider mb-1.5">
                Collection Name
              </label>
              <input
                type="text"
                disabled={!userPerms.canEdit}
                value={colDraft.name}
                onChange={(e) => setColDraft({ ...colDraft, name: e.target.value })}
                className="w-full bg-gray-900 border border-gray-800 focus:border-orange-500 rounded px-3 py-2 text-sm text-white outline-none transition-colors"
                placeholder="e.g. Authentication & Customer API"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Description / Documentation
                </label>
                <div className="flex items-center space-x-1 bg-gray-900 border border-gray-800 rounded p-0.5 text-xs">
                  <button
                    onClick={() => setDescMode('write')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      descMode === 'write' ? 'bg-gray-800 text-white font-medium' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Edit (Markdown)
                  </button>
                  <button
                    onClick={() => setDescMode('preview')}
                    className={`px-2 py-0.5 rounded transition-colors ${
                      descMode === 'preview' ? 'bg-gray-800 text-white font-medium' : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    Preview
                  </button>
                </div>
              </div>

              {descMode === 'write' ? (
                <textarea
                  disabled={!userPerms.canEdit}
                  rows={8}
                  value={colDraft.description || ''}
                  onChange={(e) => setColDraft({ ...colDraft, description: e.target.value })}
                  placeholder="Document this collection using Markdown... Describe authentication instructions, API endpoints, or test data."
                  className="w-full bg-gray-900 border border-gray-800 focus:border-orange-500 rounded p-3 text-xs text-gray-200 outline-none font-mono leading-relaxed"
                />
              ) : (
                <div className="w-full bg-gray-900/50 border border-gray-800 rounded p-4 min-h-[160px] text-xs text-gray-300 prose prose-invert max-w-none leading-relaxed">
                  {colDraft.description?.trim() ? (
                    <div className="whitespace-pre-wrap">{colDraft.description}</div>
                  ) : (
                    <span className="italic text-gray-500">No description provided for this collection yet.</span>
                  )}
                </div>
              )}
            </div>

            {/* Collection Metadata Card */}
            <div className="pt-4 border-t border-gray-800">
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                Collection Summary & Metadata
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="bg-gray-900 border border-gray-800/80 rounded-lg p-3">
                  <span className="text-gray-400 block mb-1">Workspace</span>
                  <span className="font-semibold text-white truncate block">
                    {currentWorkspace?.name || 'Default Workspace'}
                  </span>
                </div>
                <div className="bg-gray-900 border border-gray-800/80 rounded-lg p-3">
                  <span className="text-gray-400 block mb-1">Total Requests</span>
                  <span className="font-semibold text-orange-400 text-sm block">
                    {totalRequests} <span className="text-[11px] text-gray-400 font-normal">({directRequests} root, {nestedRequests} in folders)</span>
                  </span>
                </div>
                <div className="bg-gray-900 border border-gray-800/80 rounded-lg p-3">
                  <span className="text-gray-400 block mb-1">Folders</span>
                  <span className="font-semibold text-white text-sm block">{totalFolders}</span>
                </div>
                <div className="bg-gray-900 border border-gray-800/80 rounded-lg p-3">
                  <span className="text-gray-400 block mb-1">Collection ID</span>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] text-gray-300 truncate mr-1">{colDraft.id}</span>
                    <button
                      onClick={handleCopyId}
                      className="p-1 hover:text-white text-gray-400 transition-colors"
                      title="Copy Collection ID"
                    >
                      {isCopiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================== AUTHORIZATION SUBTAB ===================== */}
        {activeSubTab === 'auth' && (
          <div className="max-w-xl space-y-5 text-xs">
            <div className="p-3 bg-gray-900/80 border border-gray-800 rounded-lg flex items-start space-x-2.5">
              <Info className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <p className="text-gray-300 leading-relaxed">
                Configure collection-level authorization. Requests in this collection with{' '}
                <strong className="text-white">Inherit auth from parent</strong> will automatically inherit these credentials.
              </p>
            </div>

            <div>
              <label className="block text-gray-300 mb-1.5 font-medium">Type</label>
              <select
                disabled={!userPerms.canEdit}
                value={colDraft.auth?.type || 'none'}
                onChange={(e) =>
                  setColDraft({
                    ...colDraft,
                    auth: { ...colDraft.auth, type: e.target.value as AuthType },
                  })
                }
                className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-gray-200 outline-none focus:border-orange-500"
              >
                <option value="none">No Auth</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="apikey">API Key</option>
                <option value="oauth2">OAuth 2.0 (Client Credentials)</option>
                <option value="custom">Custom Header</option>
              </select>
            </div>

            {colDraft.auth?.type === 'bearer' && (
              <div>
                <label className="block text-gray-300 mb-1 font-medium">Token</label>
                <div className="relative flex items-center">
                  <input
                    disabled={!userPerms.canEdit}
                    type={showBearerToken ? 'text' : 'password'}
                    placeholder="e.g. eyJhbGciOi... or {{token}}"
                    value={colDraft.auth.bearer?.token || ''}
                    onChange={(e) =>
                      setColDraft({
                        ...colDraft,
                        auth: {
                          ...colDraft.auth,
                          type: 'bearer',
                          bearer: { token: e.target.value },
                        },
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 pr-10 text-white font-mono outline-none focus:border-orange-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowBearerToken(!showBearerToken)}
                    className="absolute right-2 text-gray-400 hover:text-white p-1 rounded"
                    title={showBearerToken ? 'Hide token' : 'Show token'}
                  >
                    {showBearerToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            )}

            {colDraft.auth?.type === 'basic' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Username</label>
                  <input
                    disabled={!userPerms.canEdit}
                    type="text"
                    placeholder="Username or {{username}}"
                    value={colDraft.auth.basic?.username || ''}
                    onChange={(e) =>
                      setColDraft({
                        ...colDraft,
                        auth: {
                          ...colDraft.auth,
                          type: 'basic',
                          basic: {
                            username: e.target.value,
                            password: colDraft.auth?.basic?.password || '',
                          },
                        },
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Password</label>
                  <div className="relative flex items-center">
                    <input
                      disabled={!userPerms.canEdit}
                      type={showBasicPassword ? 'text' : 'password'}
                      placeholder="Password or {{password}}"
                      value={colDraft.auth.basic?.password || ''}
                      onChange={(e) =>
                        setColDraft({
                          ...colDraft,
                          auth: {
                            ...colDraft.auth,
                            type: 'basic',
                            basic: {
                              username: colDraft.auth?.basic?.username || '',
                              password: e.target.value,
                            },
                          },
                        })
                      }
                      className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 pr-10 text-white outline-none focus:border-orange-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBasicPassword(!showBasicPassword)}
                      className="absolute right-2 text-gray-400 hover:text-white p-1 rounded"
                    >
                      {showBasicPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {colDraft.auth?.type === 'apikey' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Key</label>
                  <input
                    disabled={!userPerms.canEdit}
                    type="text"
                    placeholder="e.g. X-API-Key"
                    value={colDraft.auth.apiKey?.key || ''}
                    onChange={(e) =>
                      setColDraft({
                        ...colDraft,
                        auth: {
                          ...colDraft.auth,
                          type: 'apikey',
                          apiKey: {
                            key: e.target.value,
                            value: colDraft.auth?.apiKey?.value || '',
                            addTo: colDraft.auth?.apiKey?.addTo || 'header',
                          },
                        },
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Value</label>
                  <div className="relative flex items-center">
                    <input
                      disabled={!userPerms.canEdit}
                      type={showApiKey ? 'text' : 'password'}
                      placeholder="API key value or {{api_key}}"
                      value={colDraft.auth.apiKey?.value || ''}
                      onChange={(e) =>
                        setColDraft({
                          ...colDraft,
                          auth: {
                            ...colDraft.auth,
                            type: 'apikey',
                            apiKey: {
                              key: colDraft.auth?.apiKey?.key || '',
                              value: e.target.value,
                              addTo: colDraft.auth?.apiKey?.addTo || 'header',
                            },
                          },
                        })
                      }
                      className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 pr-10 text-white outline-none focus:border-orange-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 text-gray-400 hover:text-white p-1 rounded"
                    >
                      {showApiKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Add to</label>
                  <select
                    disabled={!userPerms.canEdit}
                    value={colDraft.auth.apiKey?.addTo || 'header'}
                    onChange={(e) =>
                      setColDraft({
                        ...colDraft,
                        auth: {
                          ...colDraft.auth,
                          type: 'apikey',
                          apiKey: {
                            key: colDraft.auth?.apiKey?.key || '',
                            value: colDraft.auth?.apiKey?.value || '',
                            addTo: e.target.value as 'header' | 'query',
                          },
                        },
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white outline-none focus:border-orange-500"
                  >
                    <option value="header">Header</option>
                    <option value="query">Query Params</option>
                  </select>
                </div>
              </div>
            )}

            {colDraft.auth?.type === 'oauth2' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Token URL</label>
                  <input
                    disabled={!userPerms.canEdit}
                    type="text"
                    placeholder="https://auth.company.com/oauth/token"
                    value={colDraft.auth.oauth2?.tokenUrl || ''}
                    onChange={(e) =>
                      setColDraft({
                        ...colDraft,
                        auth: {
                          ...colDraft.auth,
                          type: 'oauth2',
                          oauth2: {
                            grantType: 'client_credentials',
                            tokenUrl: e.target.value,
                            clientId: colDraft.auth?.oauth2?.clientId || '',
                            clientSecret: colDraft.auth?.oauth2?.clientSecret || '',
                            scope: colDraft.auth?.oauth2?.scope || '',
                          },
                        },
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Client ID</label>
                  <input
                    disabled={!userPerms.canEdit}
                    type="text"
                    value={colDraft.auth.oauth2?.clientId || ''}
                    onChange={(e) =>
                      setColDraft({
                        ...colDraft,
                        auth: {
                          ...colDraft.auth,
                          type: 'oauth2',
                          oauth2: {
                            grantType: 'client_credentials',
                            tokenUrl: colDraft.auth?.oauth2?.tokenUrl || '',
                            clientId: e.target.value,
                            clientSecret: colDraft.auth?.oauth2?.clientSecret || '',
                            scope: colDraft.auth?.oauth2?.scope || '',
                          },
                        },
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Client Secret</label>
                  <div className="relative flex items-center">
                    <input
                      disabled={!userPerms.canEdit}
                      type={showClientSecret ? 'text' : 'password'}
                      value={colDraft.auth.oauth2?.clientSecret || ''}
                      onChange={(e) =>
                        setColDraft({
                          ...colDraft,
                          auth: {
                            ...colDraft.auth,
                            type: 'oauth2',
                            oauth2: {
                              grantType: 'client_credentials',
                              tokenUrl: colDraft.auth?.oauth2?.tokenUrl || '',
                              clientId: colDraft.auth?.oauth2?.clientId || '',
                              clientSecret: e.target.value,
                              scope: colDraft.auth?.oauth2?.scope || '',
                            },
                          },
                        })
                      }
                      className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 pr-10 text-white outline-none focus:border-orange-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowClientSecret(!showClientSecret)}
                      className="absolute right-2 text-gray-400 hover:text-white p-1 rounded"
                    >
                      {showClientSecret ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Scope (optional)</label>
                  <input
                    disabled={!userPerms.canEdit}
                    type="text"
                    placeholder="e.g. read write"
                    value={colDraft.auth.oauth2?.scope || ''}
                    onChange={(e) =>
                      setColDraft({
                        ...colDraft,
                        auth: {
                          ...colDraft.auth,
                          type: 'oauth2',
                          oauth2: {
                            grantType: 'client_credentials',
                            tokenUrl: colDraft.auth?.oauth2?.tokenUrl || '',
                            clientId: colDraft.auth?.oauth2?.clientId || '',
                            clientSecret: colDraft.auth?.oauth2?.clientSecret || '',
                            scope: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            )}

            {colDraft.auth?.type === 'custom' && (
              <div className="space-y-3">
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Header Name</label>
                  <input
                    disabled={!userPerms.canEdit}
                    type="text"
                    placeholder="e.g. X-Internal-Token"
                    value={colDraft.auth.custom?.headerName || ''}
                    onChange={(e) =>
                      setColDraft({
                        ...colDraft,
                        auth: {
                          ...colDraft.auth,
                          type: 'custom',
                          custom: {
                            headerName: e.target.value,
                            headerValue: colDraft.auth?.custom?.headerValue || '',
                          },
                        },
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white outline-none focus:border-orange-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Header Value</label>
                  <input
                    disabled={!userPerms.canEdit}
                    type="text"
                    placeholder="Header value or {{token}}"
                    value={colDraft.auth.custom?.headerValue || ''}
                    onChange={(e) =>
                      setColDraft({
                        ...colDraft,
                        auth: {
                          ...colDraft.auth,
                          type: 'custom',
                          custom: {
                            headerName: colDraft.auth?.custom?.headerName || '',
                            headerValue: e.target.value,
                          },
                        },
                      })
                    }
                    className="w-full bg-gray-900 border border-gray-800 rounded px-3 py-2 text-white outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* ===================== PRE-REQUEST SCRIPT SUBTAB ===================== */}
        {activeSubTab === 'prereq' && (
          <div className="flex h-full gap-6">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-white">Pre-request Script</h4>
                  <p className="text-[11px] text-gray-400">
                    Runs in JavaScript environment <strong className="text-orange-400">before</strong> any request in this collection.
                  </p>
                </div>
              </div>
              <textarea
                disabled={!userPerms.canEdit}
                value={colDraft.preScript || ''}
                onChange={(e) => setColDraft({ ...colDraft, preScript: e.target.value })}
                placeholder={`// Collection pre-request script\n// Examples:\npm.environment.set("current_time", new Date().toISOString());\npm.collectionVariables.set("auth_prefix", "Bearer ");\nconsole.log("Preparing request in collection: " + "${colDraft.name}");`}
                className="flex-1 w-full min-h-[350px] bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs font-mono text-gray-100 outline-none focus:border-orange-500 leading-relaxed resize-none"
              />
            </div>

            {/* Postman-like Snippets Sidebar */}
            <div className="w-72 bg-gray-900/60 border border-gray-800 rounded-lg p-3.5 text-xs flex flex-col shrink-0">
              <div className="flex items-center space-x-1.5 text-orange-400 font-semibold mb-2">
                <Code className="w-3.5 h-3.5" />
                <span>Code Snippets</span>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">
                Click a snippet to append it to your collection pre-request script:
              </p>
              <div className="space-y-1.5 overflow-y-auto pr-1">
                <button
                  disabled={!userPerms.canEdit}
                  onClick={() => insertSnippet('pre', 'pm.environment.set("variable_key", "variable_value");')}
                  className="w-full text-left p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded transition-colors text-[11px] text-gray-300 hover:text-white"
                >
                  <span className="font-medium text-orange-300 block mb-0.5">Set environment variable</span>
                  <code className="text-[10px] text-gray-400 font-mono">pm.environment.set(...)</code>
                </button>

                <button
                  disabled={!userPerms.canEdit}
                  onClick={() => insertSnippet('pre', 'pm.collectionVariables.set("col_key", "col_value");')}
                  className="w-full text-left p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded transition-colors text-[11px] text-gray-300 hover:text-white"
                >
                  <span className="font-medium text-amber-300 block mb-0.5">Set collection variable</span>
                  <code className="text-[10px] text-gray-400 font-mono">pm.collectionVariables.set(...)</code>
                </button>

                <button
                  disabled={!userPerms.canEdit}
                  onClick={() => insertSnippet('pre', 'const val = pm.environment.get("variable_key");')}
                  className="w-full text-left p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded transition-colors text-[11px] text-gray-300 hover:text-white"
                >
                  <span className="font-medium text-emerald-300 block mb-0.5">Get environment variable</span>
                  <code className="text-[10px] text-gray-400 font-mono">pm.environment.get(...)</code>
                </button>

                <button
                  disabled={!userPerms.canEdit}
                  onClick={() => insertSnippet('pre', 'const colVal = pm.collectionVariables.get("col_key");')}
                  className="w-full text-left p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded transition-colors text-[11px] text-gray-300 hover:text-white"
                >
                  <span className="font-medium text-emerald-300 block mb-0.5">Get collection variable</span>
                  <code className="text-[10px] text-gray-400 font-mono">pm.collectionVariables.get(...)</code>
                </button>

                <button
                  disabled={!userPerms.canEdit}
                  onClick={() => insertSnippet('pre', 'pm.environment.unset("variable_key");')}
                  className="w-full text-left p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded transition-colors text-[11px] text-gray-300 hover:text-white"
                >
                  <span className="font-medium text-rose-300 block mb-0.5">Clear environment variable</span>
                  <code className="text-[10px] text-gray-400 font-mono">pm.environment.unset(...)</code>
                </button>

                <button
                  disabled={!userPerms.canEdit}
                  onClick={() => insertSnippet('pre', 'console.log("Collection pre-request triggered:", new Date().toLocaleTimeString());')}
                  className="w-full text-left p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded transition-colors text-[11px] text-gray-300 hover:text-white"
                >
                  <span className="font-medium text-blue-300 block mb-0.5">Log to Console</span>
                  <code className="text-[10px] text-gray-400 font-mono">console.log(...)</code>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TESTS (AFTER) SUBTAB ===================== */}
        {activeSubTab === 'tests' && (
          <div className="flex h-full gap-6">
            <div className="flex-1 flex flex-col min-w-0">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h4 className="text-xs font-semibold text-white">Tests & Post-response Script</h4>
                  <p className="text-[11px] text-gray-400">
                    Runs in JavaScript environment <strong className="text-orange-400">after</strong> every response in this collection.
                  </p>
                </div>
              </div>
              <textarea
                disabled={!userPerms.canEdit}
                value={colDraft.postScript || ''}
                onChange={(e) => setColDraft({ ...colDraft, postScript: e.target.value })}
                placeholder={`// Collection test script\n// Examples:\npm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});\n\npm.test("Response time is acceptable", function () {\n    pm.expect(pm.response.responseTime).to.be.below(1500);\n});`}
                className="flex-1 w-full min-h-[350px] bg-gray-900 border border-gray-800 rounded-lg p-3 text-xs font-mono text-gray-100 outline-none focus:border-orange-500 leading-relaxed resize-none"
              />
            </div>

            {/* Postman-like Test Snippets Sidebar */}
            <div className="w-72 bg-gray-900/60 border border-gray-800 rounded-lg p-3.5 text-xs flex flex-col shrink-0">
              <div className="flex items-center space-x-1.5 text-orange-400 font-semibold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Test Snippets</span>
              </div>
              <p className="text-[11px] text-gray-400 mb-3">
                Click a snippet to append to your collection tests:
              </p>
              <div className="space-y-1.5 overflow-y-auto pr-1">
                <button
                  disabled={!userPerms.canEdit}
                  onClick={() =>
                    insertSnippet(
                      'post',
                      'pm.test("Status code is 200", function () {\n    pm.response.to.have.status(200);\n});'
                    )
                  }
                  className="w-full text-left p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded transition-colors text-[11px] text-gray-300 hover:text-white"
                >
                  <span className="font-medium text-emerald-300 block mb-0.5">Status code: Code is 200</span>
                  <code className="text-[10px] text-gray-400 font-mono">pm.response.to.have.status(200)</code>
                </button>

                <button
                  disabled={!userPerms.canEdit}
                  onClick={() =>
                    insertSnippet(
                      'post',
                      'pm.test("Response time is less than 500ms", function () {\n    pm.expect(pm.response.responseTime).to.be.below(500);\n});'
                    )
                  }
                  className="w-full text-left p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded transition-colors text-[11px] text-gray-300 hover:text-white"
                >
                  <span className="font-medium text-blue-300 block mb-0.5">Response time check</span>
                  <code className="text-[10px] text-gray-400 font-mono">pm.expect(responseTime).below(...)</code>
                </button>

                <button
                  disabled={!userPerms.canEdit}
                  onClick={() =>
                    insertSnippet(
                      'post',
                      'pm.test("Response is valid JSON", function () {\n    const data = pm.response.json();\n    pm.expect(data).to.be.an("object");\n});'
                    )
                  }
                  className="w-full text-left p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded transition-colors text-[11px] text-gray-300 hover:text-white"
                >
                  <span className="font-medium text-amber-300 block mb-0.5">JSON response validation</span>
                  <code className="text-[10px] text-gray-400 font-mono">pm.response.json()</code>
                </button>

                <button
                  disabled={!userPerms.canEdit}
                  onClick={() =>
                    insertSnippet(
                      'post',
                      'const jsonData = pm.response.json();\nif (jsonData.token) {\n    pm.collectionVariables.set("auth_token", jsonData.token);\n}'
                    )
                  }
                  className="w-full text-left p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded transition-colors text-[11px] text-gray-300 hover:text-white"
                >
                  <span className="font-medium text-purple-300 block mb-0.5">Save token to collection</span>
                  <code className="text-[10px] text-gray-400 font-mono">pm.collectionVariables.set(...)</code>
                </button>

                <button
                  disabled={!userPerms.canEdit}
                  onClick={() =>
                    insertSnippet(
                      'post',
                      'const jsonData = pm.response.json();\npm.environment.set("last_id", jsonData.id || jsonData.data?.id);'
                    )
                  }
                  className="w-full text-left p-2 bg-gray-850 hover:bg-gray-800 border border-gray-800 rounded transition-colors text-[11px] text-gray-300 hover:text-white"
                >
                  <span className="font-medium text-cyan-300 block mb-0.5">Save ID to environment</span>
                  <code className="text-[10px] text-gray-400 font-mono">pm.environment.set(...)</code>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================== VARIABLES SUBTAB ===================== */}
        {activeSubTab === 'variables' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-white">Collection Variables</h4>
                <p className="text-[11px] text-gray-400">
                  These variables are accessible by all requests in this collection using{' '}
                  <code className="text-orange-400 font-mono bg-gray-900 px-1 py-0.5 rounded">{'{{variable_name}}'}</code>.
                </p>
              </div>

              {userPerms.canEdit && (
                <button
                  onClick={handleAddVariable}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-medium transition-colors shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Variable</span>
                </button>
              )}
            </div>

            {/* Variables Table */}
            <div className="border border-gray-800 rounded-lg overflow-hidden bg-gray-900/40">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">
                <div className="col-span-1 text-center">Active</div>
                <div className="col-span-3">Variable Name</div>
                <div className="col-span-3">Initial Value</div>
                <div className="col-span-3">Current Value</div>
                <div className="col-span-1 text-center">Secret</div>
                <div className="col-span-1 text-right">Action</div>
              </div>

              {variablesList.length === 0 ? (
                <div className="text-center py-10 text-xs text-gray-500">
                  <Database className="w-6 h-6 mx-auto mb-2 text-gray-600" />
                  <p>No collection variables defined.</p>
                  {userPerms.canEdit && (
                    <button
                      onClick={handleAddVariable}
                      className="text-orange-500 hover:underline mt-1 font-medium inline-block"
                    >
                      Click here to add one.
                    </button>
                  )}
                </div>
              ) : (
                <div className="divide-y divide-gray-800/80">
                  {variablesList.map((v) => (
                    <div key={v.id} className="grid grid-cols-12 gap-2 px-3 py-2 items-center text-xs hover:bg-gray-900/60 transition-colors">
                      {/* Active Checkbox */}
                      <div className="col-span-1 flex justify-center">
                        <input
                          type="checkbox"
                          disabled={!userPerms.canEdit}
                          checked={v.isEnabled !== false}
                          onChange={(e) => handleUpdateVariable(v.id, { isEnabled: e.target.checked })}
                          className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0 cursor-pointer"
                        />
                      </div>

                      {/* Variable Name (Key) */}
                      <div className="col-span-3">
                        <input
                          type="text"
                          disabled={!userPerms.canEdit}
                          value={v.key}
                          placeholder="e.g. base_url"
                          onChange={(e) => handleUpdateVariable(v.id, { key: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1 text-white font-mono text-xs outline-none focus:border-orange-500"
                        />
                      </div>

                      {/* Initial Value */}
                      <div className="col-span-3">
                        <input
                          type={v.isSecret ? 'password' : 'text'}
                          disabled={!userPerms.canEdit}
                          value={v.value}
                          placeholder="Initial value"
                          onChange={(e) => handleUpdateVariable(v.id, { value: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1 text-gray-200 font-mono text-xs outline-none focus:border-orange-500"
                        />
                      </div>

                      {/* Current Value */}
                      <div className="col-span-3">
                        <input
                          type={v.isSecret ? 'password' : 'text'}
                          disabled={!userPerms.canEdit}
                          value={v.currentValue !== undefined ? v.currentValue : v.value}
                          placeholder="Current value"
                          onChange={(e) => handleUpdateVariable(v.id, { currentValue: e.target.value })}
                          className="w-full bg-gray-900 border border-gray-800 rounded px-2.5 py-1 text-gray-200 font-mono text-xs outline-none focus:border-orange-500"
                        />
                      </div>

                      {/* Secret Checkbox */}
                      <div className="col-span-1 flex justify-center">
                        <input
                          type="checkbox"
                          disabled={!userPerms.canEdit}
                          checked={Boolean(v.isSecret)}
                          onChange={(e) => handleUpdateVariable(v.id, { isSecret: e.target.checked })}
                          className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0 cursor-pointer"
                          title="Mask value in UI"
                        />
                      </div>

                      {/* Delete Action */}
                      <div className="col-span-1 flex justify-end">
                        {userPerms.canEdit && (
                          <button
                            onClick={() => handleDeleteVariable(v.id)}
                            className="p-1 hover:text-rose-400 text-gray-500 rounded transition-colors"
                            title="Delete variable"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
