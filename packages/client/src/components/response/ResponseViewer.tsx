import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { Copy, Download, Search, Check, Clock, HardDrive, Info } from 'lucide-react';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const ResponseViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pretty' | 'raw' | 'preview' | 'headers' | 'cookies'>('pretty');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { tabs, activeTabId } = useAppStore();
  const currentTab = tabs.find((t) => t.id === activeTabId);
  const response = currentTab?.response;

  if (!response) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-gray-500 bg-gray-950 select-none">
        <div className="w-12 h-12 rounded-full border border-gray-800 flex items-center justify-center mb-3">
          <Clock className="w-5 h-5 text-gray-600" />
        </div>
        <p className="text-sm font-medium text-gray-400">No response yet</p>
        <p className="text-xs text-gray-600 mt-1">Hit Send (or Ctrl+Enter) to execute the request.</p>
      </div>
    );
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(response.body);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([response.body], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `response-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Prettify body if JSON
  let formattedBody = response.body;
  let isJson = false;
  try {
    const parsed = JSON.parse(response.body);
    formattedBody = JSON.stringify(parsed, null, 2);
    isJson = true;
  } catch {
    // Keep raw
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950 overflow-hidden">
      {/* Response Status Bar */}
      <div className="h-11 px-3 border-b border-gray-800 flex items-center justify-between bg-gray-950 select-none">
        <div className="flex items-center space-x-3 text-xs">
          {/* Status Badge */}
          <div
            className={`font-bold px-2 py-0.5 rounded text-xs flex items-center space-x-1 ${
              response.status >= 200 && response.status < 300
                ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                : response.status >= 400
                ? 'bg-rose-950 text-rose-400 border border-rose-800'
                : 'bg-gray-800 text-gray-300 border border-gray-700'
            }`}
          >
            <span>{response.status}</span>
            <span>{response.statusText}</span>
          </div>

          {/* Time with Tooltip */}
          <div
            className="flex items-center space-x-1 text-gray-300 hover:text-orange-400 cursor-help"
            title={`Timings:\nDNS: ${response.timings?.dns ?? 0}ms\nTCP: ${response.timings?.tcp ?? 0}ms\nTLS: ${response.timings?.tls ?? 0}ms\nTTFB: ${response.timings?.ttfb ?? 0}ms\nDownload: ${response.timings?.download ?? 0}ms\nTotal: ${response.time}ms`}
          >
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            <span>{response.time} ms</span>
            <Info className="w-3 h-3 text-gray-500 ml-0.5" />
          </div>

          {/* Size */}
          <div className="flex items-center space-x-1 text-gray-300">
            <HardDrive className="w-3.5 h-3.5 text-gray-500" />
            <span>{formatBytes(response.size)}</span>
          </div>
        </div>

        {/* Action Buttons: Copy / Download */}
        <div className="flex items-center space-x-1">
          <button
            onClick={handleCopy}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-850 rounded"
            title="Copy Response"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            className="p-1.5 text-gray-400 hover:text-gray-200 hover:bg-gray-850 rounded"
            title="Download Response"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tabs & Search */}
      <div className="flex items-center justify-between border-b border-gray-800 px-3 bg-gray-950 select-none">
        <div className="flex space-x-1 text-xs">
          {[
            { key: 'pretty', label: 'Pretty' },
            { key: 'raw', label: 'Raw' },
            { key: 'preview', label: 'Preview' },
            { key: 'headers', label: `Headers (${Object.keys(response.headers || {}).length})` },
            { key: 'cookies', label: `Cookies (${response.cookies?.length || 0})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-2.5 text-xs font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Quick Search */}
        {(activeTab === 'pretty' || activeTab === 'raw') && (
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded px-2 py-0.5 my-1">
            <Search className="w-3 h-3 text-gray-500 mr-1.5" />
            <input
              type="text"
              placeholder="Search response..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent text-[11px] text-gray-200 outline-none w-36 placeholder-gray-600"
            />
          </div>
        )}
      </div>

      {/* Response Body & Views */}
      <div className="flex-1 overflow-auto p-3 text-xs">
        {response.error && (
          <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded text-rose-300 font-mono mb-3">
            Error: {response.error}
          </div>
        )}

        {activeTab === 'pretty' && (
          <pre className="font-mono text-[11px] text-gray-200 leading-relaxed whitespace-pre-wrap select-text">
            {formattedBody}
          </pre>
        )}

        {activeTab === 'raw' && (
          <pre className="font-mono text-[11px] text-gray-300 whitespace-pre-wrap select-text">
            {response.body}
          </pre>
        )}

        {activeTab === 'preview' && (
          <iframe
            srcDoc={response.body}
            sandbox="allow-same-origin"
            title="Response Preview"
            className="w-full h-full bg-white rounded border border-gray-800 min-h-[300px]"
          />
        )}

        {activeTab === 'headers' && (
          <div className="space-y-1 font-mono text-xs select-text">
            {Object.entries(response.headers || {}).map(([key, val]) => (
              <div key={key} className="grid grid-cols-[200px_1fr] py-1 border-b border-gray-900">
                <span className="text-gray-400 font-semibold">{key}:</span>
                <span className="text-gray-200 break-all">{Array.isArray(val) ? val.join(', ') : val}</span>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'cookies' && (
          <div className="text-xs">
            {(!response.cookies || response.cookies.length === 0) ? (
              <div className="text-center py-8 text-gray-500">No cookies returned.</div>
            ) : (
              <div className="divide-y divide-gray-800">
                {response.cookies.map((c, i) => (
                  <div key={i} className="py-2 space-y-1 font-mono select-text">
                    <div className="flex items-center space-x-2">
                      <span className="text-orange-400 font-bold">{c.name}</span>
                      <span className="text-gray-300">= {c.value}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 space-x-3">
                      {c.domain && <span>Domain: {c.domain}</span>}
                      {c.path && <span>Path: {c.path}</span>}
                      {c.expires && <span>Expires: {c.expires}</span>}
                      {c.httpOnly && <span className="text-amber-500">HttpOnly</span>}
                      {c.secure && <span className="text-emerald-500">Secure</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

