import React from 'react';
import { useAppStore } from '../store/useAppStore.js';
import { Plus, X, Columns, Rows } from 'lucide-react';
import type { HttpMethod } from '@internalapi/shared';

function getMethodBadgeColor(method: HttpMethod): string {
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

export const TabBar: React.FC = () => {
  const { tabs, activeTabId, setActiveTabId, closeTab, openTab, layout, setLayout } = useAppStore();

  return (
    <div className="flex items-center justify-between bg-gray-950 border-b border-gray-800 px-2 overflow-x-auto select-none">
      <div className="flex items-center space-x-1">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const methodColor = getMethodBadgeColor(tab.request.method);

          return (
            <div
              key={tab.id}
              onClick={() => setActiveTabId(tab.id)}
              className={`group flex items-center space-x-2 px-3 py-2 text-xs cursor-pointer border-t-2 transition-all ${
                isActive
                  ? 'bg-gray-900 text-white border-orange-500 font-medium'
                  : 'text-gray-400 border-transparent hover:bg-gray-900/60 hover:text-gray-200'
              }`}
            >
              <span className={`text-[10px] font-bold ${methodColor}`}>
                {tab.request.method}
              </span>
              <span className="max-w-[120px] truncate">{tab.name || 'Untitled Request'}</span>
              {tab.isDirty && <span className="w-1.5 h-1.5 rounded-full bg-orange-400"></span>}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(tab.id);
                }}
                className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex items-center space-x-1 pl-2">
        <button
          onClick={() => openTab()}
          className="p-1.5 text-gray-500 hover:text-gray-200 hover:bg-gray-850 rounded transition-colors"
          title="New Request Tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        <div className="w-[1px] h-4 bg-gray-800 mx-1"></div>

        {/* Two-pane layout toggle: Side-by-side vs Stacked */}
        <button
          onClick={() => setLayout(layout === 'horizontal' ? 'vertical' : 'horizontal')}
          className="flex items-center space-x-1 p-1.5 text-gray-400 hover:text-orange-400 hover:bg-gray-850 rounded transition-colors"
          title={layout === 'horizontal' ? 'Switch to Top & Bottom layout' : 'Switch to Side-by-Side layout'}
        >
          {layout === 'horizontal' ? (
            <Rows className="w-3.5 h-3.5" />
          ) : (
            <Columns className="w-3.5 h-3.5" />
          )}
        </button>
      </div>
    </div>
  );
};

