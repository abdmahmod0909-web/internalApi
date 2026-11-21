import React from 'react';
import { AlertTriangle, Trash2, Folder, Layers, Send, Workflow, X, Loader2 } from 'lucide-react';

export type DeleteItemType = 'request' | 'folder' | 'collection' | 'flow' | 'environment';

export interface DeleteTarget {
  type: DeleteItemType;
  id: string;
  name: string;
  method?: string;
  collectionId?: string;
  folderId?: string | null;
  count?: number;
  subcount?: { folders?: number; requests?: number };
}

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  target: DeleteTarget | null;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  isDeleting?: boolean;
}

function getItemIcon(type: DeleteItemType) {
  switch (type) {
    case 'collection':
      return <Layers className="w-5 h-5 text-rose-400" />;
    case 'folder':
      return <Folder className="w-5 h-5 text-rose-400" />;
    case 'flow':
      return <Workflow className="w-5 h-5 text-rose-400" />;
    case 'request':
    default:
      return <Send className="w-5 h-5 text-rose-400" />;
  }
}

function getMethodBadgeColor(method?: string): string {
  switch (method?.toUpperCase()) {
    case 'GET':
      return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
    case 'POST':
      return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
    case 'PUT':
      return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    case 'PATCH':
      return 'text-purple-400 bg-purple-500/10 border-purple-500/30';
    case 'DELETE':
      return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
    default:
      return 'text-gray-400 bg-gray-500/10 border-gray-500/30';
  }
}

export const ConfirmDeleteModal: React.FC<ConfirmDeleteModalProps> = ({
  isOpen,
  target,
  onConfirm,
  onCancel,
  isDeleting = false,
}) => {
  if (!isOpen || !target) return null;

  const itemTypeName = target.type.charAt(0).toUpperCase() + target.type.slice(1);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={onCancel}
    >
      <div
        className="relative w-full max-w-md bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-800/80 bg-gray-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
              {getItemIcon(target.type)}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Delete {itemTypeName}</h3>
              <p className="text-[11px] text-gray-400">Confirmation required</p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-800/70 rounded-md transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4">
          <div className="p-3.5 bg-gray-950/60 border border-gray-800 rounded-lg space-y-2">
            <div className="flex items-center space-x-2">
              {target.type === 'request' && target.method && (
                <span
                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border uppercase shrink-0 ${getMethodBadgeColor(
                    target.method
                  )}`}
                >
                  {target.method}
                </span>
              )}
              <span className="text-sm font-semibold text-white truncate" title={target.name}>
                {target.name}
              </span>
            </div>

            {/* Impact Details */}
            {target.type === 'collection' && target.subcount && (
              <p className="text-xs text-rose-300/90 flex items-center space-x-1.5 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>
                  Deleting this collection will permanently remove{' '}
                  <strong>{target.subcount.folders || 0}</strong> folders and{' '}
                  <strong>{target.subcount.requests || 0}</strong> requests inside it.
                </span>
              </p>
            )}

            {target.type === 'folder' && target.count !== undefined && target.count > 0 && (
              <p className="text-xs text-rose-300/90 flex items-center space-x-1.5 pt-1">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                <span>
                  This folder contains <strong>{target.count}</strong> request{target.count > 1 ? 's' : ''} which will also be deleted.
                </span>
              </p>
            )}
          </div>

          <p className="text-xs text-gray-300">
            Are you sure you want to delete this {target.type}? This action cannot be undone.
          </p>
        </div>

        {/* Actions Footer */}
        <div className="flex items-center justify-end space-x-2.5 px-5 py-3.5 border-t border-gray-800/80 bg-gray-950/50">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-3.5 py-1.5 text-xs font-medium text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Deleting...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete {itemTypeName}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
