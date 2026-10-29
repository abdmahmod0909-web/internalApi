import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { X, Upload, FileText, CheckCircle2 } from 'lucide-react';
import { isPostmanCollection, importPostmanCollection, isCurlCommand, parseCurlCommand } from '@internalapi/shared';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ImportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'raw'>('file');
  const [rawText, setRawText] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const { activeWorkspaceId, createCollection, openTab } = useAppStore();

  if (!isOpen) return null;

  const handleProcessImport = async (content: string) => {
    setErrorMsg(null);
    setSuccessMsg(null);

    const trimmed = content.trim();
    if (!trimmed) {
      setErrorMsg('Please enter or upload a Postman collection or cURL string.');
      return;
    }

    // 1. Check if cURL
    if (isCurlCommand(trimmed)) {
      try {
        const parsed = parseCurlCommand(trimmed);
        openTab(parsed);
        setSuccessMsg(`Imported cURL into active request!`);
        setTimeout(() => onClose(), 1200);
        return;
      } catch (e: any) {
        setErrorMsg('Failed to parse cURL: ' + e.message);
        return;
      }
    }

    // 2. Check if JSON (Postman or InternalAPI Collection)
    try {
      const parsedJson = JSON.parse(trimmed);

      if (isPostmanCollection(parsedJson)) {
        const converted = importPostmanCollection(parsedJson, activeWorkspaceId);
        // Save collection to backend
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(converted),
        });
        const saved = await res.json();
        useAppStore.setState((state) => {
          const next = [...state.collections, saved];
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('internalapi_collections', JSON.stringify(next));
            }
          } catch {}
          return { collections: next };
        });
        setSuccessMsg(`Collection "${saved.name}" imported with ${saved.folders?.length || 0} folders and ${saved.requests?.length || 0} requests!`);
        setTimeout(() => onClose(), 1500);
        return;
      }

      // If generic collection JSON
      if (parsedJson.name && (Array.isArray(parsedJson.folders) || Array.isArray(parsedJson.requests))) {
        const col = {
          ...parsedJson,
          id: `col-${Date.now()}`,
          workspaceId: activeWorkspaceId,
        };
        const res = await fetch('/api/collections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(col),
        });
        const saved = await res.json();
        useAppStore.setState((state) => {
          const next = [...state.collections, saved];
          try {
            if (typeof window !== 'undefined' && window.localStorage) {
              window.localStorage.setItem('internalapi_collections', JSON.stringify(next));
            }
          } catch {}
          return { collections: next };
        });
        setSuccessMsg(`Collection "${saved.name}" imported successfully!`);
        setTimeout(() => onClose(), 1500);
        return;
      }

      setErrorMsg('JSON is not recognized as a valid Postman v2.1 or InternalAPI collection.');
    } catch (e: any) {
      setErrorMsg('Invalid JSON format: ' + e.message);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        handleProcessImport(text);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-2xl w-full max-w-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Upload className="w-5 h-5 text-orange-500" />
            <h2 className="text-sm font-semibold text-white">Import Collection or cURL</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switcher: File Upload vs Raw Text */}
        <div className="flex border-b border-gray-800 text-xs px-5 bg-gray-950">
          <button
            onClick={() => setActiveTab('file')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'file' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Upload JSON File
          </button>
          <button
            onClick={() => setActiveTab('raw')}
            className={`py-2.5 px-3 border-b-2 font-medium transition-colors ${
              activeTab === 'raw' ? 'border-orange-500 text-orange-500' : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            Raw Text / cURL / JSON
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4">
          {errorMsg && (
            <div className="p-2.5 bg-rose-950/50 border border-rose-800 rounded text-rose-300 text-xs">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-2.5 bg-emerald-950/50 border border-emerald-800 rounded text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {activeTab === 'file' && (
            <div className="border-2 border-dashed border-gray-800 hover:border-orange-500/60 rounded-lg p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-colors bg-gray-950/40 relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
              <FileText className="w-10 h-10 text-gray-500 mb-2" />
              <p className="text-xs font-medium text-gray-200">
                Drop your Postman collection file here, or <span className="text-orange-500">browse</span>
              </p>
              <p className="text-[11px] text-gray-500 mt-1">Supports Postman Collection v2.1 (.json)</p>
            </div>
          )}

          {activeTab === 'raw' && (
            <div>
              <textarea
                rows={10}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                placeholder="Paste Postman Collection v2.1 JSON or cURL command..."
                className="w-full bg-gray-950 border border-gray-800 rounded p-3 text-xs text-gray-100 font-mono outline-none focus:border-orange-500"
              />
              <button
                onClick={() => handleProcessImport(rawText)}
                className="mt-3 w-full bg-orange-600 hover:bg-orange-500 text-white font-medium py-2 rounded text-xs transition-colors flex items-center justify-center space-x-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Collection / cURL</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
