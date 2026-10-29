import React, { useState } from 'react';
import { useAppStore } from '../../store/useAppStore.js';
import { X, Plus, Trash2, Lock, Save, Shield } from 'lucide-react';
import type { Environment, EnvironmentVariable } from '@internalapi/shared';

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

  if (!isEnvModalOpen) return null;

  const currentEnv = editingEnv || environments.find((e) => e.id === selectedEnvId);

  const handleSelectEnv = (env: Environment) => {
    setSelectedEnvId(env.id);
    setEditingEnv(JSON.parse(JSON.stringify(env)));
  };

  const handleCreateNew = () => {
    const newEnv: Environment = {
      id: `env-${Date.now()}`,
      workspaceId: activeWorkspaceId,
      name: 'New Environment',
      variables: [
        { id: `v-${Date.now()}`, key: 'base_url', value: 'https://api.example.com', isSecret: false, isEnabled: true },
      ],
    };
    setSelectedEnvId(newEnv.id);
    setEditingEnv(newEnv);
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

  const handleSave = async () => {
    if (!editingEnv) return;
    await saveEnvironment(editingEnv);
    setEnvModalOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-orange-500" />
            <h2 className="text-sm font-semibold text-white">Manage Environments & Encrypted Variables</h2>
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
              {environments.map((env) => (
                <button
                  key={env.id}
                  onClick={() => handleSelectEnv(env)}
                  className={`w-full text-left px-3 py-2 rounded text-xs transition-colors flex items-center justify-between ${
                    (editingEnv?.id || selectedEnvId) === env.id
                      ? 'bg-orange-600/20 text-orange-400 font-medium border border-orange-500/40'
                      : 'text-gray-300 hover:bg-gray-900'
                  }`}
                >
                  <span className="truncate">{env.name}</span>
                  <span className="text-[10px] text-gray-500">{env.variables?.length || 0} vars</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleCreateNew}
              className="flex items-center space-x-1.5 text-xs text-orange-500 hover:text-orange-400 p-2 rounded hover:bg-gray-900 mt-4 border border-dashed border-gray-800"
            >
              <Plus className="w-4 h-4" />
              <span>Add Environment</span>
            </button>
          </div>

          {/* Environment Details & Variables Table */}
          <div className="flex-1 p-5 flex flex-col overflow-y-auto">
            {editingEnv ? (
              <div className="space-y-4">
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

                    <div className="divide-y divide-gray-850 max-h-[300px] overflow-y-auto">
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

