import React, { useMemo, useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FoldVertical, Maximize2 } from 'lucide-react';

interface Props {
  jsonString: string;
  searchTerm?: string;
  activeMatchIndex?: number;
  onTotalMatchesChange?: (total: number) => void;
}

/**
 * Highlights matches of `searchTerm` within `text`, wrapping matched substrings in a high-contrast mark.
 */
export function highlightMatch(
  text: string,
  searchTerm?: string,
  baseClass = 'text-gray-300'
): React.ReactNode {
  if (!searchTerm || !searchTerm.trim()) {
    return <span className={baseClass}>{text}</span>;
  }

  const query = searchTerm.trim();
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();

  const parts: React.ReactNode[] = [];
  let startIndex = 0;
  let matchIndex = lowerText.indexOf(lowerQuery, startIndex);

  if (matchIndex === -1) {
    return <span className={baseClass}>{text}</span>;
  }

  while (matchIndex !== -1) {
    if (matchIndex > startIndex) {
      parts.push(
        <span key={`p-${startIndex}`} className={baseClass}>
          {text.substring(startIndex, matchIndex)}
        </span>
      );
    }
    parts.push(
      <mark
        key={`m-${matchIndex}`}
        className="bg-amber-400 text-black font-bold px-0.5 rounded-sm shadow-xs"
      >
        {text.substring(matchIndex, matchIndex + query.length)}
      </mark>
    );
    startIndex = matchIndex + query.length;
    matchIndex = lowerText.indexOf(lowerQuery, startIndex);
  }

  if (startIndex < text.length) {
    parts.push(
      <span key={`p-${startIndex}`} className={baseClass}>
        {text.substring(startIndex)}
      </span>
    );
  }

  return <span className={baseClass}>{parts}</span>;
}

/**
 * Scans lines for matching brackets ({}, []) and returns a mapping from startLine -> endLine.
 */
function computeFoldRanges(lines: string[]): Map<number, number> {
  const foldMap = new Map<number, number>();
  const stack: { char: '{' | '['; line: number }[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Strip string literals so brackets inside strings are ignored
    const stripped = line.replace(/"(\\.|[^"\\])*"/g, '');

    for (let c = 0; c < stripped.length; c++) {
      const ch = stripped[c];
      if (ch === '{' || ch === '[') {
        stack.push({ char: ch, line: i });
      } else if (ch === '}' || ch === ']') {
        if (stack.length > 0) {
          const top = stack[stack.length - 1];
          const matches =
            (ch === '}' && top.char === '{') ||
            (ch === ']' && top.char === '[');

          if (matches) {
            stack.pop();
            // Only create fold if block spans across 2 or more lines
            if (top.line < i) {
              foldMap.set(top.line, i);
            }
          }
        }
      }
    }
  }

  return foldMap;
}

/**
 * Tokenizes and formats JSON with Postman-style bracket folding,
 * active match navigation, vibrant syntax highlighting, and line numbers.
 */
export const JsonViewer: React.FC<Props> = ({
  jsonString,
  searchTerm,
  activeMatchIndex = 0,
  onTotalMatchesChange,
}) => {
  const [collapsedLines, setCollapsedLines] = useState<Set<number>>(new Set());

  const formattedLines = useMemo(() => {
    let formatted = jsonString;
    try {
      const parsed = JSON.parse(jsonString);
      formatted = JSON.stringify(parsed, null, 2);
    } catch {
      // not valid JSON, keep as raw text
    }

    return formatted.split('\n');
  }, [jsonString]);

  // Compute multi-line bracket fold ranges (startLine -> endLine)
  const foldMap = useMemo(() => computeFoldRanges(formattedLines), [formattedLines]);

  // Compute search match offsets per line for exact match index tracking
  const { offsets, lineMatchCounts, totalMatches } = useMemo(() => {
    if (!searchTerm || !searchTerm.trim()) {
      return { offsets: [], lineMatchCounts: [], totalMatches: 0 };
    }
    const q = searchTerm.trim().toLowerCase();
    const offsetsArr: number[] = new Array(formattedLines.length);
    const countsArr: number[] = new Array(formattedLines.length);
    let total = 0;

    for (let i = 0; i < formattedLines.length; i++) {
      offsetsArr[i] = total;
      const lower = formattedLines[i].toLowerCase();
      let count = 0;
      let pos = 0;
      while ((pos = lower.indexOf(q, pos)) !== -1) {
        count++;
        pos += q.length;
      }
      countsArr[i] = count;
      total += count;
    }

    return { offsets: offsetsArr, lineMatchCounts: countsArr, totalMatches: total };
  }, [formattedLines, searchTerm]);

  // Notify parent of total matches count
  useEffect(() => {
    onTotalMatchesChange?.(totalMatches);
  }, [totalMatches, onTotalMatchesChange]);

  // Reset collapsed lines whenever response body changes
  useEffect(() => {
    setCollapsedLines(new Set());
  }, [jsonString]);

  // Identify which line index contains the currently active match
  const activeLineIndex = useMemo(() => {
    if (totalMatches === 0) return -1;
    for (let i = 0; i < formattedLines.length; i++) {
      const start = offsets[i] || 0;
      const count = lineMatchCounts[i] || 0;
      if (activeMatchIndex >= start && activeMatchIndex < start + count) {
        return i;
      }
    }
    return -1;
  }, [activeMatchIndex, offsets, lineMatchCounts, formattedLines.length, totalMatches]);

  // Auto-expand and smooth-scroll to the active match
  useEffect(() => {
    if (activeLineIndex >= 0) {
      setCollapsedLines((prev) => {
        let changed = false;
        const next = new Set(prev);
        for (const start of prev) {
          const end = foldMap.get(start);
          if (end !== undefined && activeLineIndex >= start && activeLineIndex <= end) {
            next.delete(start);
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      const timer = setTimeout(() => {
        const el = document.getElementById(`json-line-${activeLineIndex}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 50);

      return () => clearTimeout(timer);
    }
  }, [activeLineIndex, foldMap]);

  // Calculate all hidden lines due to collapsed blocks
  const hiddenLines = useMemo(() => {
    const hidden = new Set<number>();
    for (const start of collapsedLines) {
      const end = foldMap.get(start);
      if (end !== undefined) {
        for (let l = start + 1; l <= end; l++) {
          hidden.add(l);
        }
      }
    }
    return hidden;
  }, [collapsedLines, foldMap]);

  const toggleFold = (lineIndex: number) => {
    setCollapsedLines((prev) => {
      const next = new Set(prev);
      if (next.has(lineIndex)) {
        next.delete(lineIndex);
      } else {
        next.add(lineIndex);
      }
      return next;
    });
  };

  const collapseAll = () => {
    setCollapsedLines(new Set(foldMap.keys()));
  };

  const expandAll = () => {
    setCollapsedLines(new Set());
  };

  // Syntax highlighter for a single line of JSON with active match distinction
  const renderLine = (line: string, lineIdx: number) => {
    const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],:])/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let lineMatches = 0;

    const highlightText = (text: string, baseClass: string) => {
      if (!searchTerm || !searchTerm.trim()) {
        return <span className={baseClass}>{text}</span>;
      }

      const q = searchTerm.trim();
      const lowerText = text.toLowerCase();
      const lowerQuery = q.toLowerCase();

      const innerParts: React.ReactNode[] = [];
      let startIdx = 0;
      let mIdx = lowerText.indexOf(lowerQuery, startIdx);

      if (mIdx === -1) {
        return <span className={baseClass}>{text}</span>;
      }

      while (mIdx !== -1) {
        if (mIdx > startIdx) {
          innerParts.push(
            <span key={`p-${startIdx}`} className={baseClass}>
              {text.substring(startIdx, mIdx)}
            </span>
          );
        }

        const currentGlobalIndex = (offsets[lineIdx] || 0) + lineMatches++;
        const isActive = currentGlobalIndex === activeMatchIndex;

        innerParts.push(
          <mark
            key={`m-${mIdx}-${currentGlobalIndex}`}
            className={
              isActive
                ? 'bg-orange-500 text-white font-extrabold px-1 py-0.5 rounded shadow-md ring-2 ring-white'
                : 'bg-amber-400 text-black font-bold px-0.5 rounded-sm shadow-xs'
            }
          >
            {text.substring(mIdx, mIdx + q.length)}
          </mark>
        );

        startIdx = mIdx + q.length;
        mIdx = lowerText.indexOf(lowerQuery, startIdx);
      }

      if (startIdx < text.length) {
        innerParts.push(
          <span key={`p-${startIdx}`} className={baseClass}>
            {text.substring(startIdx)}
          </span>
        );
      }

      return <span className={baseClass}>{innerParts}</span>;
    };

    while ((match = tokenRegex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        const prefix = line.substring(lastIndex, match.index);
        parts.push(
          <React.Fragment key={`prefix-${lastIndex}`}>
            {highlightText(prefix, 'text-gray-500')}
          </React.Fragment>
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
            <React.Fragment key={`key-${match.index}`}>
              {highlightText(keyName, 'text-sky-300 font-semibold')}
              {highlightText(colonAndSpace, 'text-gray-400')}
            </React.Fragment>
          );
        } else {
          // String Value (Data)
          parts.push(
            <React.Fragment key={`str-${match.index}`}>
              {highlightText(token, 'text-emerald-400 font-normal')}
            </React.Fragment>
          );
        }
      } else if (/true|false/.test(token)) {
        // Boolean
        parts.push(
          <React.Fragment key={`bool-${match.index}`}>
            {highlightText(token, 'text-purple-400 font-bold')}
          </React.Fragment>
        );
      } else if (/null/.test(token)) {
        // Null
        parts.push(
          <React.Fragment key={`null-${match.index}`}>
            {highlightText(token, 'text-rose-400 italic font-semibold')}
          </React.Fragment>
        );
      } else if (/^-?\d+/.test(token)) {
        // Number
        parts.push(
          <React.Fragment key={`num-${match.index}`}>
            {highlightText(token, 'text-amber-300 font-mono')}
          </React.Fragment>
        );
      } else if (/[{}[\]]/.test(token)) {
        // Brackets & Braces
        parts.push(
          <React.Fragment key={`brac-${match.index}`}>
            {highlightText(token, 'text-amber-500/90 font-bold')}
          </React.Fragment>
        );
      } else if (token === ',') {
        // Commas
        parts.push(
          <React.Fragment key={`comma-${match.index}`}>
            {highlightText(token, 'text-gray-500')}
          </React.Fragment>
        );
      } else {
        // Other punctuation
        parts.push(
          <React.Fragment key={`punc-${match.index}`}>
            {highlightText(token, 'text-gray-400')}
          </React.Fragment>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      const suffix = line.substring(lastIndex);
      parts.push(
        <React.Fragment key="suffix-end">
          {highlightText(suffix, 'text-gray-500')}
        </React.Fragment>
      );
    }

    return parts;
  };

  return (
    <div className="font-mono text-xs select-text overflow-x-auto leading-relaxed">
      {/* Postman-Style Bracket Fold Toolbar */}
      {foldMap.size > 0 && (
        <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-gray-900 text-[11px] text-gray-500 select-none">
          <span className="font-mono text-gray-400 text-[10px]">
            {formattedLines.length} lines{' '}
            {collapsedLines.size > 0 && (
              <span className="text-orange-400 font-medium">({collapsedLines.size} collapsed)</span>
            )}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={collapseAll}
              className="flex items-center space-x-1 text-gray-400 hover:text-orange-400 px-1.5 py-0.5 rounded hover:bg-gray-900 transition-colors text-[10px]"
              title="Collapse all bracket blocks"
            >
              <FoldVertical className="w-3 h-3" />
              <span>Collapse All</span>
            </button>
            <span className="text-gray-700">|</span>
            <button
              onClick={expandAll}
              className="flex items-center space-x-1 text-gray-400 hover:text-orange-400 px-1.5 py-0.5 rounded hover:bg-gray-900 transition-colors text-[10px]"
              title="Expand all bracket blocks"
            >
              <Maximize2 className="w-3 h-3" />
              <span>Expand All</span>
            </button>
          </div>
        </div>
      )}

      {/* Code Lines with Folding Gutter */}
      <div className="min-w-full inline-block">
        {formattedLines.map((line, idx) => {
          if (hiddenLines.has(idx)) {
            return null;
          }

          const isFoldable = foldMap.has(idx);
          const isCollapsed = collapsedLines.has(idx);
          const endLine = isCollapsed ? foldMap.get(idx) : undefined;
          const hiddenCount = endLine !== undefined ? endLine - idx : 0;
          const closingSuffix = endLine !== undefined ? formattedLines[endLine]?.trim() || '' : '';
          const isLineActiveMatch = idx === activeLineIndex;

          return (
            <div
              key={idx}
              id={`json-line-${idx}`}
              className={`flex py-0.5 rounded transition-colors group ${
                isLineActiveMatch ? 'bg-orange-950/40 ring-1 ring-orange-500/40' : 'hover:bg-gray-900/70'
              }`}
            >
              {/* Folding Chevron + Line Number Gutter */}
              <div className="flex items-center w-14 shrink-0 select-none mr-2.5 border-r border-gray-800/80 pr-2">
                <div className="w-4 flex items-center justify-center">
                  {isFoldable ? (
                    <button
                      onClick={() => toggleFold(idx)}
                      className="p-0.5 text-gray-400 hover:text-orange-400 rounded transition-colors"
                      title={isCollapsed ? 'Expand bracket block' : 'Collapse bracket block'}
                    >
                      {isCollapsed ? (
                        <ChevronRight className="w-3 h-3 text-orange-400" />
                      ) : (
                        <ChevronDown className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                      )}
                    </button>
                  ) : null}
                </div>

                <span
                  className={`flex-1 text-right font-mono text-[11px] ${
                    isLineActiveMatch ? 'text-orange-400 font-bold' : 'text-gray-600'
                  }`}
                >
                  {idx + 1}
                </span>
              </div>

              {/* Code Content */}
              <span className="whitespace-pre font-mono text-[11px] flex items-center flex-wrap">
                {renderLine(line, idx)}
                {isCollapsed && (
                  <>
                    <span
                      onClick={() => toggleFold(idx)}
                      className="mx-1.5 px-1.5 py-0.2 text-[10px] font-mono font-medium bg-gray-850 hover:bg-gray-800 text-amber-300 hover:text-amber-200 border border-gray-700/80 rounded cursor-pointer select-none transition-colors shadow-xs"
                      title={`Click to expand (${hiddenCount} lines hidden)`}
                    >
                      ... {hiddenCount} lines
                    </span>
                    <span className="text-amber-500/90 font-bold">{closingSuffix}</span>
                  </>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
