import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { Briefcase, X, Plus } from 'lucide-react';

export const WorkspaceModal: React.FC = () => {
  const { isWorkspaceModalOpen, setWorkspaceModalOpen, createWorkspace } = useAppStore();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isWorkspaceModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await createWorkspace(name.trim(), description.trim() || undefined);
      setName('');
      setDescription('');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    setWorkspaceModalOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150"
      onClick={handleClose}
      onKeyDown={(e) => e.key === 'Escape' && handleClose()}
    >
      <div
        className="bg-gray-900 border border-gray-800 rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800 bg-gray-950/50">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 rounded-md bg-orange-500/10 text-orange-400">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-gray-100">Create New Workspace</h3>
              <p className="text-xs text-gray-400">Organize your collections, environments, and flows</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-200 p-1 rounded-md hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Workspace Name <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              autoFocus
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Payments Team, Public API, Mobile App"
              className="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-300 mb-1.5">
              Description <span className="text-gray-500 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What APIs and workflows will be maintained in this workspace?"
              className="w-full bg-gray-950 border border-gray-800 rounded-md px-3 py-2 text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all resize-none"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex items-center justify-end space-x-2 pt-2 border-t border-gray-800/80">
            <button
              type="button"
              onClick={handleClose}
              className="px-3.5 py-1.5 text-xs text-gray-300 hover:text-white bg-gray-800 hover:bg-gray-750 rounded-md transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim() || isSubmitting}
              className="flex items-center space-x-1.5 px-4 py-1.5 text-xs font-medium text-white bg-orange-600 hover:bg-orange-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-md transition-colors shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Creating...' : 'Create Workspace'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

