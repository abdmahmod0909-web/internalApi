import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import {
  Folder,
  FolderOpen,
  FileCode,
  Plus,
  Trash2,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  Search,
} from 'lucide-react';
import type { HttpMethod, ApiRequestData } from '@internalapi/shared';

function getMethodColor(method: HttpMethod | string): string {
  switch (method) {
    case 'GET':
      return 'text-emerald-400';
    case 'POST':
      return 'text-amber-400';
    case 'PUT':
      return 'text-blue-400';
    case 'PATCH':
      return 'text-purple-400';
    case 'DELETE':
      return 'text-rose-400';
    default:
      return 'text-gray-400';
  }
}

export const Sidebar: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'collections' | 'history'>('collections');
  const [filterText, setFilterText] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  const {
    collections,
    history,
    openTab,
    createCollection,
    deleteCollection,
    clearHistory,
  } = useAppStore();

  const toggleFolder = (id: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateCollection = () => {
    const name = prompt('Enter new collection name:');
    if (name?.trim()) {
      createCollection(name.trim());
    }
  };

  const filteredHistory = history.filter((item) =>
    item.url.toLowerCase().includes(filterText.toLowerCase()) ||
    item.method.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <aside className="w-72 bg-gray-950 border-r border-gray-800 flex flex-col h-full select-none">
      {/* Switcher: Collections vs History */}
      <div className="flex border-b border-gray-800 text-xs font-semibold text-gray-400">
        <button
          onClick={() => setActiveTab('collections')}
          className={`flex-1 py-2.5 flex items-center justify-center space-x-1.5 transition-colors ${
            activeTab === 'collections'
              ? 'text-orange-500 border-b-2 border-orange-500 bg-gray-900/50'
              : 'hover:text-gray-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Collections</span>
        </button>
        <button
          onClick={() => setActiveTab('history')}
          className={`flex-1 py-2.5 flex items-center justify-center space-x-1.5 transition-colors ${
            activeTab === 'history'
              ? 'text-orange-500 border-b-2 border-orange-500 bg-gray-900/50'
              : 'hover:text-gray-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>History</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="p-2 border-b border-gray-800/80">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-gray-500" />
          <input
            type="text"
            placeholder={`Filter ${activeTab}...`}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            className="w-full bg-gray-900 border border-gray-800 rounded pl-8 pr-2 py-1.5 text-xs text-gray-200 placeholder-gray-500 outline-none focus:border-gray-700"
          />
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {activeTab === 'collections' && (
          <div>
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
              <span>All Collections</span>
              <button
                onClick={handleCreateCollection}
                className="hover:text-orange-400 p-1 rounded"
                title="Create Collection"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {collections.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">
                No collections yet.<br />Click + above to create one.
              </div>
            ) : (
              collections.map((col) => (
                <div key={col.id} className="mb-2">
                  {/* Collection Header */}
                  <div className="group flex items-center justify-between px-2 py-1.5 text-xs text-gray-300 hover:bg-gray-900 rounded cursor-pointer">
                    <div
                      className="flex items-center space-x-1.5 flex-1 truncate"
                      onClick={() => toggleFolder(col.id)}
                    >
                      {collapsedFolders[col.id] ? (
                        <ChevronRight className="w-3.5 h-3.5 text-gray-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-500" />
                      )}
                      <Folder className="w-3.5 h-3.5 text-orange-400" />
                      <span className="font-medium truncate">{col.name}</span>
                    </div>
                    <button
                      onClick={() => {
                        if (confirm(`Delete collection "${col.name}"?`)) {
                          deleteCollection(col.id);
                        }
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-gray-500 rounded"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Folders & Requests */}
                  {!collapsedFolders[col.id] && (
                    <div className="pl-4 space-y-0.5 mt-0.5 border-l border-gray-800/80 ml-3">
                      {/* Sub-Folders */}
                      {col.folders?.map((fld) => (
                        <div key={fld.id}>
                          <div
                            onClick={() => toggleFolder(fld.id)}
                            className="flex items-center space-x-1.5 px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-900 rounded cursor-pointer"
                          >
                            {collapsedFolders[fld.id] ? (
                              <ChevronRight className="w-3 h-3 text-gray-500" />
                            ) : (
                              <ChevronDown className="w-3 h-3 text-gray-500" />
                            )}
                            <FolderOpen className="w-3 h-3 text-amber-500" />
                            <span className="truncate">{fld.name}</span>
                          </div>

                          {/* Requests in Folder */}
                          {!collapsedFolders[fld.id] && (
                            <div className="pl-4 space-y-0.5 border-l border-gray-800/60 ml-2.5">
                              {fld.requests?.map((req) => (
                                <div
                                  key={req.id}
                                  onClick={() => openTab(req, req.id)}
                                  className="flex items-center space-x-2 px-2 py-1 text-xs text-gray-300 hover:bg-gray-850 hover:text-white rounded cursor-pointer group"
                                >
                                  <span className={`text-[10px] font-bold ${getMethodColor(req.method)}`}>
                                    {req.method}
                                  </span>
                                  <span className="truncate flex-1">{req.name}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Direct Requests in Collection */}
                      {col.requests?.map((req) => (
                        <div
                          key={req.id}
                          onClick={() => openTab(req, req.id)}
                          className="flex items-center space-x-2 px-2 py-1 text-xs text-gray-300 hover:bg-gray-850 hover:text-white rounded cursor-pointer group"
                        >
                          <span className={`text-[10px] font-bold ${getMethodColor(req.method)}`}>
                            {req.method}
                          </span>
                          <span className="truncate flex-1">{req.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div>
            <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-gray-400 tracking-wider uppercase">
              <span>Recent Requests</span>
              {history.length > 0 && (
                <button
                  onClick={() => {
                    if (confirm('Clear all request history?')) clearHistory();
                  }}
                  className="hover:text-rose-400 text-gray-500 text-[10px]"
                >
                  Clear All
                </button>
              )}
            </div>

            {filteredHistory.length === 0 ? (
              <div className="text-center py-8 text-xs text-gray-500">
                No recent requests.
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  onClick={() =>
                    openTab({
                      name: `${item.method} ${item.url}`,
                      method: item.method as HttpMethod,
                      url: item.url,
                    })
                  }
                  className="flex flex-col px-2.5 py-2 text-xs text-gray-300 hover:bg-gray-900 rounded cursor-pointer border-b border-gray-900/60 transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold ${getMethodColor(item.method)}`}>
                      {item.method}
                    </span>
                    <span
                      className={`text-[10px] font-semibold px-1 rounded ${
                        item.status >= 200 && item.status < 300
                          ? 'text-emerald-400 bg-emerald-950/40'
                          : item.status >= 400
                          ? 'text-rose-400 bg-rose-950/40'
                          : 'text-gray-400 bg-gray-800'
                      }`}
                    >
                      {item.status || 'ERR'}
                    </span>
                  </div>
                  <span className="truncate text-gray-400 text-[11px] font-mono">{item.url}</span>
                  <div className="flex justify-between items-center text-[10px] text-gray-500 mt-1">
                    <span>{item.time ? `${item.time}ms` : ''}</span>
                    <span>{new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};

