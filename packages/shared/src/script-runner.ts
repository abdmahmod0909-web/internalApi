export interface TestResultItem {
  name: string;
  passed: boolean;
  error?: string;
}

export interface ScriptExecutionResult {
  tests: TestResultItem[];
  environmentMutations: Record<string, string>;
  logs: string[];
}

export interface ScriptContext {
  environment: Record<string, string>;
  variables: Record<string, string>;
  request: {
    url: string;
    method: string;
    headers: Record<string, string>;
    body?: string;
  };
  response?: {
    status: number;
    statusText: string;
    headers: Record<string, string | string[]>;
    body: string;
    time: number;
  };
}

/**
 * Creates a lightweight assertion object matching Chai/pm.expect API.
 */
function createExpect(actual: any, isNegated = false) {
  const assert = (condition: boolean, msg: string) => {
    const passed = isNegated ? !condition : condition;
    if (!passed) {
      throw new Error(msg);
    }
  };

  const assertionObj = {
    get not() {
      return createExpect(actual, !isNegated);
    },
    get to() {
      return assertionObj;
    },
    get be() {
      return assertionObj;
    },
    get have() {
      return assertionObj;
    },
    get a() {
      return assertionObj;
    },
    get an() {
      return assertionObj;
    },

    equal(expected: any) {
      assert(
        actual === expected || JSON.stringify(actual) === JSON.stringify(expected),
        `expected ${JSON.stringify(actual)} to equal ${JSON.stringify(expected)}`
      );
    },
    eql(expected: any) {
      this.equal(expected);
    },
    include(item: any) {
      if (typeof actual === 'string' || Array.isArray(actual)) {
        assert(actual.includes(item), `expected ${JSON.stringify(actual)} to include ${JSON.stringify(item)}`);
      } else if (typeof actual === 'object' && actual !== null) {
        assert(item in actual, `expected ${JSON.stringify(actual)} to include property ${item}`);
      } else {
        assert(false, `cannot check include on ${typeof actual}`);
      }
    },
    property(prop: string, value?: any) {
      assert(typeof actual === 'object' && actual !== null && prop in actual, `expected property '${prop}' to exist`);
      if (value !== undefined) {
        assert(actual[prop] === value, `expected property '${prop}' to equal ${JSON.stringify(value)} but got ${JSON.stringify(actual[prop])}`);
      }
    },
    status(code: number) {
      assert(actual === code, `expected response status code ${actual} to equal ${code}`);
    },
    above(n: number) {
      assert(typeof actual === 'number' && actual > n, `expected ${actual} to be above ${n}`);
    },
    below(n: number) {
      assert(typeof actual === 'number' && actual < n, `expected ${actual} to be below ${n}`);
    },
    true() {
      assert(actual === true, `expected ${actual} to be true`);
    },
    false() {
      assert(actual === false, `expected ${actual} to be false`);
    },
    null() {
      assert(actual === null, `expected ${actual} to be null`);
    },
  };

  return assertionObj;
}

/**
 * Executes pre-request or post-response test scripts with a Postman-compatible pm object.
 */
export function executeScript(script: string, context: ScriptContext): ScriptExecutionResult {
  if (!script || !script.trim()) {
    return { tests: [], environmentMutations: {}, logs: [] };
  }

  const tests: TestResultItem[] = [];
  const environmentMutations: Record<string, string> = {};
  const logs: string[] = [];

  // Working copies of variables
  const envVars = { ...context.environment };
  const localVars = { ...context.variables };

  // Response object helpers
  let responseData: any = null;
  if (context.response) {
    try {
      responseData = JSON.parse(context.response.body);
    } catch {
      // not JSON
    }
  }

  const pm = {
    environment: {
      get: (key: string) => envVars[key],
      set: (key: string, value: any) => {
        const valStr = String(value);
        envVars[key] = valStr;
        environmentMutations[key] = valStr;
      },
      unset: (key: string) => {
        delete envVars[key];
        environmentMutations[key] = '';
      },
      has: (key: string) => Object.prototype.hasOwnProperty.call(envVars, key),
    },

    variables: {
      get: (key: string) => localVars[key] ?? envVars[key],
      set: (key: string, value: any) => {
        localVars[key] = String(value);
      },
    },

    request: {
      url: context.request.url,
      method: context.request.method,
      headers: context.request.headers,
    },

    response: context.response
      ? {
          code: context.response.status,
          status: context.response.statusText,
          responseTime: context.response.time,
          text: () => context.response?.body || '',
          json: () => {
            if (responseData === null) {
              throw new Error('Response body is not valid JSON');
            }
            return responseData;
          },
          headers: context.response.headers,
          to: {
            have: {
              status: (code: number) => {
                if (context.response?.status !== code) {
                  throw new Error(`expected status ${context.response?.status} to equal ${code}`);
                }
              },
            },
          },
        }
      : undefined,

    test: (name: string, fn: () => void) => {
      try {
        fn();
        tests.push({ name, passed: true });
      } catch (err: any) {
        tests.push({ name, passed: false, error: err.message || 'Assertion failed' });
      }
    },

    expect: (actual: any) => createExpect(actual),
  };

  const sandboxConsole = {
    log: (...args: any[]) => logs.push(args.map((a) => (typeof a === 'object' ? JSON.stringify(a) : String(a))).join(' ')),
    warn: (...args: any[]) => logs.push('[WARN] ' + args.join(' ')),
    error: (...args: any[]) => logs.push('[ERROR] ' + args.join(' ')),
  };

  try {
    // Run script inside isolated function wrapper
    const runner = new Function('pm', 'console', script);
    runner(pm, sandboxConsole);
  } catch (err: any) {
    tests.push({
      name: 'Script Execution Error',
      passed: false,
      error: err.message || 'Syntax or runtime error in script',
    });
  }

  return {
    tests,
    environmentMutations,
    logs,
  };
}

