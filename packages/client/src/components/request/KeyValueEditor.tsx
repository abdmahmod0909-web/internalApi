import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Trash2, Plus, Sparkles, Variable, Hash, Info, Key } from 'lucide-react';
import type { KeyValueItem } from '@internalapi/shared';
import { useAppStore } from '../../store/useAppStore.js';
import {
  getHeaderKeySuggestions,
  getHeaderValueSuggestions,
  HeaderDefinition,
  ValueSuggestionItem,
} from '../../constants/header-suggestions.js';
import { VariableHighlightedInput } from '../common/VariableHighlightedInput.js';

interface Props {
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
  isHeaderEditor?: boolean;
}

export const KeyValueEditor: React.FC<Props> = ({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
  isHeaderEditor: isHeaderProp,
}) => {
  const isHeaderEditor = isHeaderProp ?? keyPlaceholder.toLowerCase().includes('header');
  const { environments, activeEnvironmentId, collections, tabs, activeTabId } = useAppStore();

  // Active autocomplete dropdown state
  const [activeDropdown, setActiveDropdown] = useState<{
    rowIdx: number;
    field: 'key' | 'value';
  } | null>(null);

  const [selectedSuggestionIdx, setSelectedSuggestionIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Collect available environment and collection variables for suggestions
  const availableVariables = useMemo(() => {
    const list: Array<{ key: string; value: string; scope: string }> = [];

    // Active Environment variables
    const activeEnv = environments.find((e) => e.id === activeEnvironmentId);
    if (activeEnv) {
      for (const v of activeEnv.variables) {
        if (v.isEnabled && v.key) {
          list.push({ key: v.key, value: v.value, scope: `Env (${activeEnv.name})` });
        }
      }
    }

    // Current Collection variables
    const currentTab = tabs.find((t) => t.id === activeTabId);
    if (currentTab?.request?.collectionId) {
      const col = collections.find((c) => c.id === currentTab.request.collectionId);
      if (col) {
        if (Array.isArray(col.collectionVariables)) {
          for (const cv of col.collectionVariables) {
            if (cv.isEnabled !== false && cv.key) {
              list.push({ key: cv.key, value: cv.currentValue || cv.value, scope: `Collection (${col.name})` });
            }
          }
        } else if (col.variables) {
          for (const [k, v] of Object.entries(col.variables)) {
            list.push({ key: k, value: String(v), scope: `Collection (${col.name})` });
          }
        }
      }
    }

    return list;
  }, [environments, activeEnvironmentId, collections, tabs, activeTabId]);

  // Compute suggestions for current active cell
  const currentKeySuggestions: HeaderDefinition[] = useMemo(() => {
    if (!isHeaderEditor || !activeDropdown || activeDropdown.field !== 'key') return [];
    const item = items[activeDropdown.rowIdx];
    return getHeaderKeySuggestions(item?.key || '', 12);
  }, [isHeaderEditor, activeDropdown, items]);

  const currentValueSuggestions: ValueSuggestionItem[] = useMemo(() => {
    if (!activeDropdown || activeDropdown.field !== 'value') return [];
    const item = items[activeDropdown.rowIdx];
    const headerKey = item?.key || '';

    if (isHeaderEditor) {
      return getHeaderValueSuggestions(headerKey, item?.value || '', availableVariables, 12);
    }

    // For query params: suggest variables if typing
    const q = (item?.value || '').trim().toLowerCase();
    const results: ValueSuggestionItem[] = [];
    for (const v of availableVariables) {
      const token = `{{${v.key}}}`;
      if (!q || token.toLowerCase().includes(q) || v.key.toLowerCase().includes(q)) {
        results.push({
          value: token,
          label: v.value ? `${v.key}: ${v.value}` : v.key,
          type: 'variable',
          scope: v.scope,
        });
      }
    }
    return results.slice(0, 10);
  }, [isHeaderEditor, activeDropdown, items, availableVariables]);

  // Reset selected index when suggestions change
  useEffect(() => {
    setSelectedSuggestionIdx(0);
  }, [currentKeySuggestions.length, currentValueSuggestions.length]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const updateItem = (index: number, patch: Partial<KeyValueItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);

    // Auto-add next empty row if typing on the last row (like Postman!)
    if (index === items.length - 1 && (patch.key?.trim() || patch.value?.trim())) {
      onChange([
        ...next,
        { id: `kv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, key: '', value: '', isEnabled: true },
      ]);
    }
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
    setActiveDropdown(null);
  };

  const addItem = () => {
    onChange([
      ...items,
      { id: `kv-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`, key: '', value: '', isEnabled: true },
    ]);
  };

  // Selection handlers
  const handleSelectKeySuggestion = (header: HeaderDefinition) => {
    if (!activeDropdown) return;
    const idx = activeDropdown.rowIdx;
    const currentItem = items[idx];

    // If item value is empty and header has default common values, pre-suggest first or leave empty
    updateItem(idx, { key: header.key });
    setActiveDropdown(null);
  };

  const handleSelectValueSuggestion = (s: ValueSuggestionItem) => {
    if (!activeDropdown) return;
    const idx = activeDropdown.rowIdx;
    updateItem(idx, { value: s.value });
    setActiveDropdown(null);
  };

  // Keyboard navigation inside key input
  const handleKeyInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeDropdown || activeDropdown.field !== 'key' || currentKeySuggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIdx((prev) => (prev + 1) % currentKeySuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIdx((prev) => (prev - 1 + currentKeySuggestions.length) % currentKeySuggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (currentKeySuggestions[selectedSuggestionIdx]) {
        e.preventDefault();
        handleSelectKeySuggestion(currentKeySuggestions[selectedSuggestionIdx]);
      }
    } else if (e.key === 'Escape') {
      setActiveDropdown(null);
    }
  };

  // Keyboard navigation inside value input
  const handleValueInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!activeDropdown || activeDropdown.field !== 'value' || currentValueSuggestions.length === 0) {
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIdx((prev) => (prev + 1) % currentValueSuggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIdx((prev) => (prev - 1 + currentValueSuggestions.length) % currentValueSuggestions.length);
    } else if (e.key === 'Enter' || e.key === 'Tab') {
      if (currentValueSuggestions[selectedSuggestionIdx]) {
        e.preventDefault();
        handleSelectValueSuggestion(currentValueSuggestions[selectedSuggestionIdx]);
      }
    } else if (e.key === 'Escape') {
      setActiveDropdown(null);
    }
  };

  return (
    <div className="text-xs" ref={containerRef}>
      {/* Table Headers */}
      <div className="grid grid-cols-[30px_1fr_1fr_1fr_36px] bg-gray-900/60 border-b border-gray-800 text-gray-400 font-semibold py-1.5 px-2 select-none uppercase tracking-wider text-[10px]">
        <div></div>
        <div>{keyPlaceholder}</div>
        <div>{valuePlaceholder}</div>
        <div>Description</div>
        <div></div>
      </div>

      <div className="divide-y divide-gray-850">
        {items.map((item, idx) => {
          const isKeyFocused = activeDropdown?.rowIdx === idx && activeDropdown.field === 'key';
          const isValueFocused = activeDropdown?.rowIdx === idx && activeDropdown.field === 'value';

          return (
            <div
              key={item.id || idx}
              className={`grid grid-cols-[30px_1fr_1fr_1fr_36px] items-center px-2 py-1 transition-colors ${
                isKeyFocused || isValueFocused ? 'bg-gray-900/80' : 'hover:bg-gray-900/40'
              }`}
            >
              {/* Enabled Checkbox */}
              <div className="flex justify-center">
                <input
                  type="checkbox"
                  checked={item.isEnabled}
                  onChange={(e) => updateItem(idx, { isEnabled: e.target.checked })}
                  className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0 cursor-pointer"
                  title="Enable / Disable"
                />
              </div>

              {/* Key Input with Autocomplete & Variable Highlighting */}
              <div className="relative pr-2">
                <VariableHighlightedInput
                  placeholder={keyPlaceholder}
                  value={item.key}
                  variables={availableVariables}
                  onFocus={() => {
                    setActiveDropdown({ rowIdx: idx, field: 'key' });
                    setSelectedSuggestionIdx(0);
                  }}
                  onChange={(val) => {
                    updateItem(idx, { key: val });
                    setActiveDropdown({ rowIdx: idx, field: 'key' });
                  }}
                  onKeyDown={handleKeyInputKeyDown}
                  paddingClasses="px-1 py-0.5"
                  typographyClasses="font-mono text-[11px] leading-normal"
                  inputClassName="focus:bg-gray-950 focus:ring-1 focus:ring-orange-500/50 rounded"
                />

                {/* Key Suggestions Dropdown */}
                {isKeyFocused && currentKeySuggestions.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 top-full mt-1 w-80 max-h-60 overflow-y-auto z-50 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl py-1 divide-y divide-gray-850/60 no-scrollbar"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-950/60 flex items-center justify-between">
                      <span>Header Suggestions</span>
                      <span className="text-orange-400 font-mono text-[9px]">{currentKeySuggestions.length} found</span>
                    </div>

                    {currentKeySuggestions.map((h, sIdx) => {
                      const isSelected = sIdx === selectedSuggestionIdx;
                      return (
                        <div
                          key={h.key}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectKeySuggestion(h);
                          }}
                          onMouseEnter={() => setSelectedSuggestionIdx(sIdx)}
                          className={`px-3 py-1.5 cursor-pointer flex flex-col transition-colors ${
                            isSelected ? 'bg-orange-500/20 text-white' : 'hover:bg-gray-800/80 text-gray-300'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-xs text-orange-400">{h.key}</span>
                            {h.commonValues && h.commonValues.length > 0 && (
                              <span className="text-[10px] text-gray-500 truncate max-w-[120px] font-mono">
                                e.g. {h.commonValues[0]}
                              </span>
                            )}
                          </div>
                          {h.description && (
                            <span className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                              {h.description}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Value Input with Autocomplete & Variable Highlighting */}
              <div className="relative pr-2">
                <VariableHighlightedInput
                  placeholder={valuePlaceholder}
                  value={item.value}
                  variables={availableVariables}
                  onFocus={() => {
                    setActiveDropdown({ rowIdx: idx, field: 'value' });
                    setSelectedSuggestionIdx(0);
                  }}
                  onChange={(val) => {
                    updateItem(idx, { value: val });
                    setActiveDropdown({ rowIdx: idx, field: 'value' });
                  }}
                  onKeyDown={handleValueInputKeyDown}
                  paddingClasses="px-1 py-0.5"
                  typographyClasses="font-mono text-[11px] leading-normal"
                  inputClassName="focus:bg-gray-950 focus:ring-1 focus:ring-orange-500/50 rounded"
                />

                {/* Value Suggestions Dropdown */}
                {isValueFocused && currentValueSuggestions.length > 0 && (
                  <div
                    ref={dropdownRef}
                    className="absolute left-0 top-full mt-1 w-80 max-h-60 overflow-y-auto z-50 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl py-1 divide-y divide-gray-850/60 no-scrollbar"
                  >
                    <div className="px-2.5 py-1 text-[10px] font-semibold text-gray-500 uppercase tracking-wider bg-gray-950/60 flex items-center justify-between">
                      <span>Value Suggestions</span>
                      <span className="text-orange-400 font-mono text-[9px]">
                        {item.key ? item.key : 'Values'}
                      </span>
                    </div>

                    {currentValueSuggestions.map((v, sIdx) => {
                      const isSelected = sIdx === selectedSuggestionIdx;
                      return (
                        <div
                          key={v.value}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            handleSelectValueSuggestion(v);
                          }}
                          onMouseEnter={() => setSelectedSuggestionIdx(sIdx)}
                          className={`px-3 py-1.5 cursor-pointer flex items-center justify-between transition-colors ${
                            isSelected ? 'bg-orange-500/20 text-white' : 'hover:bg-gray-800/80 text-gray-300'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            {v.type === 'variable' ? (
                              <Variable className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            ) : (
                              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            )}
                            <span className="font-mono text-xs truncate font-medium">{v.value}</span>
                          </div>

                          <div className="shrink-0 text-[10px] text-gray-500 ml-2">
                            {v.scope ? (
                              <span className="bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded font-mono">
                                {v.scope}
                              </span>
                            ) : (
                              <span className="text-gray-500 font-sans">preset</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Description Input */}
              <div className="pr-2">
                <input
                  type="text"
                  placeholder="Description (optional)"
                  value={item.description || ''}
                  onChange={(e) => updateItem(idx, { description: e.target.value })}
                  className="w-full bg-transparent text-gray-400 outline-none placeholder-gray-600 text-[11px] px-1 py-0.5 rounded focus:bg-gray-950 focus:text-gray-200"
                />
              </div>

              {/* Remove Action */}
              <div className="flex justify-end">
                <button
                  onClick={() => removeItem(idx)}
                  className="text-gray-500 hover:text-rose-400 p-1 rounded transition-colors"
                  title="Remove Row"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Row Button */}
      <div className="p-2 border-t border-gray-800/60 flex items-center justify-between">
        <button
          onClick={addItem}
          className="flex items-center space-x-1 text-orange-500 hover:text-orange-400 text-xs font-medium py-1 px-2 rounded hover:bg-gray-900 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add {isHeaderEditor ? 'Header' : 'Row'}</span>
        </button>

        {isHeaderEditor && (
          <span className="text-[10px] text-gray-500 italic pr-2">
            Tip: Type header names like <code className="text-orange-400 font-mono">Accept</code> or <code className="text-orange-400 font-mono">Content-Type</code> for autocomplete suggestions
          </span>
        )}
      </div>
    </div>
  );
};
