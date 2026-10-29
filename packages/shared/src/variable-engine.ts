export interface VariableResolutionScope {
  global?: Record<string, string>;
  collection?: Record<string, string>;
  environment?: Record<string, string>;
}

/**
 * Merges variables following precedence:
 * Environment overrides Collection overrides Global.
 */
export function mergeVariableScopes(scopes: VariableResolutionScope): Record<string, string> {
  return {
    ...(scopes.global || {}),
    ...(scopes.collection || {}),
    ...(scopes.environment || {}),
  };
}

const VARIABLE_REGEX = /\{\{([a-zA-Z0-9_.\-]+)\}\}/g;

/**
 * Extracts all variable names referenced in the template.
 */
export function extractVariableNames(template: string): string[] {
  if (!template) return [];
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  const regex = new RegExp(VARIABLE_REGEX);
  while ((match = regex.exec(template)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

/**
 * Interpolates variables using {{var}} syntax with recursive resolution and loop detection.
 */
export function interpolateVariables(
  template: string,
  variables: Record<string, string>,
  maxDepth = 5
): string {
  if (!template || typeof template !== 'string') {
    return template;
  }

  let result = template;
  let depth = 0;

  while (depth < maxDepth && VARIABLE_REGEX.test(result)) {
    // Reset lastIndex for regex reuse
    VARIABLE_REGEX.lastIndex = 0;
    let changed = false;

    result = result.replace(VARIABLE_REGEX, (match, varName) => {
      if (Object.prototype.hasOwnProperty.call(variables, varName)) {
        changed = true;
        return variables[varName] !== undefined && variables[varName] !== null
          ? String(variables[varName])
          : match;
      }
      return match;
    });

    if (!changed) break;
    depth++;
  }

  return result;
}

/**
 * Interpolates all string fields inside a deeply nested object or array.
 */
export function interpolateDeep<T>(obj: T, variables: Record<string, string>): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return interpolateVariables(obj, variables) as unknown as T;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => interpolateDeep(item, variables)) as unknown as T;
  }

  if (typeof obj === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      output[key] = interpolateDeep(val, variables);
    }
    return output as T;
  }

  return obj;
}

