import React, { useRef } from 'react';
import { Trash2, Plus, Paperclip, FileText, Upload, Check } from 'lucide-react';
import type { FormDataItem } from '@internalapi/shared';

interface Props {
  items: FormDataItem[];
  onChange: (items: FormDataItem[]) => void;
}

export const FormDataEditor: React.FC<Props> = ({ items, onChange }) => {
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});

  const updateItem = (index: number, patch: Partial<FormDataItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    onChange(next);
  };

  const addTextField = () => {
    onChange([
      ...items,
      {
        id: `fd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        key: '',
        value: '',
        type: 'text',
        isEnabled: true,
      },
    ]);
  };

  const addFileField = () => {
    onChange([
      ...items,
      {
        id: `fd-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        key: 'file',
        value: '',
        type: 'file',
        isEnabled: true,
      },
    ]);
  };

  const handleFileSelected = (index: number, file: File | undefined) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.includes(',') ? result.split(',')[1] : result;

      updateItem(index, {
        type: 'file',
        fileName: file.name,
        value: file.name,
        mimeType: file.type || 'application/octet-stream',
        fileBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="text-xs">
      {/* Header */}
      <div className="grid grid-cols-[30px_1fr_90px_1.5fr_1fr_36px] bg-gray-900/60 border-b border-gray-800 text-gray-400 font-medium py-1.5 px-2 select-none">
        <div></div>
        <div>Key</div>
        <div>Type</div>
        <div>Value</div>
        <div>Description</div>
        <div></div>
      </div>

      {/* Rows */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-xs text-gray-500 space-y-2">
          <p>No multipart/form-data fields configured.</p>
          <div className="flex justify-center space-x-2">
            <button
              type="button"
              onClick={addTextField}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-orange-400" />
              <span>Add Text Field</span>
            </button>
            <button
              type="button"
              onClick={addFileField}
              className="flex items-center space-x-1 px-3 py-1 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-xs transition-colors"
            >
              <Paperclip className="w-3.5 h-3.5 text-orange-400" />
              <span>Add File Upload</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-gray-850">
          {items.map((item, idx) => {
            const isFile = item.type === 'file';
            return (
              <div
                key={item.id || idx}
                className="grid grid-cols-[30px_1fr_90px_1.5fr_1fr_36px] items-center px-2 py-1.5 hover:bg-gray-900/40"
              >
                {/* Enabled Checkbox */}
                <div className="flex justify-center">
                  <input
                    type="checkbox"
                    checked={item.isEnabled}
                    onChange={(e) => updateItem(idx, { isEnabled: e.target.checked })}
                    className="rounded bg-gray-800 border-gray-700 text-orange-500 focus:ring-0 cursor-pointer"
                  />
                </div>

                {/* Key Input */}
                <div className="pr-2">
                  <input
                    type="text"
                    placeholder="Field name (e.g. avatar, user)"
                    value={item.key}
                    onChange={(e) => updateItem(idx, { key: e.target.value })}
                    className="w-full bg-transparent text-gray-200 outline-none placeholder-gray-600 font-mono text-[11px]"
                  />
                </div>

                {/* Type Selector (Text vs File) */}
                <div className="pr-2">
                  <select
                    value={item.type || 'text'}
                    onChange={(e) => {
                      const newType = e.target.value as 'text' | 'file';
                      updateItem(idx, {
                        type: newType,
                        value: newType === 'text' ? '' : item.value,
                        fileName: newType === 'text' ? undefined : item.fileName,
                        fileBase64: newType === 'text' ? undefined : item.fileBase64,
                      });
                    }}
                    className="bg-gray-950 border border-gray-800 rounded px-1.5 py-0.5 text-[11px] text-orange-400 outline-none cursor-pointer w-full"
                  >
                    <option value="text" className="bg-gray-900 text-gray-200">Text</option>
                    <option value="file" className="bg-gray-900 text-gray-200">File</option>
                  </select>
                </div>

                {/* Value Input: Text or File Picker */}
                <div className="pr-2">
                  {isFile ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        ref={(el) => (fileInputRefs.current[item.id] = el)}
                        onChange={(e) => handleFileSelected(idx, e.target.files?.[0])}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[item.id]?.click()}
                        className="flex items-center space-x-1 px-2.5 py-1 bg-gray-950 hover:bg-gray-850 border border-gray-800 hover:border-gray-700 text-gray-300 rounded text-[11px] transition-colors"
                      >
                        <Upload className="w-3 h-3 text-orange-400" />
                        <span>{item.fileName ? 'Change File' : 'Select File'}</span>
                      </button>

                      {item.fileName ? (
                        <div className="flex items-center space-x-1 text-emerald-400 text-[11px] font-mono truncate max-w-[180px]">
                          <Check className="w-3 h-3 shrink-0" />
                          <span className="truncate">{item.fileName}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-[11px] italic">No file selected</span>
                      )}
                    </div>
                  ) : (
                    <input
                      type="text"
                      placeholder="Value"
                      value={item.value}
                      onChange={(e) => updateItem(idx, { value: e.target.value })}
                      className="w-full bg-transparent text-gray-200 outline-none placeholder-gray-600 font-mono text-[11px]"
                    />
                  )}
                </div>

                {/* Description */}
                <div className="pr-2">
                  <input
                    type="text"
                    placeholder="Description"
                    value={item.description || ''}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    className="w-full bg-transparent text-gray-400 outline-none placeholder-gray-600 text-[11px]"
                  />
                </div>

                {/* Remove Button */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => removeItem(idx)}
                    className="text-gray-500 hover:text-rose-400 p-1 rounded"
                    title="Remove item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer Add Buttons */}
      {items.length > 0 && (
        <div className="p-2 border-t border-gray-800/60 flex items-center space-x-2">
          <button
            type="button"
            onClick={addTextField}
            className="flex items-center space-x-1 text-gray-400 hover:text-orange-400 px-2 py-1 rounded hover:bg-gray-900 transition-colors text-[11px]"
          >
            <Plus className="w-3 h-3" />
            <span>Add Text Field</span>
          </button>
          <span className="text-gray-700">|</span>
          <button
            type="button"
            onClick={addFileField}
            className="flex items-center space-x-1 text-gray-400 hover:text-orange-400 px-2 py-1 rounded hover:bg-gray-900 transition-colors text-[11px]"
          >
            <Paperclip className="w-3 h-3" />
            <span>Add File Upload</span>
          </button>
        </div>
      )}
    </div>
  );
};
export default FormDataEditor;

