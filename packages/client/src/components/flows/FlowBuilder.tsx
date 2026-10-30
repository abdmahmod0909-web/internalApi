import React, { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import type { Flow, FlowNode, FlowNodeType, HttpMethod } from '@internalapi/shared';
import {
  Play,
  Square,
  Save,
  Plus,
  Trash2,
  ArrowDown,
  ChevronDown,
  ChevronUp,
  Layers,
  Send,
  Timer,
  GitBranch,
  Terminal,
  Braces,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Workflow,
  Copy,
  Check,
  Eye,
  Settings,
  HelpCircle,
} from 'lucide-react';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];

export const FlowBuilder: React.FC = () => {
  const {
    flows,
    activeFlowId,
    saveFlow,
    createFlow,
    deleteFlow,
    runFlow,
    stopFlow,
    isFlowRunning,
    flowReport,
    collections,
    setActiveView,
  } = useAppStore();

  const activeFlow = flows.find((f) => f.id === activeFlowId);

  // Local working copy of flow so edits don't trigger unnecessary re-renders until saved or modified
  const [localFlow, setLocalFlow] = useState<Flow | null>(null);
  const [isSavedFeedback, setIsSavedFeedback] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(true);
  const [activeTab, setActiveTab] = useState<'logs' | 'variables'>('logs');
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [copiedVarKey, setCopiedVarKey] = useState<string | null>(null);

  useEffect(() => {
    if (activeFlow) {
      setLocalFlow(JSON.parse(JSON.stringify(activeFlow)));
    } else {
      setLocalFlow(null);
    }
  }, [activeFlowId, flows]);

  if (!localFlow) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 bg-gray-950 text-gray-400 select-none">
        <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mb-4 text-orange-400">
          <Workflow className="w-8 h-8" />
        </div>
        <h2 className="text-lg font-semibold text-gray-100 mb-1">Visual API Flow Canvas</h2>
        <p className="text-xs text-gray-400 max-w-md text-center mb-6">
          Chain API requests, extract and pass variables automatically, add delays, conditions, and assertions without writing boilerplate scripts.
        </p>

        <div className="flex flex-wrap gap-3 justify-center">
          <button
            onClick={() => createFlow('My API Flow', '', 'blank')}
            className="flex items-center space-x-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white text-xs font-medium rounded-md shadow-sm transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Blank Flow</span>
          </button>

          <button
            onClick={() => createFlow('Auth & Chained Requests', 'Authenticates, grabs bearer token, and queries protected resource', 'auth_fetch')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-900 hover:bg-gray-850 text-gray-200 border border-gray-800 hover:border-gray-700 text-xs font-medium rounded-md transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Template: Auth & Chained Request</span>
          </button>

          <button
            onClick={() => createFlow('Create & Verify Flow', 'Creates an item and asserts property in subsequent step', 'create_verify')}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-900 hover:bg-gray-850 text-gray-200 border border-gray-800 hover:border-gray-700 text-xs font-medium rounded-md transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Template: Create & Verify</span>
          </button>
        </div>
      </div>
    );
  }

  const handleUpdateNode = (nodeId: string, updater: (node: FlowNode) => FlowNode) => {
    if (!localFlow) return;
    const updatedNodes = localFlow.nodes.map((n) => (n.id === nodeId ? updater(n) : n));
    const nextFlow = { ...localFlow, nodes: updatedNodes };
    setLocalFlow(nextFlow);
    saveFlow(nextFlow);
  };

  const handleAddNode = (type: FlowNodeType) => {
    if (!localFlow) return;
    const newId = `node-${Date.now()}`;
    let newNode: FlowNode;

    switch (type) {
      case 'start':
        newNode = {
          id: newId,
          type: 'start',
          title: 'Start: Configuration',
          config: { initialVars: [{ key: 'baseUrl', value: 'https://httpbin.org' }] },
        };
        break;
      case 'request':
        newNode = {
          id: newId,
          type: 'request',
          title: 'HTTP Request',
          config: {
            method: 'GET',
            url: '{{baseUrl}}/get',
            headers: [],
            bodyType: 'none',
          },
        };
        break;
      case 'extract':
        newNode = {
          id: newId,
          type: 'extract',
          title: 'Extract Variable',
          config: {
            extractVarName: 'resultToken',
            extractPath: 'json.token',
          },
        };
        break;
      case 'delay':
        newNode = {
          id: newId,
          type: 'delay',
          title: 'Delay / Pause',
          config: { delayMs: 1000 },
        };
        break;
      case 'condition':
        newNode = {
          id: newId,
          type: 'condition',
          title: 'Condition Assertion',
          config: {
            conditionField: '{{lastStatus}}',
            conditionOperator: '==',
            conditionValue: '200',
          },
        };
        break;
      case 'output':
        newNode = {
          id: newId,
          type: 'output',
          title: 'Log Output',
          config: { logMessage: 'Flow execution reached output step.' },
        };
        break;
    }

    const nextFlow = { ...localFlow, nodes: [...localFlow.nodes, newNode] };
    setLocalFlow(nextFlow);
    saveFlow(nextFlow);
    setIsAddMenuOpen(false);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (!localFlow) return;
    const nextFlow = { ...localFlow, nodes: localFlow.nodes.filter((n) => n.id !== nodeId) };
    setLocalFlow(nextFlow);
    saveFlow(nextFlow);
  };

  const handleMoveNode = (index: number, direction: 'up' | 'down') => {
    if (!localFlow) return;
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= localFlow.nodes.length) return;

    const newNodes = [...localFlow.nodes];
    const temp = newNodes[index];
    newNodes[index] = newNodes[targetIdx];
    newNodes[targetIdx] = temp;

    const nextFlow = { ...localFlow, nodes: newNodes };
    setLocalFlow(nextFlow);
    saveFlow(nextFlow);
  };

  const handleSave = () => {
    if (localFlow) {
      saveFlow(localFlow);
      setIsSavedFeedback(true);
      setTimeout(() => setIsSavedFeedback(false), 1500);
    }
  };

  const handleRun = () => {
    if (localFlow) {
      saveFlow(localFlow);
      runFlow(localFlow.id);
      setIsLogsOpen(true);
    }
  };

  const handleCopyVar = (key: string, val: any) => {
    const text = typeof val === 'object' ? JSON.stringify(val) : String(val);
    navigator.clipboard.writeText(text);
    setCopiedVarKey(key);
    setTimeout(() => setCopiedVarKey(null), 1500);
  };

  // Find execution status of a node
  const getNodeExecutionInfo = (nodeId: string) => {
    if (!flowReport) return null;
    const log = flowReport.logs.find((l) => l.nodeId === nodeId);
    if (!log) return null;
    return log;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-gray-950 overflow-hidden text-gray-200">
      {/* Top Header Bar */}
      <div className="h-12 border-b border-gray-800 bg-gray-900/60 px-4 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center space-x-3">
          <div className="p-1.5 rounded-md bg-orange-500/10 text-orange-400">
            <Workflow className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={localFlow.name}
            onChange={(e) => {
              const updated = { ...localFlow, name: e.target.value };
              setLocalFlow(updated);
            }}
            onBlur={handleSave}
            className="bg-transparent font-semibold text-sm text-gray-100 hover:bg-gray-850 focus:bg-gray-950 px-2 py-1 rounded border border-transparent focus:border-gray-700 outline-none w-64 transition-colors"
            placeholder="Flow Name"
          />
          <span className="text-gray-700">|</span>
          <span className="text-xs text-gray-400 font-mono">
            {localFlow.nodes.length} {localFlow.nodes.length === 1 ? 'Step' : 'Steps'}
          </span>

          {/* Live Status Badge */}
          {flowReport && (
            <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px]">
              {flowReport.status === 'running' && (
                <span className="flex items-center text-amber-400 animate-pulse font-medium">
                  <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5" />
                  Running Step {flowReport.currentStepIndex + 1}/{flowReport.totalSteps}...
                </span>
              )}
              {flowReport.status === 'success' && (
                <span className="flex items-center text-emerald-400 font-medium bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Passed ({flowReport.durationMs}ms)
                </span>
              )}
              {flowReport.status === 'failed' && (
                <span className="flex items-center text-rose-400 font-medium bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/40">
                  <XCircle className="w-3.5 h-3.5 mr-1" />
                  Failed
                </span>
              )}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2">
          {/* Toggle Logs Drawer */}
          <button
            onClick={() => setIsLogsOpen(!isLogsOpen)}
            className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded border transition-colors ${
              isLogsOpen
                ? 'bg-gray-800 border-gray-700 text-orange-400'
                : 'bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Logs</span>
            {flowReport?.logs.length ? (
              <span className="px-1 text-[10px] bg-gray-700 text-gray-300 rounded-full font-mono">
                {flowReport.logs.length}
              </span>
            ) : null}
          </button>

          {/* Save Button */}
          <button
            onClick={handleSave}
            className="flex items-center space-x-1 px-3 py-1 text-xs bg-gray-800 hover:bg-gray-750 text-gray-200 rounded border border-gray-700 transition-colors"
          >
            {isSavedFeedback ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>Save</span>
              </>
            )}
          </button>

          {/* Run Flow Button */}
          {isFlowRunning ? (
            <button
              onClick={stopFlow}
              className="flex items-center space-x-1.5 px-3.5 py-1 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded transition-colors shadow-sm"
            >
              <Square className="w-3 h-3 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={handleRun}
              className="flex items-center space-x-1.5 px-4 py-1 text-xs font-semibold bg-orange-600 hover:bg-orange-500 text-white rounded transition-colors shadow-sm"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Run Flow</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Canvas & Split Execution Panel */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Canvas Area */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center">
          <div className="w-full max-w-2xl space-y-4">
            {localFlow.nodes.map((node, index) => {
              const execInfo = getNodeExecutionInfo(node.id);
              const isNodeRunning = isFlowRunning && flowReport?.currentStepIndex === index;

              return (
                <React.Fragment key={node.id}>
                  {/* Connecting Arrow */}
                  {index > 0 && (
                    <div className="flex justify-center -my-2 select-none relative z-0">
                      <div className="flex flex-col items-center">
                        <div className="w-0.5 h-4 bg-gray-800" />
                        <ArrowDown className="w-3.5 h-3.5 text-gray-600 -my-1" />
                        <div className="w-0.5 h-4 bg-gray-800" />
                      </div>
                    </div>
                  )}

                  {/* Flow Node Card */}
                  <div
                    className={`bg-gray-900 border rounded-lg overflow-hidden shadow-lg transition-all relative z-10 ${
                      isNodeRunning
                        ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-amber-500/5'
                        : execInfo?.status === 'success'
                        ? 'border-emerald-600/50'
                        : execInfo?.status === 'failed'
                        ? 'border-rose-600/60'
                        : 'border-gray-800 hover:border-gray-750'
                    }`}
                  >
                    {/* Node Header */}
                    <div className="px-4 py-2.5 bg-gray-950/70 border-b border-gray-800 flex items-center justify-between">
                      <div className="flex items-center space-x-2.5">
                        {/* Node Type Icon */}
                        <div className="p-1.5 rounded-md bg-gray-900 border border-gray-800">
                          {node.type === 'start' && <Play className="w-3.5 h-3.5 text-emerald-400 fill-current" />}
                          {node.type === 'request' && <Send className="w-3.5 h-3.5 text-blue-400" />}
                          {node.type === 'extract' && <Braces className="w-3.5 h-3.5 text-purple-400" />}
                          {node.type === 'delay' && <Timer className="w-3.5 h-3.5 text-amber-400" />}
                          {node.type === 'condition' && <GitBranch className="w-3.5 h-3.5 text-indigo-400" />}
                          {node.type === 'output' && <Terminal className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>

                        {/* Step Number & Title */}
                        <div className="flex items-center space-x-2">
                          <span className="text-[11px] font-mono text-gray-500 font-semibold uppercase">
                            Step {index + 1}
                          </span>
                          <span className="text-gray-700">·</span>
                          <input
                            type="text"
                            value={node.title}
                            onChange={(e) =>
                              handleUpdateNode(node.id, (n) => ({ ...n, title: e.target.value }))
                            }
                            className="bg-transparent text-xs font-semibold text-gray-200 hover:bg-gray-900 px-1.5 py-0.5 rounded outline-none focus:bg-gray-950 focus:border-gray-700 border border-transparent w-60"
                          />
                        </div>
                      </div>

                      {/* Right: Step Status & Card Actions */}
                      <div className="flex items-center space-x-2">
                        {execInfo && (
                          <div className="text-[11px] flex items-center space-x-1 font-mono">
                            {execInfo.status === 'success' && (
                              <span className="text-emerald-400 flex items-center bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                                <Check className="w-3 h-3 mr-1" />
                                {execInfo.httpStatus ? `${execInfo.httpStatus} OK` : 'Success'}
                                {execInfo.durationMs ? ` (${execInfo.durationMs}ms)` : ''}
                              </span>
                            )}
                            {execInfo.status === 'failed' && (
                              <span className="text-rose-400 flex items-center bg-rose-950/50 px-2 py-0.5 rounded border border-rose-800/40">
                                <XCircle className="w-3 h-3 mr-1" />
                                {execInfo.httpStatus ? `${execInfo.httpStatus} Error` : 'Failed'}
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center space-x-0.5 border-l border-gray-800 pl-2">
                          <button
                            onClick={() => handleMoveNode(index, 'up')}
                            disabled={index === 0}
                            className="p-1 text-gray-400 hover:text-gray-200 disabled:opacity-20 hover:bg-gray-850 rounded"
                            title="Move Up"
                          >
                            <ChevronUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleMoveNode(index, 'down')}
                            disabled={index === localFlow.nodes.length - 1}
                            className="p-1 text-gray-400 hover:text-gray-200 disabled:opacity-20 hover:bg-gray-850 rounded"
                            title="Move Down"
                          >
                            <ChevronDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteNode(node.id)}
                            className="p-1 text-gray-500 hover:text-rose-400 hover:bg-gray-850 rounded"
                            title="Delete Node"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Node Config Body */}
                    <div className="p-4 space-y-3 text-xs">
                      {/* START NODE */}
                      {node.type === 'start' && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-gray-400">
                            <span className="font-semibold uppercase tracking-wider">Initial Flow Variables</span>
                            <button
                              onClick={() => {
                                const vars = node.config.initialVars || [];
                                handleUpdateNode(node.id, (n) => ({
                                  ...n,
                                  config: {
                                    ...n.config,
                                    initialVars: [...vars, { key: '', value: '' }],
                                  },
                                }));
                              }}
                              className="text-orange-400 hover:text-orange-300 flex items-center space-x-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Variable</span>
                            </button>
                          </div>

                          {(node.config.initialVars || []).length === 0 ? (
                            <div className="text-gray-500 text-[11px] py-1 italic">
                              No initial variables configured. Click "+ Add Variable" to define seeds.
                            </div>
                          ) : (
                            <div className="space-y-1.5">
                              {(node.config.initialVars || []).map((v, vIdx) => (
                                <div key={vIdx} className="flex items-center space-x-2">
                                  <input
                                    type="text"
                                    placeholder="variableName"
                                    value={v.key}
                                    onChange={(e) => {
                                      const nextVars = [...(node.config.initialVars || [])];
                                      nextVars[vIdx] = { ...nextVars[vIdx], key: e.target.value };
                                      handleUpdateNode(node.id, (n) => ({
                                        ...n,
                                        config: { ...n.config, initialVars: nextVars },
                                      }));
                                    }}
                                    className="w-1/3 bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 font-mono"
                                  />
                                  <span className="text-gray-600">=</span>
                                  <input
                                    type="text"
                                    placeholder="value (e.g. https://httpbin.org)"
                                    value={v.value}
                                    onChange={(e) => {
                                      const nextVars = [...(node.config.initialVars || [])];
                                      nextVars[vIdx] = { ...nextVars[vIdx], value: e.target.value };
                                      handleUpdateNode(node.id, (n) => ({
                                        ...n,
                                        config: { ...n.config, initialVars: nextVars },
                                      }));
                                    }}
                                    className="flex-1 bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs text-gray-200 placeholder-gray-600 font-mono"
                                  />
                                  <button
                                    onClick={() => {
                                      const nextVars = (node.config.initialVars || []).filter((_, idx) => idx !== vIdx);
                                      handleUpdateNode(node.id, (n) => ({
                                        ...n,
                                        config: { ...n.config, initialVars: nextVars },
                                      }));
                                    }}
                                    className="p-1 text-gray-500 hover:text-rose-400"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* REQUEST NODE */}
                      {node.type === 'request' && (
                        <div className="space-y-3">
                          {/* Method & URL */}
                          <div className="flex space-x-2">
                            <select
                              value={node.config.method || 'GET'}
                              onChange={(e) =>
                                handleUpdateNode(node.id, (n) => ({
                                  ...n,
                                  config: { ...n.config, method: e.target.value as HttpMethod },
                                }))
                              }
                              className="bg-gray-950 border border-gray-800 text-orange-400 font-bold px-2 py-1.5 rounded outline-none text-xs cursor-pointer"
                            >
                              {HTTP_METHODS.map((m) => (
                                <option key={m} value={m} className="bg-gray-900 text-gray-200">
                                  {m}
                                </option>
                              ))}
                            </select>

                            <input
                              type="text"
                              value={node.config.url || ''}
                              onChange={(e) =>
                                handleUpdateNode(node.id, (n) => ({
                                  ...n,
                                  config: { ...n.config, url: e.target.value },
                                }))
                              }
                              placeholder="https://api.example.com/v1/users or {{baseUrl}}/get"
                              className="flex-1 bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-xs text-gray-200 placeholder-gray-600 font-mono outline-none focus:border-orange-500"
                            />
                          </div>

                          {/* Body Type & Body Content (if POST, PUT, PATCH) */}
                          {['POST', 'PUT', 'PATCH'].includes(node.config.method || '') && (
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between text-[11px] text-gray-400">
                                <span>Request Body (JSON)</span>
                                <span className="text-[10px] text-gray-500">Supports &#123;&#123;var&#125;&#125; placeholders</span>
                              </div>
                              <textarea
                                rows={3}
                                value={node.config.bodyContent || ''}
                                onChange={(e) =>
                                  handleUpdateNode(node.id, (n) => ({
                                    ...n,
                                    config: { ...n.config, bodyContent: e.target.value, bodyType: 'json' },
                                  }))
                                }
                                placeholder="{\n  &quot;email&quot;: &quot;{{userEmail}}&quot;\n}"
                                className="w-full bg-gray-950 border border-gray-800 rounded p-2 text-xs text-gray-200 font-mono resize-y outline-none focus:border-orange-500"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* EXTRACT VARIABLE NODE */}
                      {node.type === 'extract' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[11px] text-gray-400 mb-1">
                                Save As Variable Name
                              </label>
                              <div className="flex items-center space-x-1">
                                <span className="text-gray-600 font-mono text-xs">&#123;&#123;</span>
                                <input
                                  type="text"
                                  placeholder="authToken"
                                  value={node.config.extractVarName || ''}
                                  onChange={(e) =>
                                    handleUpdateNode(node.id, (n) => ({
                                      ...n,
                                      config: { ...n.config, extractVarName: e.target.value },
                                    }))
                                  }
                                  className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-orange-400 font-mono outline-none focus:border-orange-500"
                                />
                                <span className="text-gray-600 font-mono text-xs">&#125;&#125;</span>
                              </div>
                            </div>

                            <div>
                              <label className="block text-[11px] text-gray-400 mb-1">
                                Path in Previous Response
                              </label>
                              <input
                                type="text"
                                placeholder="token, data.id, or status"
                                value={node.config.extractPath || ''}
                                onChange={(e) =>
                                  handleUpdateNode(node.id, (n) => ({
                                    ...n,
                                    config: { ...n.config, extractPath: e.target.value },
                                  }))
                                }
                                className="w-full bg-gray-950 border border-gray-800 rounded px-2.5 py-1.5 text-xs text-gray-200 font-mono outline-none focus:border-orange-500"
                              />
                            </div>
                          </div>
                          <p className="text-[11px] text-gray-500 italic">
                            Captures a field from the preceding HTTP response and makes it available as a variable for subsequent steps.
                          </p>
                        </div>
                      )}

                      {/* DELAY NODE */}
                      {node.type === 'delay' && (
                        <div className="flex items-center space-x-3">
                          <label className="text-[11px] text-gray-400">Pause Duration (milliseconds):</label>
                          <input
                            type="number"
                            min={100}
                            step={100}
                            value={node.config.delayMs || 1000}
                            onChange={(e) =>
                              handleUpdateNode(node.id, (n) => ({
                                ...n,
                                config: { ...n.config, delayMs: parseInt(e.target.value, 10) || 500 },
                              }))
                            }
                            className="w-28 bg-gray-950 border border-gray-800 rounded px-2.5 py-1 text-xs text-gray-200 font-mono outline-none focus:border-orange-500"
                          />
                          <span className="text-gray-500 text-xs">ms</span>
                        </div>
                      )}

                      {/* CONDITION NODE */}
                      {node.type === 'condition' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[11px] text-gray-400 mb-1">Field / Variable</label>
                              <input
                                type="text"
                                placeholder="{{lastStatus}} or {{token}}"
                                value={node.config.conditionField || ''}
                                onChange={(e) =>
                                  handleUpdateNode(node.id, (n) => ({
                                    ...n,
                                    config: { ...n.config, conditionField: e.target.value },
                                  }))
                                }
                                className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs font-mono text-gray-200 outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] text-gray-400 mb-1">Operator</label>
                              <select
                                value={node.config.conditionOperator || '=='}
                                onChange={(e) =>
                                  handleUpdateNode(node.id, (n) => ({
                                    ...n,
                                    config: { ...n.config, conditionOperator: e.target.value as any },
                                  }))
                                }
                                className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs text-orange-400 font-mono outline-none"
                              >
                                <option value="==">== (equals)</option>
                                <option value="!=">!= (not equals)</option>
                                <option value=">">&gt; (greater than)</option>
                                <option value="<">&lt; (less than)</option>
                                <option value="contains">contains</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] text-gray-400 mb-1">Expected Value</label>
                              <input
                                type="text"
                                placeholder="200"
                                value={node.config.conditionValue || ''}
                                onChange={(e) =>
                                  handleUpdateNode(node.id, (n) => ({
                                    ...n,
                                    config: { ...n.config, conditionValue: e.target.value },
                                  }))
                                }
                                className="w-full bg-gray-950 border border-gray-800 rounded px-2 py-1 text-xs font-mono text-gray-200 outline-none"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* OUTPUT NODE */}
                      {node.type === 'output' && (
                        <div className="space-y-1.5">
                          <label className="block text-[11px] text-gray-400">Log Message / Assertion Summary</label>
                          <input
                            type="text"
                            placeholder="Flow reached step. Variable is: {{authToken}}"
                            value={node.config.logMessage || ''}
                            onChange={(e) =>
                              handleUpdateNode(node.id, (n) => ({
                                ...n,
                                config: { ...n.config, logMessage: e.target.value },
                              }))
                            }
                            className="w-full bg-gray-950 border border-gray-800 rounded px-3 py-1.5 text-xs text-gray-200 font-mono outline-none focus:border-orange-500"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}

            {/* Add Step Toolbar */}
            <div className="pt-4 flex flex-col items-center">
              <div className="relative">
                <button
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-gray-900 hover:bg-gray-850 text-orange-400 border border-gray-800 hover:border-gray-700 rounded-full text-xs font-medium transition-all shadow-md"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Flow Step</span>
                  <ChevronDown className="w-3 h-3 ml-0.5" />
                </button>

                {isAddMenuOpen && (
                  <div className="absolute top-full mt-2 w-56 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl py-1.5 z-50 text-xs text-gray-200">
                    <button
                      onClick={() => handleAddNode('request')}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-gray-800 text-left text-blue-400 hover:text-blue-300"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <div>
                        <div className="font-semibold text-gray-200">HTTP Request</div>
                        <div className="text-[10px] text-gray-500">Send GET, POST, PUT, DELETE</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleAddNode('extract')}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-gray-800 text-left text-purple-400 hover:text-purple-300"
                    >
                      <Braces className="w-3.5 h-3.5" />
                      <div>
                        <div className="font-semibold text-gray-200">Extract Variable</div>
                        <div className="text-[10px] text-gray-500">Store response field to variable</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleAddNode('delay')}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-gray-800 text-left text-amber-400 hover:text-amber-300"
                    >
                      <Timer className="w-3.5 h-3.5" />
                      <div>
                        <div className="font-semibold text-gray-200">Delay</div>
                        <div className="text-[10px] text-gray-500">Pause execution for ms</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleAddNode('condition')}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-gray-800 text-left text-indigo-400 hover:text-indigo-300"
                    >
                      <GitBranch className="w-3.5 h-3.5" />
                      <div>
                        <div className="font-semibold text-gray-200">Condition</div>
                        <div className="text-[10px] text-gray-500">Assert status or variables</div>
                      </div>
                    </button>

                    <button
                      onClick={() => handleAddNode('output')}
                      className="w-full flex items-center space-x-2.5 px-3 py-2 hover:bg-gray-800 text-left text-cyan-400 hover:text-cyan-300"
                    >
                      <Terminal className="w-3.5 h-3.5" />
                      <div>
                        <div className="font-semibold text-gray-200">Output Log</div>
                        <div className="text-[10px] text-gray-500">Print message or summary</div>
                      </div>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Execution Inspector Drawer (Bottom Panel) */}
        {isLogsOpen && (
          <div className="h-64 border-t border-gray-800 bg-gray-900/90 flex flex-col shrink-0">
            {/* Drawer Tabs */}
            <div className="h-9 px-4 border-b border-gray-800 flex items-center justify-between text-xs select-none">
              <div className="flex space-x-4">
                <button
                  onClick={() => setActiveTab('logs')}
                  className={`flex items-center space-x-1.5 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'logs'
                      ? 'border-orange-500 text-orange-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  <span>Execution Logs</span>
                  {flowReport?.logs && (
                    <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 rounded-full font-mono">
                      {flowReport.logs.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('variables')}
                  className={`flex items-center space-x-1.5 py-2 font-medium border-b-2 transition-colors ${
                    activeTab === 'variables'
                      ? 'border-orange-500 text-orange-400'
                      : 'border-transparent text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <Braces className="w-3.5 h-3.5" />
                  <span>Variables Inspector</span>
                  {flowReport?.variables && (
                    <span className="text-[10px] bg-gray-800 text-gray-300 px-1.5 rounded-full font-mono">
                      {Object.keys(flowReport.variables).length}
                    </span>
                  )}
                </button>
              </div>

              <div className="text-[11px] text-gray-500 font-mono">
                {flowReport?.startTime && (
                  <span>
                    Started at {new Date(flowReport.startTime).toLocaleTimeString()}
                    {flowReport.durationMs ? ` · ${flowReport.durationMs}ms total` : ''}
                  </span>
                )}
              </div>
            </div>

            {/* Drawer Content */}
            <div className="flex-1 overflow-y-auto p-3 text-xs font-mono">
              {activeTab === 'logs' && (
                <div className="space-y-1.5">
                  {!flowReport || flowReport.logs.length === 0 ? (
                    <div className="text-gray-500 italic py-4 text-center">
                      No execution logs yet. Click "Run Flow" to execute the pipeline.
                    </div>
                  ) : (
                    flowReport.logs.map((log, idx) => (
                      <div
                        key={idx}
                        className="flex items-start space-x-2 py-1 px-2 hover:bg-gray-850/60 rounded transition-colors"
                      >
                        <span className="text-gray-600 text-[10px] shrink-0 mt-0.5">#{idx + 1}</span>
                        {log.status === 'success' && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        )}
                        {log.status === 'failed' && (
                          <XCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        {log.status === 'running' && (
                          <span className="w-3.5 h-3.5 rounded-full bg-amber-400/80 animate-ping shrink-0 mt-0.5" />
                        )}
                        {log.status === 'skipped' && (
                          <span className="w-3.5 h-3.5 rounded-full border border-gray-600 shrink-0 mt-0.5" />
                        )}

                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-gray-200">{log.nodeTitle}</span>
                            {log.durationMs !== undefined && (
                              <span className="text-gray-500 text-[10px]">({log.durationMs}ms)</span>
                            )}
                          </div>
                          {log.message && <div className="text-gray-400 text-[11px] mt-0.5">{log.message}</div>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {activeTab === 'variables' && (
                <div>
                  {!flowReport || Object.keys(flowReport.variables).length === 0 ? (
                    <div className="text-gray-500 italic py-4 text-center">
                      No runtime variables resolved yet. Variables set in the Start node or extracted from requests will appear here.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-gray-800 text-gray-500 text-[11px]">
                          <th className="py-1.5 px-3">Variable Name</th>
                          <th className="py-1.5 px-3">Type</th>
                          <th className="py-1.5 px-3">Value</th>
                          <th className="py-1.5 px-3 w-16 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(flowReport.variables).map(([key, val]) => (
                          <tr key={key} className="border-b border-gray-850 hover:bg-gray-850/50">
                            <td className="py-1.5 px-3 text-orange-400 font-semibold">{key}</td>
                            <td className="py-1.5 px-3 text-gray-500 text-[11px]">{typeof val}</td>
                            <td className="py-1.5 px-3 text-gray-200 font-mono max-w-md truncate">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                            <td className="py-1.5 px-3 text-right">
                              <button
                                onClick={() => handleCopyVar(key, val)}
                                className="p-1 hover:text-orange-400 text-gray-500 rounded"
                                title="Copy Value"
                              >
                                {copiedVarKey === key ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
export default FlowBuilder;

