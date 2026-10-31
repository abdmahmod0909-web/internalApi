import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import {
  X,
  Plus,
  Trash2,
  Lock,
  Save,
  Shield,
  Database,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  RotateCcw,
} from 'lucide-react';
import type { Environment, EnvironmentVariable, DatabaseConnectionConfig } from '@internalapi/shared';

const EMPTY_DB_CONFIG: DatabaseConnectionConfig = {
  type: 'postgres',
  host: '',
  port: '',
  database: '',
  username: '',
  password: '',
  ssl: false,
};

export const EnvironmentModal: React.FC = () => {
  const {
    isEnvModalOpen,
    setEnvModalOpen,
    environments,
    activeWorkspaceId,
    saveEnvironment,
    deleteEnvironment,
  } = useAppStore();

  const [selectedEnvId, setSelectedEnvId] = useState<string>(
    environments[0]?.id || ''
  );
  const [editingEnv, setEditingEnv] = useState<Environment | null>(
    environments[0] ? JSON.parse(JSON.stringify(environments[0])) : null
  );

  const [activeTab, setActiveTab] = useState<'variables' | 'database'>('variables');
  const [isTestingDb, setIsTestingDb] = useState(false);
  const [dbTestResult, setDbTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showDbPassword, setShowDbPassword] = useState(false);

  if (!isEnvModalOpen) return null;

  const handleSelectEnv = (env: Environment) => {
    setSelectedEnvId(env.id);
    setEditingEnv(JSON.parse(JSON.stringify(env)));
    setDbTestResult(null);
  };

  const handleCreateNew = () => {
    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      workspaceId: activeWorkspaceId,
      name: 'New Environment',
      variables: [
        { id: `v-${Date.now()}`, key: 'base_url', value: 'https://api.example.com', isSecret: false, isEnabled: true },
      ],
      dbConnection: { ...EMPTY_DB_CONFIG },
    };
    setSelectedEnvId(newEnv.id);
    setEditingEnv(newEnv);
    setDbTestResult(null);
  };

  const updateVariable = (idx: number, patch: Partial<EnvironmentVariable>) => {
    if (!editingEnv) return;
    const nextVars = [...editingEnv.variables];
    nextVars[idx] = { ...nextVars[idx], ...patch };
    setEditingEnv({ ...editingEnv, variables: nextVars });
  };

  const addVariable = () => {
    if (!editingEnv) return;
    setEditingEnv({
      ...editingEnv,
      variables: [
        ...editingEnv.variables,
        { id: `v-${Date.now()}-${Math.random()}`, key: '', value: '', isSecret: false, isEnabled: true },
      ],
    });
  };

  const removeVariable = (idx: number) => {
    if (!editingEnv) return;
    setEditingEnv({
      ...editingEnv,
      variables: editingEnv.variables.filter((_, i) => i !== idx),
    });
  };

  const currentDbConfig: DatabaseConnectionConfig = editingEnv?.dbConnection || { ...EMPTY_DB_CONFIG };

  const updateDbConfig = (patch: Partial<DatabaseConnectionConfig>) => {
    if (!editingEnv) return;
    const updated = {
      ...currentDbConfig,
      ...patch,
    };
    setEditingEnv({
      ...editingEnv,
      dbConnection: updated,
    });
    setDbTestResult(null);
  };

  const clearDbConfig = () => {
    if (!editingEnv) return;
    setEditingEnv({
      ...editingEnv,
      dbConnection: { ...EMPTY_DB_CONFIG },
    });
    setDbTestResult(null);
  };

  const handleTestDbConnection = async () => {
    setIsTestingDb(true);
    setDbTestResult(null);
    try {
      const res = await fetch('/api/db/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dbConnection: currentDbConfig }),
      });
      const data = await res.json();
      setDbTestResult(data);
    } catch (err: any) {
      setDbTestResult({
        success: false,
        message: err.message || 'Failed to contact backend test endpoint.',
      });
    } finally {
      setIsTestingDb(false);
    }
  };

  const handleSave = async () => {
    if (!editingEnv) return;
    // If all DB fields are empty, keep dbConnection undefined or empty
    const hasDbData = Boolean(
      currentDbConfig.host.trim() ||
      currentDbConfig.database.trim() ||
      currentDbConfig.username.trim()
    );

    const toSave: Environment = {
      ...editingEnv,
      dbConnection: hasDbData ? currentDbConfig : undefined,
    };

    await saveEnvironment(toSave);
    setEnvModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-orange-500" />
            <h2 className="text-sm font-semibold text-white">Manage Environments & Database Sync</h2>
          </div>
          <button
            onClick={() => setEnvModalOpen(false)}
            className="text-gray-400 hover:text-white p-1 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Split */}
        <div className="flex flex-1 overflow-hidden">
          {/* Environments List */}
          <div className="w-60 border-r border-gray-800 p-3 flex flex-col justify-between bg-gray-950">
            <div className="space-y-1">
              <div className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-2 py-1">
                Environments
              </div>
              {environments.map((env) => {
                const isSelected = (editingEnv?.id || selectedEnvId) === env.id;
                const hasDb = Boolean(env.dbConnection?.host && env.dbConnection?.database);
                return (
                  <button
                    key={env.id}
                    onClick={() => handleSelectEnv(env)}
                    className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-orange-600/20 text-orange-400 font-medium border border-orange-500/40'
                        : 'text-gray-300 hover:bg-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      {hasDb && (
                        <span title="Shared DB Synced">
                          <Database className="w-3 h-3 text-cyan-400 shrink-0" />
                        </span>
                      )}
                      <span className="truncate">{env.name}</span>
                    </div>
                    <span className="text-[10px] text-gray-500">{env.variables?.length || 0} vars</span>
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleCreateNew}
              className="flex items-center space-x-1.5 text-xs text-orange-500 hover:text-orange-400 p-2 rounded hover:bg-gray-900 mt-4 border border-dashed border-gray-800"
            >
              <Plus className="w-4 h-4" />
              <span>Add Environment</span>
            </button>
          </div>

          {/* Environment Details Area */}
          <div className="flex-1 p-5 flex flex-col overflow-y-auto">
            {editingEnv ? (
              <div className="space-y-4">
                {/* Environment Name Input */}
                <div>
                  <label className="block text-xs font-semibold text-gray-400 mb-1">
                    Environment Name
                  </label>
                  <input
                    type="text"
                    value={editingEnv.name}
                    onChange={(e) => setEditingEnv({ ...editingEnv, name: e.target.value })}
                    className="w-full max-w-sm bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-xs text-white outline-none focus:border-orange-500"
                  />
                </div>

                {/* Sub-Tab Navigation: Variables vs DB Connection */}
                <div className="flex border-b border-gray-800 text-xs">
                  <button
                    onClick={() => setActiveTab('variables')}
                    className={`py-2 px-4 font-semibold border-b-2 transition-colors ${
                      activeTab === 'variables'
                        ? 'text-orange-400 border-orange-500'
                        : 'text-gray-400 border-transparent hover:text-gray-200'
                    }`}
                  >
                    Variables ({editingEnv.variables.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('database')}
                    className={`py-2 px-4 font-semibold border-b-2 flex items-center space-x-1.5 transition-colors ${
                      activeTab === 'database'
                        ? 'text-cyan-400 border-cyan-500'
                        : 'text-gray-400 border-transparent hover:text-gray-200'
                    }`}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>Database Sync (Shared Collections)</span>
                    {Boolean(currentDbConfig.host && currentDbConfig.database) && (
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
                    )}
                  </button>
                </div>

                {/* Tab 1: Variables Table */}
                {activeTab === 'variables' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-semibold text-gray-400">
                        Variables (Reference via <code className="text-orange-400 font-mono text-[11px]">&#123;&#123;variable&#125;&#125;</code>)
                      </label>
                    </div>

                    <div className="border border-gray-800 rounded overflow-hidden">
                      <div className="grid grid-cols-[30px_1fr_1fr_70px_36px] bg-gray-950 border-b border-gray-800 text-[11px] font-semibold text-gray-400 py-2 px-3">
                        <div></div>
                        <div>Variable Name</div>
                        <div>Value</div>
                        <div className="text-center">Secret</div>
                        <div></div>
                      </div>

                      <div className="divide-y divide-gray-850 max-h-[260px] overflow-y-auto">
                        {editingEnv.variables.map((v, idx) => (
                          <div
                            key={v.id || idx}
                            className="grid grid-cols-[30px_1fr_1fr_70px_36px] items-center px-3 py-1.5 hover:bg-gray-850/40 text-xs"
                          >
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={v.isEnabled}
                                onChange={(e) => updateVariable(idx, { isEnabled: e.target.checked })}
                                className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0"
                              />
                            </div>
                            <div className="pr-2">
                              <input
                                type="text"
                                placeholder="variable_name"
                                value={v.key}
                                onChange={(e) => updateVariable(idx, { key: e.target.value })}
                                className="w-full bg-transparent text-gray-200 outline-none font-mono text-[11px]"
                              />
                            </div>
                            <div className="pr-2">
                              <input
                                type={v.isSecret ? 'password' : 'text'}
                                placeholder="value"
                                value={v.value}
                                onChange={(e) => updateVariable(idx, { value: e.target.value })}
                                className="w-full bg-transparent text-gray-200 outline-none font-mono text-[11px]"
                              />
                            </div>
                            <div className="flex justify-center">
                              <button
                                type="button"
                                onClick={() => updateVariable(idx, { isSecret: !v.isSecret })}
                                className={`p-1 rounded ${
                                  v.isSecret ? 'text-amber-400' : 'text-gray-600 hover:text-gray-400'
                                }`}
                                title={v.isSecret ? 'Encrypted with AES-256-GCM' : 'Plaintext variable'}
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <div className="flex justify-end">
                              <button
                                onClick={() => removeVariable(idx)}
                                className="text-gray-500 hover:text-rose-400 p-1"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="p-2 bg-gray-950 border-t border-gray-800 flex justify-between items-center">
                        <button
                          onClick={addVariable}
                          className="text-orange-500 hover:text-orange-400 text-xs flex items-center space-x-1 font-medium px-2 py-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add Variable</span>
                        </button>

                        {editingEnv.id && (
                          <button
                            onClick={() => {
                              if (confirm(`Delete environment "${editingEnv.name}"?`)) {
                                deleteEnvironment(editingEnv.id);
                                setEditingEnv(null);
                              }
                            }}
                            className="text-rose-500 hover:text-rose-400 text-xs px-2 py-1"
                          >
                            Delete Environment
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Tab 2: Shared Database Connection */}
                {activeTab === 'database' && (
                  <div className="space-y-4">
                    {/* Information Box */}
                    <div className="bg-cyan-950/30 border border-cyan-800/60 rounded-md p-3 text-xs text-cyan-200 space-y-1">
                      <div className="font-semibold flex items-center space-x-1.5 text-cyan-300">
                        <Database className="w-4 h-4 text-cyan-400" />
                        <span>Shared Team Collections via Database</span>
                      </div>
                      <p className="text-gray-300 text-[11px] leading-relaxed">
                        If User 1 and User 2 connect using the <strong>same database connection</strong>, they will share, see, and update the exact same collections and folders in real time.
                      </p>
                      <p className="text-gray-400 text-[11px]">
                        <strong>Empty by default:</strong> Leave these fields blank to use local offline file storage.
                      </p>
                    </div>

                    {/* DB Type & Port */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          Database Engine
                        </label>
                        <div className="flex space-x-2">
                          <button
                            type="button"
                            onClick={() => updateDbConfig({ type: 'postgres', port: currentDbConfig.port || '5432' })}
                            className={`flex-1 py-1.5 px-3 rounded text-xs font-medium border transition-colors ${
                              currentDbConfig.type === 'postgres'
                                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                                : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            PostgreSQL
                          </button>
                          <button
                            type="button"
                            onClick={() => updateDbConfig({ type: 'mysql', port: currentDbConfig.port || '3306' })}
                            className={`flex-1 py-1.5 px-3 rounded text-xs font-medium border transition-colors ${
                              currentDbConfig.type === 'mysql'
                                ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
                                : 'bg-gray-950 border-gray-800 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            MySQL / MariaDB
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          Port
                        </label>
                        <input
                          type="text"
                          placeholder={currentDbConfig.type === 'postgres' ? '5432' : '3306'}
                          value={currentDbConfig.port || ''}
                          onChange={(e) => updateDbConfig({ port: e.target.value })}
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Host & DB Name */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          Host / IP Address
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. 192.168.1.100 or 127.0.0.1"
                          value={currentDbConfig.host || ''}
                          onChange={(e) => updateDbConfig({ host: e.target.value })}
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          Database Name
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. internalapi_db"
                          value={currentDbConfig.database || ''}
                          onChange={(e) => updateDbConfig({ database: e.target.value })}
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>
                    </div>

                    {/* Username & Password */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          Username
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. postgres or root"
                          value={currentDbConfig.username || ''}
                          onChange={(e) => updateDbConfig({ username: e.target.value })}
                          className="w-full bg-gray-950 border border-gray-700 rounded px-3 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-500 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-400 mb-1">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showDbPassword ? 'text' : 'password'}
                            placeholder="Database password"
                            value={currentDbConfig.password || ''}
                            onChange={(e) => updateDbConfig({ password: e.target.value })}
                            className="w-full bg-gray-950 border border-gray-700 rounded pl-3 pr-8 py-1.5 text-xs text-white placeholder-gray-600 outline-none focus:border-cyan-500 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => setShowDbPassword(!showDbPassword)}
                            className="absolute right-2 top-2 text-gray-500 hover:text-gray-300"
                          >
                            {showDbPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* SSL Option */}
                    <div className="flex items-center space-x-2 pt-1">
                      <input
                        type="checkbox"
                        id="db-ssl-toggle"
                        checked={Boolean(currentDbConfig.ssl)}
                        onChange={(e) => updateDbConfig({ ssl: e.target.checked })}
                        className="rounded bg-gray-800 border-gray-700 text-cyan-500 focus:ring-0"
                      />
                      <label htmlFor="db-ssl-toggle" className="text-xs text-gray-300 cursor-pointer select-none">
                        Enable SSL / TLS connection
                      </label>
                    </div>

                    {/* Test Connection Result Banner */}
                    {dbTestResult && (
                      <div
                        className={`p-3 rounded-md text-xs flex items-start space-x-2 animate-fadeIn ${
                          dbTestResult.success
                            ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                            : 'bg-rose-950/60 border border-rose-800 text-rose-300'
                        }`}
                      >
                        {dbTestResult.success ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                        )}
                        <span className="leading-relaxed">{dbTestResult.message}</span>
                      </div>
                    )}

                    {/* Test Connection & Reset Buttons */}
                    <div className="flex items-center space-x-2 pt-2">
                      <button
                        type="button"
                        onClick={handleTestDbConnection}
                        disabled={isTestingDb || !currentDbConfig.host || !currentDbConfig.database}
                        className="flex items-center space-x-1.5 px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded text-xs font-semibold transition-colors"
                      >
                        {isTestingDb ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Database className="w-3.5 h-3.5" />
                        )}
                        <span>{isTestingDb ? 'Testing Connection...' : 'Test Connection'}</span>
                      </button>

                      <button
                        type="button"
                        onClick={clearDbConfig}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs transition-colors"
                        title="Reset all database fields to empty"
                      >
                        <RotateCcw className="w-3 h-3 text-gray-400" />
                        <span>Clear to Empty</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 text-xs">
                Select or create an environment on the left.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-gray-800 bg-gray-950 flex justify-end space-x-2">
          <button
            onClick={() => setEnvModalOpen(false)}
            className="px-4 py-1.5 rounded text-xs text-gray-300 hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-1.5 rounded text-xs bg-orange-600 hover:bg-orange-500 text-white font-medium flex items-center space-x-1.5"
          >
            <Save className="w-3.5 h-3.5" />
            <span>Save Environment</span>
          </button>
        </div>
      </div>
    </div>
  );
};
export default EnvironmentModal;
