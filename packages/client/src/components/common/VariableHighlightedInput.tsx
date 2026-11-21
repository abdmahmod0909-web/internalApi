import React, { useRef, useLayoutEffect, forwardRef, useImperativeHandle } from 'react';

export interface VariableItem {
  key: string;
  value: string;
  scope?: string;
}

export interface VariableHighlightedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: string;
  onChange: (value: string) => void;
  variables?: VariableItem[];
  containerClassName?: string;
  inputClassName?: string;
  paddingClasses?: string;
  typographyClasses?: string;
}

/**
 * Tokenize a string into text segments and variable segments.
 * Matches full variables like `{{foo}}` as well as in-progress typing `{{bar`.
 */
function parseVariableTokens(text: string) {
  if (!text) return [];
  // Split on variable tokens: either completed {{var}} or uncompleted {{typing
  const parts = text.split(/(\{\{[a-zA-Z0-9_.\-]*\}*)/g);
  return parts.filter((p) => p.length > 0).map((part) => {
    if (part.startsWith('{{')) {
      const isComplete = part.endsWith('}}') && part.length >= 4;
      const varName = isComplete ? part.slice(2, -2) : part.slice(2);
      return {
        text: part,
        isVariable: true,
        isComplete,
        varName,
      };
    }
    return {
      text: part,
      isVariable: false,
      isComplete: false,
      varName: '',
    };
  });
}

export const VariableHighlightedInput = forwardRef<HTMLInputElement, VariableHighlightedInputProps>(
  (
    {
      value = '',
      onChange,
      variables = [],
      containerClassName = 'flex-1',
      inputClassName = '',
      paddingClasses = 'px-3 py-1.5',
      typographyClasses = 'font-mono text-xs leading-normal',
      placeholder,
      onScroll,
      onKeyUp,
      onClick,
      onSelect,
      onKeyDown,
      ...restProps
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement | null>(null);
    const backdropRef = useRef<HTMLDivElement | null>(null);

    // Expose inner input ref to parent via forwardRef
    useImperativeHandle(ref, () => inputRef.current as HTMLInputElement);

    const isPassword = restProps.type === 'password';
    const hasVariables = !isPassword && typeof value === 'string' && value.includes('{{');
    const tokens = hasVariables ? parseVariableTokens(value) : [];

    // Keep backdrop scroll in exact lockstep with input
    const syncScroll = () => {
      if (backdropRef.current && inputRef.current) {
        backdropRef.current.scrollLeft = inputRef.current.scrollLeft;
      }
    };

    useLayoutEffect(() => {
      if (hasVariables) {
        syncScroll();
      }
    }, [value, hasVariables]);

    return (
      <div className={`relative flex items-center min-w-0 ${containerClassName}`}>
        {/* Backdrop for variable syntax highlighting */}
        {hasVariables && (
          <div
            ref={backdropRef}
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 overflow-x-hidden whitespace-pre flex items-center select-none ${typographyClasses} ${paddingClasses}`}
            style={{
              fontFamily: 'inherit',
              letterSpacing: 'inherit',
            }}
          >
            {tokens.map((token, idx) => {
              if (token.isVariable) {
                if (token.isComplete) {
                  const matched = variables.find((v) => v.key === token.varName);
                  const isResolved = Boolean(matched);

                  return (
                    <span
                      key={idx}
                      className={`font-semibold inline-block transition-colors ${
                        isResolved
                          ? 'text-orange-400 bg-orange-500/20 rounded-xs'
                          : 'text-rose-400 bg-rose-500/20 rounded-xs'
                      }`}
                      title={
                        isResolved
                          ? `${token.varName} = "${matched?.value}" (${matched?.scope || 'Variable'})`
                          : `Unresolved variable: ${token.varName}`
                      }
                    >
                      {token.text}
                    </span>
                  );
                }

                // In-progress variable typing e.g. `{{var`
                return (
                  <span
                    key={idx}
                    className="text-amber-300/90 font-medium bg-amber-500/15 rounded-xs"
                  >
                    {token.text}
                  </span>
                );
              }

              // Standard static text
              return (
                <span key={idx} className="text-gray-100">
                  {token.text}
                </span>
              );
            })}
          </div>
        )}

        {/* Real Interactive Input */}
        <input
          ref={inputRef}
          type="text"
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onScroll={(e) => {
            syncScroll();
            onScroll?.(e);
          }}
          onKeyUp={(e) => {
            syncScroll();
            onKeyUp?.(e);
          }}
          onClick={(e) => {
            syncScroll();
            onClick?.(e);
          }}
          onSelect={(e) => {
            syncScroll();
            onSelect?.(e);
          }}
          onKeyDown={(e) => {
            syncScroll();
            onKeyDown?.(e);
          }}
          className={`w-full bg-transparent outline-none border-0 m-0 ${typographyClasses} ${paddingClasses} ${
            hasVariables
              ? 'text-transparent caret-white selection:bg-orange-500/30 selection:text-transparent placeholder-gray-500'
              : 'text-gray-100 placeholder-gray-500'
          } ${inputClassName}`}
          {...restProps}
        />
      </div>
    );
  }
);

VariableHighlightedInput.displayName = 'VariableHighlightedInput';
