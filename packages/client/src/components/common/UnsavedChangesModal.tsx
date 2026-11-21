import React, { useState } from 'react';
import { AlertTriangle, Save, Trash2, X, Check, SaveAll } from 'lucide-react';
import type { TabItem } from '../../store/useAppStore.js';
import type { HttpMethod } from '@internalapi/shared';

function getMethodBadgeColor(method: HttpMethod | string): string {
  switch (method) {
    case 'GET':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    case 'POST':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
    case 'PUT':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/20';
    case 'PATCH':
      return 'text-purple-400 bg-purple-500/10 border-purple-500/20';
    case 'DELETE':
      return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/20';
  }
}

interface UnsavedChangesModalProps {
  isOpen: boolean;
  queue: TabItem[];
  currentIndex: number;
  onSave: (remember: boolean) => void;
  onDontSave: (remember: boolean) => void;
  onSaveAll: (remember: boolean) => void;
  onDontSaveAll: (remember: boolean) => void;
  onCancel: () => void;
}

export const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  isOpen,
  queue,
  currentIndex,
  onSave,
  onDontSave,
  onSaveAll,
  onDontSaveAll,
  onCancel,
}) => {
  const [remember, setRemember] = useState(false);

  if (!isOpen || queue.length === 0 || currentIndex >= queue.length) {
    return null;
  }

  const currentTab = queue[currentIndex];
  const isMultiple = queue.length > 1;
  const currentReq = currentTab.request;
  const reqName = currentTab.name || currentReq.name || 'Untitled Request';
  const methodColorClass = getMethodBadgeColor(currentReq.method);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Icon + Title */}
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-full bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400 shrink-0 mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">
                {isMultiple
                  ? `Save changes to request (${currentIndex + 1} of ${queue.length})`
                  : 'Do you want to save changes?'}
              </h3>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-white p-1 rounded hover:bg-gray-800 transition-colors"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Your changes to <span className="font-medium text-gray-200">"{reqName}"</span> will be lost if you close without saving.
            </p>
          </div>
        </div>

        {/* Request preview card */}
        <div className="p-3 bg-gray-950/70 border border-gray-800 rounded-lg flex items-center space-x-2.5 overflow-hidden text-xs">
          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${methodColorClass} shrink-0`}>
            {currentReq.method}
          </span>
          <span className="truncate text-gray-300 font-mono text-[11px] flex-1">
            {currentReq.url || 'No URL specified'}
          </span>
        </div>

        {/* Remember choice checkbox */}
        <div className="pt-1">
          <label className="flex items-start space-x-2.5 cursor-pointer text-xs text-gray-300 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="mt-0.5 rounded border-gray-700 bg-gray-950 text-orange-500 focus:ring-0 focus:ring-offset-0 cursor-pointer"
            />
            <div>
              <span className="font-medium text-gray-200">Remember my choice</span>
              <p className="text-[10px] text-gray-500">
                Apply this action automatically to unsaved requests in the future.
              </p>
            </div>
          </label>
        </div>

        {/* Multiple items batch actions (if queue > 1) */}
        {isMultiple && (
          <div className="flex items-center justify-between pt-2 border-t border-gray-800/80 text-[11px]">
            <span className="text-gray-500">Or apply to all {queue.length} unsaved:</span>
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => onDontSaveAll(remember)}
                className="px-2.5 py-1 text-gray-400 hover:text-rose-300 hover:bg-rose-500/10 rounded transition-colors"
              >
                Don't Save All
              </button>
              <button
                type="button"
                onClick={() => onSaveAll(remember)}
                className="px-2.5 py-1 text-orange-400 hover:text-orange-300 hover:bg-orange-500/10 rounded transition-colors font-medium flex items-center space-x-1"
              >
                <SaveAll className="w-3 h-3" />
                <span>Save All</span>
              </button>
            </div>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 bg-gray-800 hover:bg-gray-750 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onDontSave(remember)}
            className="px-3.5 py-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg transition-colors flex items-center space-x-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Don't Save</span>
          </button>
          <button
            type="button"
            onClick={() => onSave(remember)}
            className="px-4 py-1.5 text-xs font-semibold text-white bg-orange-600 hover:bg-orange-500 rounded-lg shadow-sm transition-colors flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save</span>
          </button>
        </div>
      </div>
    </div>
  );
};
