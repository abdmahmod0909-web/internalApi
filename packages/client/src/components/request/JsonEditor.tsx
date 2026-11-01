import React, { useRef, useMemo } from 'react';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

/**
 * Tokenizes a single line of JSON code into vibrant syntax-highlighted spans.
 */
function renderLineTokens(line: string): React.ReactNode {
  if (!line) {
    return '\n';
  }

  const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],:])/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = tokenRegex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(
        <span key={`p-${lastIndex}`} className="text-gray-500">
          {line.substring(lastIndex, match.index)}
        </span>
      );
    }

    const token = match[0];

    if (/^"/.test(token)) {
      if (/:$/.test(token)) {
        // Property Key (Column Name)
        const colonIdx = token.lastIndexOf(':');
        const keyName = token.slice(0, colonIdx);
        const colonAndSpace = token.slice(colonIdx);
        parts.push(
          <span key={`k-${match.index}`} className="text-sky-300 font-semibold">
            {keyName}
          </span>
        );
        parts.push(
          <span key={`c-${match.index}`} className="text-gray-400">
            {colonAndSpace}
          </span>
        );
      } else {
        // String Value
        parts.push(
          <span key={`s-${match.index}`} className="text-emerald-400 font-normal">
            {token}
          </span>
        );
      }
    } else if (/true|false/.test(token)) {
      // Boolean
      parts.push(
        <span key={`b-${match.index}`} className="text-purple-400 font-bold">
          {token}
        </span>
      );
    } else if (/null/.test(token)) {
      // Null
      parts.push(
        <span key={`nl-${match.index}`} className="text-rose-400 italic font-semibold">
          {token}
        </span>
      );
    } else if (/^-?\d+/.test(token)) {
      // Number
      parts.push(
        <span key={`num-${match.index}`} className="text-amber-300 font-mono">
          {token}
        </span>
      );
    } else if (/[{}[\]]/.test(token)) {
      // Brackets & Braces
      parts.push(
        <span key={`br-${match.index}`} className="text-amber-500/90 font-bold">
          {token}
        </span>
      );
    } else if (token === ',') {
      // Commas
      parts.push(
        <span key={`cm-${match.index}`} className="text-gray-500 font-mono">
          {token}
        </span>
      );
    } else {
      // Other punctuation
      parts.push(
        <span key={`o-${match.index}`} className="text-gray-400 font-mono">
          {token}
        </span>
      );
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < line.length) {
    parts.push(
      <span key={`end-${lastIndex}`} className="text-gray-500">
        {line.substring(lastIndex)}
      </span>
    );
  }

  return parts;
}

/**
 * Lightweight, high-performance syntax-highlighted JSON code editor.
 * Matches the colorful response viewer with line numbers, tabs, and full editing.
 */
export const JsonEditor: React.FC<Props> = ({
  value,
  onChange,
  placeholder = '{\n  "key": "value"\n}',
  className = '',
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const preRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  const lines = useMemo(() => {
    return (value || '').split('\n');
  }, [value]);

  // Synchronize scrolling between textarea, pre layer, and line number gutter
  const handleScroll = () => {
    const ta = textareaRef.current;
    if (!ta) return;

    if (preRef.current) {
      preRef.current.scrollTop = ta.scrollTop;
      preRef.current.scrollLeft = ta.scrollLeft;
    }
    if (gutterRef.current) {
      gutterRef.current.scrollTop = ta.scrollTop;
    }
  };

  // Intercept Tab key to insert 2 spaces
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;

      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const current = value || '';

      const updated = current.substring(0, start) + '  ' + current.substring(end);
      onChange(updated);

      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div
      className={`relative flex bg-gray-900 border border-gray-800 rounded font-mono text-xs overflow-hidden focus-within:border-orange-500/80 transition-colors ${className}`}
    >
      {/* Line Numbers Gutter */}
      <div
        ref={gutterRef}
        className="w-11 bg-gray-950/70 select-none text-right pr-2.5 py-3 text-gray-600 font-mono text-[11px] border-r border-gray-800/80 shrink-0 leading-5 overflow-hidden"
      >
        {lines.map((_, idx) => (
          <div key={idx} className="h-5">
            {idx + 1}
          </div>
        ))}
      </div>

      {/* Editor Content Box */}
      <div className="relative flex-1 h-full min-h-[220px] overflow-hidden">
        {/* Syntax Highlighted Background Code Layer */}
        <pre
          ref={preRef}
          aria-hidden="true"
          className="absolute inset-0 p-3 m-0 pointer-events-none font-mono text-xs leading-5 whitespace-pre overflow-hidden select-none"
        >
          {lines.map((line, idx) => (
            <div key={idx} className="h-5">
              {renderLineTokens(line)}
            </div>
          ))}
          {/* Suffix space to match scroll height */}
          <div className="h-8" />
        </pre>

        {/* Transparent Foreground Textarea Layer */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          spellCheck={false}
          className="absolute inset-0 p-3 m-0 w-full h-full bg-transparent text-transparent caret-white font-mono text-xs leading-5 whitespace-pre resize-none outline-none overflow-auto selection:bg-orange-500/30 selection:text-transparent"
        />
      </div>
    </div>
  );
};

