import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { downloadCollectionAsJson } from '../../utils/export-collection.js';
import {
  Download,
  FileJson,
  Folder,
  Layers,
  Check,
  X,
  Sparkles,
  Info,
} from 'lucide-react';

export const ExportModal: React.FC = () => {
  const { isExportModalOpen, setExportModalOpen, collections } = useAppStore();
  const [selectedColId, setSelectedColId] = useState<string>(
    collections[0]?.id || ''
  );
  const [exportedId, setExportedId] = useState<string | null>(null);

  if (!isExportModalOpen) return null;

  const currentSelectedCol = collections.find((c) => c.id === selectedColId) || collections[0];

  const handleExportSingle = (colId: string) => {
    const col = collections.find((c) => c.id === colId);
    if (!col) return;
    downloadCollectionAsJson(col);
    setExportedId(colId);
    setTimeout(() => setExportedId(null), 1500);
  };

  const handleExportAll = () => {
    for (const col of collections) {
      downloadCollectionAsJson(col);
    }
    setExportedId('all');
    setTimeout(() => setExportedId(null), 1500);
  };

  const countRequests = (col: typeof currentSelectedCol) => {
    if (!col) return 0;
    let count = col.requests?.length || 0;
    if (col.folders) {
      for (const f of col.folders) {
        count += f.requests?.length || 0;
      }
    }
    return count;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Download className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Export Collections</h2>
              <p className="text-xs text-gray-400">Export your APIs as standard Collection v2.1</p>
            </div>
          </div>
          <button
            onClick={() => setExportModalOpen(false)}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs">
          {/* Format Info Banner */}
          <div className="flex items-start space-x-2.5 p-3 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-300">
            <Info className="w-4 h-4 shrink-0 mt-0.5 text-orange-400" />
            <div className="text-[11px] leading-relaxed">
              Exported files use the official <strong className="text-white">Collection v2.1.0</strong> JSON schema. You can import them directly into Postman, Insomnia, Bruno, or another InternalAPI instance.
            </div>
          </div>

          {collections.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Layers className="w-8 h-8 mx-auto mb-2 opacity-40 text-gray-400" />
              <p>No collections found in this workspace to export.</p>
            </div>
          ) : (
            <>
              {/* Collection Selection */}
              <div className="space-y-1.5">
                <label className="font-medium text-gray-300">Choose Collection to Export</label>
                <select
                  value={selectedColId || (collections[0]?.id ?? '')}
                  onChange={(e) => setSelectedColId(e.target.value)}
                  className="w-full px-3 py-2 bg-gray-950 border border-gray-800 rounded-md text-gray-200 focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  {collections.map((col) => (
                    <option key={col.id} value={col.id} className="bg-gray-900 text-gray-200">
                      {col.name} ({countRequests(col)} requests)
                    </option>
                  ))}
                </select>
              </div>

              {/* Selected Collection Summary Card */}
              {currentSelectedCol && (
                <div className="p-3.5 bg-gray-950/70 border border-gray-800 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-gray-200 text-xs flex items-center space-x-1.5">
                      <FileJson className="w-3.5 h-3.5 text-orange-400" />
                      <span>{currentSelectedCol.name}</span>
                    </span>
                    <span className="px-2 py-0.5 text-[10px] bg-orange-500/10 text-orange-400 rounded-full font-mono font-medium">
                      Postman v2.1
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 text-[11px] text-gray-400">
                    <div className="flex items-center space-x-1.5">
                      <Folder className="w-3 h-3 text-gray-500" />
                      <span>Folders: {currentSelectedCol.folders?.length || 0}</span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <Layers className="w-3 h-3 text-gray-500" />
                      <span>Total Requests: {countRequests(currentSelectedCol)}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-2.5">
                {collections.length > 1 && (
                  <button
                    onClick={handleExportAll}
                    className="w-full sm:w-auto px-3.5 py-2 bg-gray-800 hover:bg-gray-750 text-gray-200 hover:text-white border border-gray-700 rounded-md font-medium text-xs transition-colors flex items-center justify-center space-x-1.5"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-400" />
                    <span>{exportedId === 'all' ? 'Exported All!' : `Export All (${collections.length})`}</span>
                  </button>
                )}

                <button
                  onClick={() => currentSelectedCol && handleExportSingle(currentSelectedCol.id)}
                  className="w-full sm:flex-1 py-2 px-4 bg-orange-600 hover:bg-orange-500 text-white font-semibold rounded-md shadow text-xs transition-colors flex items-center justify-center space-x-2"
                >
                  {exportedId === currentSelectedCol?.id ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-300" />
                      <span>Downloaded!</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Collection JSON</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
