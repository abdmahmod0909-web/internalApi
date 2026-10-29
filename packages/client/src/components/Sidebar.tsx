import React, { useState } from 'react';
import { useAppStore } from '../store/useAppStore.js';
import {
  Folder,
  FolderOpen,
  FolderPlus,
  FilePlus,
  Edit3,
  Plus,
  Trash2,
  Clock,
  Layers,
  ChevronRight,
  ChevronDown,
  Search,
  Check,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import type { HttpMethod } from '@internalapi/shared';

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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'collections' | 'history'>('collections');
  const [filterText, setFilterText] = useState('');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});

  // Creation & Editing states
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newColName, setNewColName] = useState('');

  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingColName, setEditingColName] = useState('');

  const [addingFolderColId, setAddingFolderColId] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState('');

  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingFolderName, setEditingFolderName] = useState('');

  const [addingReqTarget, setAddingReqTarget] = useState<{ colId: string; folderId: string | null } | null>(null);
  const [newReqName, setNewReqName] = useState('');

  const [editingReqId, setEditingReqId] = useState<string | null>(null);
  const [editingReqName, setEditingReqName] = useState('');

  const {
    collections,
    history,
    openTab,
    createCollection,
    deleteCollection,
    renameCollection,
    addFolder,
    renameFolder,
    deleteFolder,
    addRequestToCollection,
    deleteRequestFromCollection,
    renameRequestInCollection,
    clearHistory,
  } = useAppStore();

  const toggleFolder = (id: string) => {
    setCollapsedFolders((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateCollection = () => {
    setIsCreatingCollection(true);
    setNewColName('');
  };

  const submitCreateCollection = () => {
    if (newColName.trim()) {
      createCollection(newColName.trim());
      setIsCreatingCollection(false);
      setNewColName('');
    }
  };

  const submitRenameCollection = (colId: string) => {
    if (editingColName.trim()) {
      renameCollection(colId, editingColName.trim());
    }
    setEditingColId(null);
  };

  const submitAddFolder = (colId: string) => {
    if (newFolderName.trim()) {
      addFolder(colId, newFolderName.trim());
      // Expand collection folder so new folder is visible
      setCollapsedFolders((prev) => ({ ...prev, [colId]: false }));
    }
    setAddingFolderColId(null);
    setNewFolderName('');
  };

  const submitRenameFolder = (colId: string, folderId: string) => {
    if (editingFolderName.trim()) {
      renameFolder(colId, folderId, editingFolderName.trim());
    }
    setEditingFolderId(null);
  };

  const submitAddRequest = () => {
    if (!addingReqTarget) return;
    const name = newReqName.trim() || 'New Request';
    addRequestToCollection(addingReqTarget.colId, addingReqTarget.folderId, name);
    if (addingReqTarget.folderId) {
      setCollapsedFolders((prev) => ({ ...prev, [addingReqTarget.folderId!]: false }));
    }
    setCollapsedFolders((prev) => ({ ...prev, [addingReqTarget.colId]: false }));
    setAddingReqTarget(null);
    setNewReqName('');
  };

  const submitRenameRequest = (colId: string, folderId: string | null, reqId: string) => {
    if (editingReqName.trim()) {
      renameRequestInCollection(colId, folderId, reqId, editingReqName.trim());
    }
    setEditingReqId(null);
  };

  const filteredHistory = history.filter((item) =>
    item.url.toLowerCase().includes(filterText.toLowerCase()) ||
    item.method.toLowerCase().includes(filterText.toLowerCase())
  );

  // Minimized / Collapsed View (Slim Icon Rail)
  if (isCollapsed) {
    return (
      <aside className="w-12 bg-gray-950 border-r border-gray-800 flex flex-col items-center py-2 select-none justify-between h-full shrink-0">
        <div className="flex flex-col items-center space-y-3 w-full">
          {/* Expand Button */}
          <button
            onClick={() => setIsCollapsed(false)}
            className="p-2 text-gray-400 hover:text-orange-400 hover:bg-gray-900 rounded transition-colors"
            title="Expand Sidebar"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>

          <div className="w-6 h-[1px] bg-gray-800"></div>

          {/* Collections Icon Button */}
          <button
            onClick={() => {
              setActiveTab('collections');
              setIsCollapsed(false);
            }}
            className={`p-2 rounded transition-colors relative ${
              activeTab === 'collections'
                ? 'text-orange-500 bg-gray-900'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/60'
            }`}
            title="Collections"
          >
            <Layers className="w-4 h-4" />
            {collections.length > 0 && (
              <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-orange-500 rounded-full"></span>
            )}
          </button>

          {/* History Icon Button */}
          <button
            onClick={() => {
              setActiveTab('history');
              setIsCollapsed(false);
            }}
            className={`p-2 rounded transition-colors ${
              activeTab === 'history'
                ? 'text-orange-500 bg-gray-900'
                : 'text-gray-400 hover:text-white hover:bg-gray-900/60'
            }`}
            title="History"
          >
            <Clock className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Add Collection */}
        <button
          onClick={() => {
            setIsCollapsed(false);
            setIsCreatingCollection(true);
          }}
          className="p-2 text-gray-400 hover:text-orange-400 hover:bg-gray-900 rounded"
          title="New Collection"
        >
          <Plus className="w-4 h-4" />
        </button>
      </aside>
    );
  }

  // Expanded Sidebar View
  return (
    <aside className="w-80 bg-gray-950 border-r border-gray-800 flex flex-col h-full select-none shrink-0">
      {/* Switcher: Collections vs History + Collapse Button */}
      <div className="flex border-b border-gray-800 text-xs font-semibold text-gray-400 items-center justify-between">
        <div className="flex flex-1">
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

        {/* Minimize / Collapse Button */}
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-2 text-gray-500 hover:text-gray-200 hover:bg-gray-900 rounded transition-colors mr-1"
          title="Collapse Sidebar"
        >
          <PanelLeftClose className="w-3.5 h-3.5" />
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
              <span>Collections ({collections.length})</span>
              <button
                onClick={handleCreateCollection}
                className="hover:text-orange-400 p-1 rounded hover:bg-gray-900 text-gray-400 flex items-center space-x-1 text-xs"
                title="Create New Collection"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Inline New Collection Input */}
            {isCreatingCollection && (
              <div className="flex items-center space-x-1 p-1.5 bg-gray-900 border border-orange-500/60 rounded mb-2">
                <Folder className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Collection name..."
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') submitCreateCollection();
                    if (e.key === 'Escape') setIsCreatingCollection(false);
                  }}
                  className="bg-transparent text-xs text-white outline-none w-full placeholder-gray-500 font-medium"
                />
                <button
                  onClick={submitCreateCollection}
                  className="p-1 text-emerald-400 hover:text-emerald-300"
                  title="Create"
                >
                  <Check className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsCreatingCollection(false)}
                  className="p-1 text-gray-400 hover:text-rose-400"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {collections.length === 0 && !isCreatingCollection ? (
              <div className="text-center py-8 text-xs text-gray-500">
                No collections yet.<br />
                <button
                  onClick={handleCreateCollection}
                  className="text-orange-500 hover:underline mt-1 inline-block"
                >
                  Click here to create one.
                </button>
              </div>
            ) : (
              collections.map((col) => (
                <div key={col.id} className="mb-2">
                  {/* Collection Header or Inline Rename */}
                  {editingColId === col.id ? (
                    <div className="flex items-center space-x-1 p-1 bg-gray-900 border border-orange-500 rounded">
                      <Folder className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        value={editingColName}
                        onChange={(e) => setEditingColName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitRenameCollection(col.id);
                          if (e.key === 'Escape') setEditingColId(null);
                        }}
                        className="bg-transparent text-xs text-white outline-none w-full font-medium"
                      />
                      <button
                        onClick={() => submitRenameCollection(col.id)}
                        className="p-1 text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setEditingColId(null)}
                        className="p-1 text-gray-400 hover:text-rose-400"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="group flex items-center justify-between px-2 py-1.5 text-xs text-gray-300 hover:bg-gray-900 rounded cursor-pointer transition-colors">
                      <div
                        className="flex items-center space-x-1.5 flex-1 min-w-0"
                        onClick={() => toggleFolder(col.id)}
                      >
                        {collapsedFolders[col.id] ? (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-500 shrink-0" />
                        )}
                        <Folder className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                        <span className="font-semibold truncate">{col.name}</span>
                      </div>

                      {/* Quick action buttons on collection row */}
                      <div className="flex items-center space-x-0.5 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingFolderColId(col.id);
                            setNewFolderName('');
                            setCollapsedFolders((prev) => ({ ...prev, [col.id]: false }));
                          }}
                          className="p-1 hover:text-amber-400 hover:bg-gray-800 text-gray-400 rounded transition-colors"
                          title="Add sub-folder to this collection"
                        >
                          <FolderPlus className="w-3.5 h-3.5 text-amber-500" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingReqTarget({ colId: col.id, folderId: null });
                            setNewReqName('');
                            setCollapsedFolders((prev) => ({ ...prev, [col.id]: false }));
                          }}
                          className="p-1 hover:text-emerald-400 hover:bg-gray-800 text-gray-400 rounded transition-colors"
                          title="Add request to this collection"
                        >
                          <FilePlus className="w-3.5 h-3.5 text-emerald-400" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingColId(col.id);
                            setEditingColName(col.name);
                          }}
                          className="p-1 hover:text-blue-400 hover:bg-gray-800 text-gray-400 rounded transition-colors"
                          title="Rename Collection"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteCollection(col.id);
                          }}
                          className="p-1 hover:text-rose-400 hover:bg-gray-800 text-gray-400 rounded transition-colors"
                          title={`Delete collection "${col.name}"`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Inline Add Folder Input for this collection */}
                  {addingFolderColId === col.id && (
                    <div className="flex items-center space-x-1 p-1 bg-gray-900 border border-amber-500/60 rounded ml-4 my-1">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="New folder name..."
                        value={newFolderName}
                        onChange={(e) => setNewFolderName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitAddFolder(col.id);
                          if (e.key === 'Escape') setAddingFolderColId(null);
                        }}
                        className="bg-transparent text-xs text-white outline-none w-full placeholder-gray-500"
                      />
                      <button
                        onClick={() => submitAddFolder(col.id)}
                        className="p-0.5 text-emerald-400 hover:text-emerald-300"
                        title="Create folder"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAddingFolderColId(null)}
                        className="p-0.5 text-gray-400 hover:text-rose-400"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Inline Add Request Input directly under collection */}
                  {addingReqTarget?.colId === col.id && addingReqTarget.folderId === null && (
                    <div className="flex items-center space-x-1 p-1 bg-gray-900 border border-emerald-500/60 rounded ml-4 my-1">
                      <FilePlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <input
                        autoFocus
                        type="text"
                        placeholder="New request name..."
                        value={newReqName}
                        onChange={(e) => setNewReqName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') submitAddRequest();
                          if (e.key === 'Escape') setAddingReqTarget(null);
                        }}
                        className="bg-transparent text-xs text-white outline-none w-full placeholder-gray-500"
                      />
                      <button
                        onClick={submitAddRequest}
                        className="p-0.5 text-emerald-400 hover:text-emerald-300"
                        title="Add request"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setAddingReqTarget(null)}
                        className="p-0.5 text-gray-400 hover:text-rose-400"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}

                  {/* Folders & Requests List */}
                  {!collapsedFolders[col.id] && (
                    <div className="pl-3 space-y-0.5 mt-0.5 border-l border-gray-800/80 ml-3">
                      {/* Prominent Action Bar inside expanded collection: + Folder | + Request */}
                      <div className="flex items-center space-x-2 py-1 px-1.5 text-[11px] bg-gray-900/60 rounded my-1 border border-gray-800/60">
                        <button
                          onClick={() => {
                            setAddingFolderColId(col.id);
                            setNewFolderName('');
                          }}
                          className="flex items-center space-x-1 text-amber-400/90 hover:text-amber-300 hover:bg-gray-800 px-1.5 py-0.5 rounded transition-colors"
                          title="Add folder to this collection"
                        >
                          <FolderPlus className="w-3.5 h-3.5 text-amber-400" />
                          <span>+ Folder</span>
                        </button>
                        <span className="text-gray-700">|</span>
                        <button
                          onClick={() => {
                            setAddingReqTarget({ colId: col.id, folderId: null });
                            setNewReqName('');
                          }}
                          className="flex items-center space-x-1 text-emerald-400/90 hover:text-emerald-300 hover:bg-gray-800 px-1.5 py-0.5 rounded transition-colors"
                          title="Add request to this collection"
                        >
                          <FilePlus className="w-3.5 h-3.5 text-emerald-400" />
                          <span>+ Request</span>
                        </button>
                      </div>

                      {/* Sub-Folders */}
                      {col.folders?.map((fld) => (
                        <div key={fld.id}>
                          {/* Folder Header or Inline Rename */}
                          {editingFolderId === fld.id ? (
                            <div className="flex items-center space-x-1 p-1 bg-gray-900 border border-amber-500 rounded my-0.5">
                              <FolderOpen className="w-3 h-3 text-amber-500 shrink-0" />
                              <input
                                autoFocus
                                type="text"
                                value={editingFolderName}
                                onChange={(e) => setEditingFolderName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') submitRenameFolder(col.id, fld.id);
                                  if (e.key === 'Escape') setEditingFolderId(null);
                                }}
                                className="bg-transparent text-xs text-white outline-none w-full"
                              />
                              <button
                                onClick={() => submitRenameFolder(col.id, fld.id)}
                                className="p-0.5 text-emerald-400"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setEditingFolderId(null)}
                                className="p-0.5 text-gray-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <div className="group flex items-center justify-between px-2 py-1 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-900 rounded cursor-pointer transition-colors">
                              <div
                                onClick={() => toggleFolder(fld.id)}
                                className="flex items-center space-x-1.5 flex-1 min-w-0"
                              >
                                {collapsedFolders[fld.id] ? (
                                  <ChevronRight className="w-3 h-3 text-gray-500 shrink-0" />
                                ) : (
                                  <ChevronDown className="w-3 h-3 text-gray-500 shrink-0" />
                                )}
                                <FolderOpen className="w-3 h-3 text-amber-500 shrink-0" />
                                <span className="truncate font-medium">{fld.name}</span>
                              </div>

                              {/* Folder Actions (Add Request, Rename, Delete) */}
                              <div className="flex items-center space-x-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setAddingReqTarget({ colId: col.id, folderId: fld.id });
                                    setNewReqName('');
                                    setCollapsedFolders((prev) => ({ ...prev, [fld.id]: false }));
                                  }}
                                  className="p-1 hover:text-emerald-400 hover:bg-gray-800 text-gray-400 rounded"
                                  title="Add Request to Folder"
                                >
                                  <FilePlus className="w-3 h-3 text-emerald-400" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingFolderId(fld.id);
                                    setEditingFolderName(fld.name);
                                  }}
                                  className="p-1 hover:text-blue-400 hover:bg-gray-800 text-gray-400 rounded"
                                  title="Rename Folder"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteFolder(col.id, fld.id);
                                  }}
                                  className="p-1 hover:text-rose-400 hover:bg-gray-800 text-gray-400 rounded"
                                  title="Delete Folder"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Inline Add Request Input inside this folder */}
                          {addingReqTarget?.colId === col.id && addingReqTarget.folderId === fld.id && (
                            <div className="flex items-center space-x-1 p-1 bg-gray-900 border border-emerald-500/60 rounded ml-4 my-1">
                              <FilePlus className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <input
                                autoFocus
                                type="text"
                                placeholder="Request name..."
                                value={newReqName}
                                onChange={(e) => setNewReqName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') submitAddRequest();
                                  if (e.key === 'Escape') setAddingReqTarget(null);
                                }}
                                className="bg-transparent text-xs text-white outline-none w-full placeholder-gray-500"
                              />
                              <button
                                onClick={submitAddRequest}
                                className="p-0.5 text-emerald-400 hover:text-emerald-300"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                onClick={() => setAddingReqTarget(null)}
                                className="p-0.5 text-gray-400 hover:text-rose-400"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          )}

                          {/* Requests in Folder */}
                          {!collapsedFolders[fld.id] && (
                            <div className="pl-3 space-y-0.5 border-l border-gray-800/60 ml-2">
                              {fld.requests?.map((req) => {
                                const reqId = req.id || `req-${Math.random()}`;
                                return (
                                  <div key={reqId}>
                                    {editingReqId === reqId ? (
                                      <div className="flex items-center space-x-1 p-1 bg-gray-900 border border-blue-500 rounded my-0.5">
                                        <input
                                          autoFocus
                                          type="text"
                                          value={editingReqName}
                                          onChange={(e) => setEditingReqName(e.target.value)}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') submitRenameRequest(col.id, fld.id, reqId);
                                            if (e.key === 'Escape') setEditingReqId(null);
                                          }}
                                          className="bg-transparent text-xs text-white outline-none w-full"
                                        />
                                        <button
                                          onClick={() => submitRenameRequest(col.id, fld.id, reqId)}
                                          className="p-0.5 text-emerald-400"
                                        >
                                          <Check className="w-3 h-3" />
                                        </button>
                                        <button
                                          onClick={() => setEditingReqId(null)}
                                          className="p-0.5 text-gray-400"
                                        >
                                          <X className="w-3 h-3" />
                                        </button>
                                      </div>
                                    ) : (
                                      <div
                                        onClick={() => openTab(req, reqId)}
                                        className="group flex items-center justify-between px-2 py-1 text-xs text-gray-300 hover:bg-gray-850 hover:text-white rounded cursor-pointer transition-colors"
                                      >
                                        <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                          <span className={`text-[10px] font-bold shrink-0 ${getMethodColor(req.method)}`}>
                                            {req.method}
                                          </span>
                                          <span className="truncate">{req.name}</span>
                                        </div>

                                        <div className="flex items-center space-x-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingReqId(reqId);
                                              setEditingReqName(req.name || 'Untitled Request');
                                            }}
                                            className="p-0.5 hover:text-blue-400 hover:bg-gray-800 text-gray-400 rounded"
                                            title="Rename Request"
                                          >
                                            <Edit3 className="w-3 h-3" />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteRequestFromCollection(col.id, fld.id, reqId);
                                            }}
                                            className="p-0.5 hover:text-rose-400 hover:bg-gray-800 text-gray-400 rounded"
                                            title="Delete Request"
                                          >
                                            <Trash2 className="w-3 h-3" />
                                          </button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ))}

                      {/* Direct Requests in Collection */}
                      {col.requests?.map((req) => {
                        const reqId = req.id || `req-${Math.random()}`;
                        return (
                          <div key={reqId}>
                            {editingReqId === reqId ? (
                              <div className="flex items-center space-x-1 p-1 bg-gray-900 border border-blue-500 rounded my-0.5">
                                <input
                                  autoFocus
                                  type="text"
                                  value={editingReqName}
                                  onChange={(e) => setEditingReqName(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') submitRenameRequest(col.id, null, reqId);
                                    if (e.key === 'Escape') setEditingReqId(null);
                                  }}
                                  className="bg-transparent text-xs text-white outline-none w-full"
                                />
                                <button
                                  onClick={() => submitRenameRequest(col.id, null, reqId)}
                                  className="p-0.5 text-emerald-400"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => setEditingReqId(null)}
                                  className="p-0.5 text-gray-400"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ) : (
                              <div
                                onClick={() => openTab(req, reqId)}
                                className="group flex items-center justify-between px-2 py-1 text-xs text-gray-300 hover:bg-gray-850 hover:text-white rounded cursor-pointer transition-colors"
                              >
                                <div className="flex items-center space-x-1.5 flex-1 min-w-0">
                                  <span className={`text-[10px] font-bold shrink-0 ${getMethodColor(req.method)}`}>
                                    {req.method}
                                  </span>
                                  <span className="truncate">{req.name}</span>
                                </div>

                                <div className="flex items-center space-x-0.5 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingReqId(reqId);
                                      setEditingReqName(req.name || 'Untitled Request');
                                    }}
                                    className="p-0.5 hover:text-blue-400 hover:bg-gray-800 text-gray-400 rounded"
                                    title="Rename Request"
                                  >
                                    <Edit3 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      deleteRequestFromCollection(col.id, null, reqId);
                                    }}
                                    className="p-0.5 hover:text-rose-400 hover:bg-gray-800 text-gray-400 rounded"
                                    title="Delete Request"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
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
                  onClick={() => clearHistory()}
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
