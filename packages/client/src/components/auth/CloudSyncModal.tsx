import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import {
  Cloud,
  Server,
  UploadCloud,
  DownloadCloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  ExternalLink,
} from 'lucide-react';

export const CloudSyncModal: React.FC = () => {
  const {
    isCloudSettingsOpen,
    setCloudSettingsOpen,
    serverUrl,
    setServerUrl,
    syncStatus,
    syncMessage,
    syncLocalToCloudAction,
    syncCloudToLocalAction,
  } = useAppStore();

  const [inputUrl, setInputUrl] = useState(serverUrl);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isCloudSettingsOpen) return null;

  const handleSaveUrl = () => {
    setServerUrl(inputUrl);
    setTestResult({ success: true, message: 'Server URL saved successfully!' });
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const clean = inputUrl.trim().replace(/\/+$/, '');
      const healthUrl = clean ? `${clean}/health` : '/health';
      const res = await fetch(healthUrl);
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          success: true,
          message: `Connected successfully! Service: ${data.service || 'InternalAPI'} (v${data.version || '1.0.0'})`,
        });
      } else {
        setTestResult({
          success: false,
          message: `Server returned HTTP status ${res.status}: ${res.statusText}`,
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err.message || 'Host unreachable'}`,
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gray-950/60">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Cloud Server & Synchronization</h2>
              <p className="text-xs text-gray-400">Link your desktop app with your hosted cloud server</p>
            </div>
          </div>
          <button
            onClick={() => setCloudSettingsOpen(false)}
            className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs">
          {/* Server URL Input */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-medium text-gray-300 flex items-center space-x-1.5">
                <Server className="w-3.5 h-3.5 text-orange-400" />
                <span>Cloud Server Host URL</span>
              </label>
              <span className="text-[10px] text-gray-500">
                {serverUrl ? 'Connected to Remote' : 'Using Local Server'}
              </span>
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={inputUrl}
                onChange={(e) => setInputUrl(e.target.value)}
                placeholder="e.g. https://api.mycompany.com or http://192.168.1.100:3001"
                className="flex-1 px-3 py-2 bg-gray-950 border border-gray-800 rounded-md text-gray-200 placeholder-gray-600 focus:outline-none focus:border-orange-500 font-mono text-xs"
              />
              <button
                onClick={handleSaveUrl}
                className="px-3 py-2 bg-gray-800 hover:bg-gray-750 text-gray-200 rounded-md font-medium border border-gray-700 transition-colors"
              >
                Save
              </button>
            </div>
            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleTestConnection}
                disabled={testing}
                className="text-orange-400 hover:text-orange-300 font-medium text-[11px] flex items-center space-x-1"
              >
                {testing ? (
                  <RefreshCw className="w-3 h-3 animate-spin" />
                ) : (
                  <RefreshCw className="w-3 h-3" />
                )}
                <span>Test Connection</span>
              </button>
              {serverUrl && (
                <button
                  onClick={() => {
                    setInputUrl('');
                    setServerUrl('');
                    setTestResult({ success: true, message: 'Reset to local desktop server.' });
                  }}
                  className="text-gray-500 hover:text-gray-300 text-[11px]"
                >
                  Reset to Local
                </button>
              )}
            </div>
          </div>

          {/* Test Status feedback */}
          {testResult && (
            <div
              className={`flex items-start space-x-2 p-3 rounded-lg border ${
                testResult.success
                  ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                  : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{testResult.message}</span>
            </div>
          )}

          {/* Cloud Sync Actions */}
          <div className="p-4 bg-gray-950/70 border border-gray-800 rounded-lg space-y-3">
            <div className="font-semibold text-gray-200 flex items-center space-x-1.5">
              <Cloud className="w-3.5 h-3.5 text-orange-400" />
              <span>Workspace Synchronization</span>
            </div>
            <p className="text-[11px] text-gray-400">
              Synchronize your collections, folders, and environment configurations between your local desktop client and team server.
            </p>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <button
                onClick={syncLocalToCloudAction}
                disabled={syncStatus === 'syncing'}
                className="flex items-center justify-center space-x-2 py-2 px-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-md text-gray-200 hover:text-white transition-colors"
              >
                <UploadCloud className="w-3.5 h-3.5 text-orange-400" />
                <span className="font-medium">Upload to Cloud</span>
              </button>

              <button
                onClick={syncCloudToLocalAction}
                disabled={syncStatus === 'syncing'}
                className="flex items-center justify-center space-x-2 py-2 px-3 bg-gray-900 hover:bg-gray-800 border border-gray-700 rounded-md text-gray-200 hover:text-white transition-colors"
              >
                <DownloadCloud className="w-3.5 h-3.5 text-blue-400" />
                <span className="font-medium">Download from Cloud</span>
              </button>
            </div>

            {syncMessage && (
              <div className="text-[11px] text-gray-400 pt-1 flex items-center space-x-1.5 font-mono">
                {syncStatus === 'syncing' && <RefreshCw className="w-3 h-3 animate-spin text-orange-400" />}
                {syncStatus === 'synced' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                {syncStatus === 'error' && <AlertCircle className="w-3 h-3 text-rose-400" />}
                <span>{syncMessage}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
