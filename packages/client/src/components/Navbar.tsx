import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import {
  Layers,
  Settings,
  Eye,
  Search,
  Play,
  Save,
  Upload,
  Palette,
  Briefcase,
  ChevronDown,
  Plus,
  Trash2,
  Check,
  Workflow,
  Radio,
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    workspaces,
    activeWorkspaceId,
    switchWorkspace,
    deleteWorkspace,
    setWorkspaceModalOpen,
    activeView,
    setActiveView,
    environments,
    activeEnvironmentId,
    setActiveEnvironmentId,
    setEnvModalOpen,
    setCommandPaletteOpen,
    setImportModalOpen,
    theme,
    setTheme,
    sendRequest,
    saveCurrentRequest,
    tabs,
    activeTabId,
    flows,
  } = useAppStore();

  const [isWsDropdownOpen, setIsWsDropdownOpen] = useState(false);
  const [wsSearch, setWsSearch] = useState('');
  const wsDropdownRef = useRef<HTMLDivElement>(null);

  const activeTab = tabs.find((t) => t.id === activeTabId);
  const currentWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || {
    id: activeWorkspaceId,
    name: 'Company Internal APIs',
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wsDropdownRef.current && !wsDropdownRef.current.contains(e.target as Node)) {
        setIsWsDropdownOpen(false);
      }
    };
    if (isWsDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isWsDropdownOpen]);

  const filteredWorkspaces = workspaces.filter((w) =>
    w.name.toLowerCase().includes(wsSearch.toLowerCase())
  );

  return (
    <header className="h-12 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-3 select-none z-20">
      {/* Brand & Workspace Switcher */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 font-bold text-base text-orange-500 tracking-wide cursor-pointer" onClick={() => setActiveView('requests')}>
          <Layers className="w-5 h-5 text-orange-500" />
          <span className="text-white">Internal<span className="text-orange-500">API</span></span>
        </div>
        <span className="text-gray-700 text-sm">|</span>

        {/* Postman-style Workspaces Dropdown */}
        <div className="relative" ref={wsDropdownRef}>
          <button
            onClick={() => {
              setIsWsDropdownOpen(!isWsDropdownOpen);
              setWsSearch('');
            }}
            className="flex items-center space-x-2 text-xs text-gray-200 bg-gray-900 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 px-2.5 py-1.5 rounded transition-all shadow-xs"
            title="Switch or manage workspaces"
          >
            <Briefcase className="w-3.5 h-3.5 text-orange-400" />
            <span className="max-w-[140px] truncate font-medium">{currentWorkspace.name}</span>
            <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${isWsDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isWsDropdownOpen && (
            <div className="absolute left-0 mt-1.5 w-64 bg-gray-900 border border-gray-800 rounded-md shadow-2xl py-1.5 z-50 text-xs text-gray-200">
              <div className="px-2.5 pb-2 pt-1 border-b border-gray-800/80">
                <div className="flex items-center justify-between text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  <span>Workspaces</span>
                  <span className="text-orange-400">{workspaces.length} total</span>
                </div>
                <div className="relative">
                  <Search className="w-3 h-3 text-gray-500 absolute left-2 top-2" />
                  <input
                    type="text"
                    value={wsSearch}
                    onChange={(e) => setWsSearch(e.target.value)}
                    placeholder="Filter workspaces..."
                    className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 pl-7 text-[11px] text-gray-200 placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    autoFocus
                  />
                </div>
              </div>

              {/* Workspaces List */}
              <div className="max-h-52 overflow-y-auto py-1">
                {filteredWorkspaces.length === 0 ? (
                  <div className="px-3 py-2 text-[11px] text-gray-500 text-center">No workspaces found</div>
                ) : (
                  filteredWorkspaces.map((ws) => {
                    const isActive = ws.id === activeWorkspaceId;
                    return (
                      <div
                        key={ws.id}
                        onClick={() => {
                          switchWorkspace(ws.id);
                          setIsWsDropdownOpen(false);
                        }}
                        className={`group flex items-center justify-between px-2.5 py-1.5 cursor-pointer hover:bg-gray-800 transition-colors ${
                          isActive ? 'bg-orange-500/10 text-orange-400 font-medium' : 'text-gray-300'
                        }`}
                      >
                        <div className="flex items-center space-x-2 truncate">
                          {isActive ? (
                            <Check className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          ) : (
                            <div className="w-3.5 h-3.5 rounded-full border border-gray-700 shrink-0" />
                          )}
                          <div className="truncate">
                            <div className="truncate text-xs">{ws.name}</div>
                            {ws.description && (
                              <div className="text-[10px] text-gray-500 truncate max-w-[170px]">{ws.description}</div>
                            )}
                          </div>
                        </div>

                        {!ws.isDefault && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete workspace "${ws.name}"?`)) {
                                deleteWorkspace(ws.id);
                              }
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-gray-500 rounded transition-all"
                            title="Delete workspace"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Create Workspace Action */}
              <div className="border-t border-gray-800/80 pt-1 px-1">
                <button
                  onClick={() => {
                    setIsWsDropdownOpen(false);
                    setWorkspaceModalOpen(true);
                  }}
                  className="w-full flex items-center space-x-1.5 px-2.5 py-1.5 text-left rounded text-orange-400 hover:bg-orange-500/10 hover:text-orange-300 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span className="font-medium text-xs">Create Workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* View Switcher: Requests vs Flows */}
        <div className="flex items-center bg-gray-900 border border-gray-800 rounded p-0.5 ml-2">
          <button
            onClick={() => setActiveView('requests')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs transition-colors ${
              activeView === 'requests'
                ? 'bg-gray-800 text-white font-medium shadow-xs'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Radio className="w-3 h-3 text-orange-400" />
            <span>API Client</span>
          </button>
          <button
            onClick={() => setActiveView('flows')}
            className={`flex items-center space-x-1.5 px-2.5 py-1 rounded text-xs transition-colors ${
              activeView === 'flows'
                ? 'bg-orange-600 text-white font-medium shadow-xs'
                : 'text-gray-400 hover:text-gray-200'
            }`}
          >
            <Workflow className="w-3 h-3" />
            <span>Flows</span>
            {flows.length > 0 && (
              <span className="px-1 text-[10px] bg-black/40 rounded-full font-mono">
                {flows.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Global Command Search */}
      <button
        onClick={() => setCommandPaletteOpen(true)}
        className="flex items-center space-x-2 px-3 py-1 text-xs text-gray-400 bg-gray-900 border border-gray-800 rounded-md hover:bg-gray-850 hover:text-gray-200 transition-colors w-72 justify-between"
      >
        <span className="flex items-center space-x-1.5">
          <Search className="w-3.5 h-3.5" />
          <span>Search or jump to...</span>
        </span>
        <kbd className="px-1.5 py-0.5 text-[10px] bg-gray-800 text-gray-400 rounded border border-gray-700">
          Ctrl + K
        </kbd>
      </button>

      {/* Right Controls: Quick Actions, Environments, Settings */}
      <div className="flex items-center space-x-2">
        {/* Import Collection / cURL Button */}
        <button
          onClick={() => setImportModalOpen(true)}
          className="flex items-center space-x-1.5 px-2.5 py-1 text-xs text-gray-300 hover:text-white bg-gray-900 border border-gray-800 hover:border-gray-700 rounded transition-colors"
          title="Import Postman Collection v2.1 or cURL"
        >
          <Upload className="w-3.5 h-3.5 text-orange-500" />
          <span>Import</span>
        </button>

        {/* Theme Selector */}
        <div className="flex items-center bg-gray-900 border border-gray-800 rounded px-1.5 py-0.5" title="Switch Theme">
          <Palette className="w-3.5 h-3.5 text-gray-400 mr-1" />
          <select
            value={theme}
            onChange={(e) => setTheme(e.target.value as any)}
            className="bg-transparent text-xs text-gray-300 py-1 outline-none cursor-pointer"
          >
            <option value="dark" className="bg-gray-900 text-gray-200">Dark (Postman)</option>
            <option value="midnight" className="bg-gray-900 text-gray-200">Midnight Blue</option>
            <option value="light" className="bg-white text-gray-800">Light (Clean)</option>
          </select>
        </div>

        {/* Environment Picker */}
        <div className="flex items-center bg-gray-900 border border-gray-800 rounded-md p-0.5">
          <select
            value={activeEnvironmentId || ''}
            onChange={(e) => setActiveEnvironmentId(e.target.value || null)}
            className="bg-transparent text-xs text-gray-300 px-2 py-1 outline-none cursor-pointer"
          >
            <option value="" className="bg-gray-900 text-gray-400">
              No Environment
            </option>
            {environments.map((env) => (
              <option key={env.id} value={env.id} className="bg-gray-900 text-gray-200">
                {env.name}
              </option>
            ))}
          </select>
          <button
            title="Environment Quick Look / Variables"
            onClick={() => setEnvModalOpen(true)}
            className="p-1 hover:text-orange-400 text-gray-400 rounded transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Manage Environments */}
        <button
          onClick={() => setEnvModalOpen(true)}
          className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-850 rounded border border-gray-800"
          title="Manage Environments"
        >
          <Settings className="w-4 h-4" />
        </button>

        {/* Quick Send Action (visible in Request mode) */}
        {activeView === 'requests' && (
          <>
            <button
              onClick={() => sendRequest()}
              disabled={activeTab?.isLoading}
              className="flex items-center space-x-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Send</span>
            </button>

            <button
              onClick={() => saveCurrentRequest()}
              className="flex items-center space-x-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-2.5 py-1.5 rounded border border-gray-700 transition-colors"
              title="Save Request (Ctrl+S)"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </header>
  );
};
export default Navbar;
