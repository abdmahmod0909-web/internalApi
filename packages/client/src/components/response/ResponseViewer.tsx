import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { Copy, Download, Search, Check, Clock, HardDrive, Info, CheckCircle2, XCircle, FileText, X, ChevronUp, ChevronDown } from 'lucide-react';
import { JsonViewer, highlightMatch } from './JsonViewer.js';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export const ResponseViewer: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pretty' | 'raw' | 'preview' | 'headers' | 'cookies' | 'tests'>('pretty');
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeMatchIndex, setActiveMatchIndex] = useState(0);
  const [totalMatches, setTotalMatches] = useState(0);

  const goToNextMatch = () => {
    if (totalMatches === 0) return;
    setActiveMatchIndex((prev) => (prev + 1) % totalMatches);
  };

  const goToPrevMatch = () => {
    if (totalMatches === 0) return;
    setActiveMatchIndex((prev) => (prev - 1 + totalMatches) % totalMatches);
  };

  const { tabs, activeTabId } = useAppStore();
  const currentTab = tabs.find((t) => t.id === activeTabId);
  const response = currentTab?.response;
  const testResults = currentTab?.testResults;
  const scriptLogs = currentTab?.scriptLogs;

  const passedTestsCount = testResults?.filter((t) => t.passed).length || 0;
  const totalTestsCount = testResults?.length || 0;

  const matchCount = useMemo(() => {
    if (!searchTerm || !searchTerm.trim() || !response?.body) return 0;
    try {
      const q = searchTerm.trim().toLowerCase();
      let count = 0;
      let pos = 0;
      const bodyLower = response.body.toLowerCase();
      while ((pos = bodyLower.indexOf(q, pos)) !== -1) {
        count++;
        pos += q.length;
      }
      return count;
    } catch {
      return 0;
    }
  }, [searchTerm, response?.body]);

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
            ...(totalTestsCount > 0
              ? [
                  {
                    key: 'tests',
                    label: `Test Results (${passedTestsCount}/${totalTestsCount})`,
                    badge: passedTestsCount === totalTestsCount ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400',
                  },
                ]
              : currentTab?.request.postScript
              ? [{ key: 'tests', label: 'Test Results' }]
              : []),
          ].map((tab: any) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-2.5 text-xs font-medium border-b-2 transition-colors flex items-center space-x-1 ${
                activeTab === tab.key
                  ? 'border-orange-500 text-orange-500'
                  : 'border-transparent text-gray-400 hover:text-gray-200'
              }`}
            >
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Quick Search for Keys (Columns) and Data (Values) with Match Navigation */}
        {(activeTab === 'pretty' || activeTab === 'raw') && (
          <div className="flex items-center bg-gray-900 border border-gray-800 rounded px-2 py-0.5 my-1 focus-within:border-orange-500 transition-colors">
            <Search className="w-3 h-3 text-gray-500 mr-1.5 shrink-0" />
            <input
              type="text"
              placeholder="Search keys & values..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setActiveMatchIndex(0);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (e.shiftKey) goToPrevMatch();
                  else goToNextMatch();
                } else if (e.key === 'Escape') {
                  setSearchTerm('');
                  setActiveMatchIndex(0);
                }
              }}
              className="bg-transparent text-[11px] text-gray-200 outline-none w-36 placeholder-gray-600"
            />
            {searchTerm && (
              <div className="flex items-center space-x-1.5 ml-1 text-[10px] border-l border-gray-800 pl-1.5 shrink-0">
                <span className={totalMatches > 0 ? 'text-amber-400 font-semibold' : 'text-gray-500'}>
                  {totalMatches > 0 ? `${activeMatchIndex + 1} of ${totalMatches}` : '0 matches'}
                </span>

                {totalMatches > 0 && (
                  <div className="flex items-center space-x-0.5">
                    <button
                      onClick={goToPrevMatch}
                      className="text-gray-400 hover:text-white hover:bg-gray-800 p-0.5 rounded transition-colors"
                      title="Previous match (Shift+Enter)"
                    >
                      <ChevronUp className="w-3 h-3" />
                    </button>
                    <button
                      onClick={goToNextMatch}
                      className="text-gray-400 hover:text-white hover:bg-gray-800 p-0.5 rounded transition-colors"
                      title="Next match (Enter)"
                    >
                      <ChevronDown className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <button
                  onClick={() => {
                    setSearchTerm('');
                    setActiveMatchIndex(0);
                  }}
                  className="text-gray-400 hover:text-gray-200 p-0.5 rounded transition-colors"
                  title="Clear search (Esc)"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            )}
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
          <JsonViewer
            jsonString={response.body}
            searchTerm={searchTerm}
            activeMatchIndex={activeMatchIndex}
            onTotalMatchesChange={setTotalMatches}
          />
        )}

        {activeTab === 'raw' && (
          <pre className="font-mono text-[11px] text-gray-300 whitespace-pre-wrap select-text leading-relaxed">
            {highlightMatch(response.body, searchTerm, 'text-gray-300')}
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

        {activeTab === 'tests' && (
          <div className="space-y-3">
            {/* Summary Banner */}
            <div className="flex items-center space-x-3 p-3 bg-gray-900 border border-gray-800 rounded">
              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                passedTestsCount === totalTestsCount && totalTestsCount > 0
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-rose-950 text-rose-400 border border-rose-800'
              }`}>
                PASS {passedTestsCount} / {totalTestsCount}
              </span>
              <span className="text-xs text-gray-400">
                {totalTestsCount === 0
                  ? 'No test assertions were executed.'
                  : `${passedTestsCount} out of ${totalTestsCount} test assertions passed.`}
              </span>
            </div>

            {/* Test List */}
            {testResults && testResults.length > 0 ? (
              <div className="space-y-1.5">
                {testResults.map((t, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded border text-xs flex flex-col space-y-1 ${
                      t.passed
                        ? 'bg-emerald-950/20 border-emerald-900/60 text-emerald-300'
                        : 'bg-rose-950/30 border-rose-900/60 text-rose-300'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-medium">
                      {t.passed ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                      )}
                      <span>{t.name}</span>
                    </div>
                    {t.error && (
                      <div className="text-[11px] font-mono text-rose-400 pl-6">
                        {t.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500 text-xs">
                Write test assertions in the <strong className="text-gray-400">Tests</strong> tab and send the request to see results.
              </div>
            )}

            {/* Script Console Logs */}
            {scriptLogs && scriptLogs.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-800">
                <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                  Console Output
                </div>
                <div className="bg-gray-950 border border-gray-800 rounded p-2.5 font-mono text-[11px] text-gray-300 space-y-1">
                  {scriptLogs.map((log, i) => (
                    <div key={i}>{log}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

