import React, { useMemo } from 'react';

interface Props {
  jsonString: string;
  searchTerm?: string;
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
 * Tokenizes and formats JSON with vibrant, eye-friendly syntax highlighting,
 * line numbers, and full search support for both columns (keys) and data (values).
 */
export const JsonViewer: React.FC<Props> = ({ jsonString, searchTerm }) => {
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

  // Syntax highlighter for a single line of JSON
  const renderLine = (line: string) => {
    // Regular expression matching JSON tokens:
    // 1: Key ("key":)
    // 2: String ("val")
    // 3: Boolean (true/false)
    // 4: Null (null)
    // 5: Number (-?123.45)
    // 6: Brackets & Punctuation ({, }, [, ], ,, :)
    const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?|[{}[\],:])/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(line)) !== null) {
      // Push any prefix whitespace / punctuation
      if (match.index > lastIndex) {
        const prefix = line.substring(lastIndex, match.index);
        parts.push(
          <React.Fragment key={`prefix-${lastIndex}`}>
            {highlightMatch(prefix, searchTerm, 'text-gray-500')}
          </React.Fragment>
        );
      }

      const token = match[0];

      if (/^"/.test(token)) {
        if (/:$/.test(token)) {
          // Property Key (Column Name) - e.g. "name": or "data":
          const colonIdx = token.lastIndexOf(':');
          const keyName = token.slice(0, colonIdx);
          const colonAndSpace = token.slice(colonIdx);

          parts.push(
            <React.Fragment key={`key-${match.index}`}>
              {highlightMatch(keyName, searchTerm, 'text-sky-300 font-semibold')}
              {highlightMatch(colonAndSpace, searchTerm, 'text-gray-400')}
            </React.Fragment>
          );
        } else {
          // String Value (Data) - e.g. "english", "arabic"
          parts.push(
            <React.Fragment key={`str-${match.index}`}>
              {highlightMatch(token, searchTerm, 'text-emerald-400 font-normal')}
            </React.Fragment>
          );
        }
      } else if (/true|false/.test(token)) {
        // Boolean
        parts.push(
          <React.Fragment key={`bool-${match.index}`}>
            {highlightMatch(token, searchTerm, 'text-purple-400 font-bold')}
          </React.Fragment>
        );
      } else if (/null/.test(token)) {
        // Null
        parts.push(
          <React.Fragment key={`null-${match.index}`}>
            {highlightMatch(token, searchTerm, 'text-rose-400 italic font-semibold')}
          </React.Fragment>
        );
      } else if (/^-?\d+/.test(token)) {
        // Number
        parts.push(
          <React.Fragment key={`num-${match.index}`}>
            {highlightMatch(token, searchTerm, 'text-amber-300 font-mono')}
          </React.Fragment>
        );
      } else if (/[{}[\]]/.test(token)) {
        // Brackets & Braces - Colorful golden accents
        parts.push(
          <React.Fragment key={`brac-${match.index}`}>
            {highlightMatch(token, searchTerm, 'text-amber-500/90 font-bold')}
          </React.Fragment>
        );
      } else if (token === ',') {
        // Commas
        parts.push(
          <React.Fragment key={`comma-${match.index}`}>
            {highlightMatch(token, searchTerm, 'text-gray-500')}
          </React.Fragment>
        );
      } else {
        // Other punctuation
        parts.push(
          <React.Fragment key={`punc-${match.index}`}>
            {highlightMatch(token, searchTerm, 'text-gray-400')}
          </React.Fragment>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      const suffix = line.substring(lastIndex);
      parts.push(
        <React.Fragment key="suffix-end">
          {highlightMatch(suffix, searchTerm, 'text-gray-500')}
        </React.Fragment>
      );
    }

    return parts;
  };

  return (
    <div className="font-mono text-xs select-text overflow-x-auto leading-relaxed">
      <div className="min-w-full inline-block">
        {formattedLines.map((line, idx) => (
          <div key={idx} className="flex hover:bg-gray-900/70 py-0.5 rounded transition-colors">
            {/* Line Number */}
            <span className="w-10 pr-3 text-right select-none text-gray-600 font-mono text-[11px] shrink-0 border-r border-gray-800/80 mr-3">
              {idx + 1}
            </span>
            {/* Formatted Syntax Highlighted Code */}
            <span className="whitespace-pre font-mono text-[11px]">{renderLine(line)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
