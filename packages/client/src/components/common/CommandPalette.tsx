import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { Search, Play, Plus, Trash2, Layers, Globe } from 'lucide-react';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    openTab,
    sendRequest,
    clearHistory,
    environments,
    setActiveEnvironmentId,
    collections,
  } = useAppStore();

  const [query, setQuery] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen(!isCommandPaletteOpen);
      } else if (e.key === 'Escape' && isCommandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  // Flatten all saved requests from collections
  const allRequests: Array<{ id: string; name: string; method: string; collectionName: string; req: any }> = [];
  for (const col of collections) {
    for (const r of col.requests || []) {
      allRequests.push({ id: r.id || '', name: r.name, method: r.method, collectionName: col.name, req: r });
    }
    for (const f of col.folders || []) {
      for (const r of f.requests || []) {
        allRequests.push({ id: r.id || '', name: r.name, method: r.method, collectionName: `${col.name} / ${f.name}`, req: r });
      }
    }
  }

  const filteredRequests = allRequests.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.method.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center pt-24 p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* Search Input */}
        <div className="flex items-center px-4 py-3 border-b border-gray-800">
          <Search className="w-4 h-4 text-orange-500 mr-2.5" />
          <input
            autoFocus
            type="text"
            placeholder="Type a command or search requests..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm text-white placeholder-gray-500 outline-none"
          />
          <kbd className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">
            ESC
          </kbd>
        </div>

        {/* Commands List */}
        <div className="max-h-80 overflow-y-auto p-2 text-xs divide-y divide-gray-800/40">
          {/* Default Quick Actions */}
          <div className="py-1">
            <button
              onClick={() => {
                openTab();
                setCommandPaletteOpen(false);
              }}
              className="w-full flex items-center px-3 py-2 text-gray-300 hover:bg-gray-800 rounded transition-colors"
            >
              <Plus className="w-4 h-4 text-emerald-400 mr-2.5" />
              <span>Create New Request</span>
            </button>
            <button
              onClick={() => {
                sendRequest();
                setCommandPaletteOpen(false);
              }}
              className="w-full flex items-center px-3 py-2 text-gray-300 hover:bg-gray-800 rounded transition-colors"
            >
              <Play className="w-4 h-4 text-orange-400 mr-2.5" />
              <span>Send Active Request</span>
            </button>
            <button
              onClick={() => {
                clearHistory();
                setCommandPaletteOpen(false);
              }}
              className="w-full flex items-center px-3 py-2 text-gray-300 hover:bg-gray-800 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4 text-rose-400 mr-2.5" />
              <span>Clear Request History</span>
            </button>
          </div>

          {/* Switch Environments */}
          {environments.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Switch Environment
              </div>
              {environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => {
                    setActiveEnvironmentId(env.id);
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full flex items-center px-3 py-1.5 text-gray-300 hover:bg-gray-800 rounded transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-blue-400 mr-2.5" />
                  <span>Switch to {env.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Filtered Saved Requests */}
          {filteredRequests.length > 0 && (
            <div className="py-1">
              <div className="px-3 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider">
                Saved Requests
              </div>
              {filteredRequests.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    openTab(item.req, item.id);
                    setCommandPaletteOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-gray-300 hover:bg-gray-800 rounded transition-colors"
                >
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-[10px] text-orange-400">{item.method}</span>
                    <span>{item.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-500">{item.collectionName}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

