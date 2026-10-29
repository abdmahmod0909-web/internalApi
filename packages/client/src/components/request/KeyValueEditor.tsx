import React from 'react';
import { Trash2, Plus } from 'lucide-react';
import type { KeyValueItem } from '@internalapi/shared';

interface Props {
  items: KeyValueItem[];
  onChange: (items: KeyValueItem[]) => void;
  keyPlaceholder?: string;
  valuePlaceholder?: string;
}

export const KeyValueEditor: React.FC<Props> = ({
  items,
  onChange,
  keyPlaceholder = 'Key',
  valuePlaceholder = 'Value',
}) => {
  const updateItem = (index: number, patch: Partial<KeyValueItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  };

  const addItem = () => {
    onChange([
      ...items,
      { id: `kv-${Date.now()}-${Math.random()}`, key: '', value: '', isEnabled: true },
    ]);
  };

  return (
    <div className="text-xs">
      <div className="grid grid-cols-[30px_1fr_1fr_1fr_36px] bg-gray-900/60 border-b border-gray-800 text-gray-400 font-medium py-1.5 px-2">
        <div></div>
        <div>{keyPlaceholder}</div>
        <div>{valuePlaceholder}</div>
        <div>Description</div>
        <div></div>
      </div>

      <div className="divide-y divide-gray-850">
        {items.map((item, idx) => (
          <div
            key={item.id || idx}
            className="grid grid-cols-[30px_1fr_1fr_1fr_36px] items-center px-2 py-1 hover:bg-gray-900/40"
          >
            <div className="flex justify-center">
              <input
                type="checkbox"
                checked={item.isEnabled}
                onChange={(e) => updateItem(idx, { isEnabled: e.target.checked })}
                className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0 cursor-pointer"
              />
            </div>
            <div className="pr-2">
              <input
                type="text"
                placeholder={keyPlaceholder}
                value={item.key}
                onChange={(e) => updateItem(idx, { key: e.target.value })}
                className="w-full bg-transparent text-gray-200 outline-none placeholder-gray-600 font-mono text-[11px]"
              />
            </div>
            <div className="pr-2">
              <input
                type="text"
                placeholder={valuePlaceholder}
                value={item.value}
                onChange={(e) => updateItem(idx, { value: e.target.value })}
                className="w-full bg-transparent text-gray-200 outline-none placeholder-gray-600 font-mono text-[11px]"
              />
            </div>
            <div className="pr-2">
              <input
                type="text"
                placeholder="Description"
                value={item.description || ''}
                onChange={(e) => updateItem(idx, { description: e.target.value })}
                className="w-full bg-transparent text-gray-400 outline-none placeholder-gray-600 text-[11px]"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => removeItem(idx)}
                className="text-gray-500 hover:text-rose-400 p-1 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="p-2 border-t border-gray-800/60">
        <button
          onClick={addItem}
          className="flex items-center space-x-1 text-orange-500 hover:text-orange-400 text-xs font-medium py-1 px-2 rounded hover:bg-gray-900"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Row</span>
        </button>
      </div>
    </div>
  );
};

