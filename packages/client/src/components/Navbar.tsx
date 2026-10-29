import React from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { Layers, Settings, Eye, Search, Play, Save } from 'lucide-react';

export const Navbar: React.FC = () => {
  const {
    environments,
    activeEnvironmentId,
    setActiveEnvironmentId,
    setEnvModalOpen,
    setCommandPaletteOpen,
    sendRequest,
    saveCurrentRequest,
    tabs,
    activeTabId,
  } = useAppStore();

  const activeTab = tabs.find((t) => t.id === activeTabId);

  return (
    <header className="h-12 bg-gray-950 border-b border-gray-800 flex items-center justify-between px-3 select-none z-20">
      {/* Brand & Workspace */}
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-2 font-bold text-base text-orange-500 tracking-wide">
          <Layers className="w-5 h-5 text-orange-500" />
          <span className="text-white">Internal<span className="text-orange-500">API</span></span>
        </div>
        <span className="text-gray-700 text-sm">|</span>
        <div className="flex items-center text-xs text-gray-300 bg-gray-900 border border-gray-800 px-2.5 py-1 rounded">
          <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2"></span>
          Company Internal APIs
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

        {/* Quick Send Action */}
        <button
          onClick={() => sendRequest()}
          disabled={activeTab?.isLoading}
          className="flex items-center space-x-1 bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
        >
          <Play className="w-3.5 h-3.5 fill-current" />
          <span>Send</span>
        </button>

        {/* Save Action */}
        <button
          onClick={() => saveCurrentRequest()}
          className="flex items-center space-x-1 bg-gray-800 hover:bg-gray-700 text-gray-200 text-xs px-2.5 py-1.5 rounded border border-gray-700 transition-colors"
          title="Save Request (Ctrl+S)"
        >
          <Save className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};

