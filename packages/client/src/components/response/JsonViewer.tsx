import React, { useMemo } from 'react';

interface Props {
  jsonString: string;
  searchTerm?: string;
}

/**
 * Tokenizes and formats JSON with vibrant syntax highlighting and line numbers.
 */
export const JsonViewer: React.FC<Props> = ({ jsonString, searchTerm }) => {
  const formattedLines = useMemo(() => {
    let formatted = jsonString;
    try {
      const parsed = JSON.parse(jsonString);
      formatted = JSON.stringify(parsed, null, 2);
    } catch {
      // not JSON, keep as raw text
    }

    return formatted.split('\n');
  }, [jsonString]);

  // Syntax highlighter for a single line of JSON
  const renderLine = (line: string) => {
    // Regular expression matching JSON tokens
    // 1: Key ("key":)
    // 2: String ("val")
    // 3: Number (-?123.45)
    // 4: Boolean (true/false)
    // 5: Null (null)
    const tokenRegex = /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g;

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = tokenRegex.exec(line)) !== null) {
      // Push any prefix punctuation / spaces
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lastIndex}`} className="text-gray-400">
            {line.substring(lastIndex, match.index)}
          </span>
        );
      }

      const token = match[0];
      let colorClass = 'text-gray-300';

      if (/^"/.test(token)) {
        if (/:$/.test(token)) {
          // Property Key
          const keyName = token.slice(0, -1);
          colorClass = 'text-sky-400 font-semibold';
          parts.push(
            <span key={`key-${match.index}`} className={colorClass}>
              {keyName}
            </span>
          );
          parts.push(
            <span key={`colon-${match.index}`} className="text-gray-400">
              :
            </span>
          );
          lastIndex = tokenRegex.lastIndex;
          continue;
        } else {
          // String Value
          colorClass = 'text-emerald-400';
        }
      } else if (/true|false/.test(token)) {
        // Boolean
        colorClass = 'text-purple-400 font-bold';
      } else if (/null/.test(token)) {
        // Null
        colorClass = 'text-rose-400 italic';
      } else {
        // Number
        colorClass = 'text-amber-400';
      }

      // Highlight search term if present
      if (searchTerm && token.toLowerCase().includes(searchTerm.toLowerCase())) {
        parts.push(
          <span key={`tok-${match.index}`} className={`${colorClass} bg-yellow-900/60 text-yellow-200 px-0.5 rounded`}>
            {token}
          </span>
        );
      } else {
        parts.push(
          <span key={`tok-${match.index}`} className={colorClass}>
            {token}
          </span>
        );
      }

      lastIndex = tokenRegex.lastIndex;
    }

    if (lastIndex < line.length) {
      parts.push(
        <span key={`text-end`} className="text-gray-400">
          {line.substring(lastIndex)}
        </span>
      );
    }

    return parts;
  };

  return (
    <div className="font-mono text-xs select-text overflow-x-auto leading-relaxed">
      <div className="min-w-full inline-block">
        {formattedLines.map((line, idx) => (
          <div key={idx} className="flex hover:bg-gray-900/60 py-0.5">
            {/* Line Number */}
            <span className="w-10 pr-3 text-right select-none text-gray-600 font-mono text-[11px] shrink-0 border-r border-gray-800/80 mr-3">
              {idx + 1}
            </span>
            {/* Formatted Code */}
            <span className="whitespace-pre font-mono text-[11px]">{renderLine(line)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

