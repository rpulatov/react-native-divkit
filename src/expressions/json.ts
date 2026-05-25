/* eslint-disable max-depth */
import type { Node } from './ast';
import type { Variable, VariableValue } from './variable';
import type { Store } from '../../typings/store';
import { uniq } from '../utils/uniq';
import { parse } from './expressions';
import { evalExpression, type VariablesMap } from './eval';
import { dateToString, gatherVarsFromAst, stringifyColor } from './utils';
import { type LogError, wrapError } from '../utils/wrapError';
import { parseColor } from '../utils/correctColor';
import { MAX_INT32, MIN_INT32 } from './const';
import { simpleUnescapeString } from './simpleUnescapeString';
import { cacheGet, cacheSet } from './parserCache';
import type { CustomFunctions } from './funcs/customFuncs';

class ExpressionBinding {
    private readonly ast: Node;
    private readonly expr: string;

    constructor(ast: Node, expr: string) {
        this.ast = ast;
        this.expr = expr;
    }

    /**
     * Applies variables into ast
     * @param variables
     * @param logError
     */
    apply<T>({
        variables,
        customFunctions,
        logError,
        store,
        weekStartDay,
        keepComplex
    }: {
        variables: VariablesMap;
        customFunctions: CustomFunctions | undefined;
        logError: LogError;
        store: Store | undefined;
        weekStartDay: number;
        keepComplex?: boolean;
    }): {
        result: T;
        usedVars?: Set<Variable>;
    } {
        let res: ReturnType<typeof evalExpression> | undefined;

        try {
            res = evalExpression(variables, customFunctions, store, this.ast, {
                weekStartDay
            });
            res.warnings.forEach(logError);
            const result = res.result;

            if (result.type === 'error') {
                logError(
                    wrapError(new Error('Expression execution error'), {
                        additional: {
                            message: result.value,
                            expression: this.expr
                        }
                    })
                );
                return {
                    result: undefined as T,
                    usedVars: res.usedVars
                };
            }

            const value = result.value;
            if (value instanceof Date) {
                return {
                    result: dateToString(value) as T,
                    usedVars: res.usedVars
                };
            }
            if (result.type === 'boolean') {
                return {
                    result: Boolean(value) as T,
                    usedVars: res.usedVars
                };
            }
            if (result.type === 'color') {
                const parsed = parseColor(String(value));
                if (parsed) {
                    return {
                        result: stringifyColor(parsed) as T,
                        usedVars: res.usedVars
                    };
                }
                logError(wrapError(new Error('Expression execution error')));
            }
            if (result.type === 'integer') {
                if ((value as number) > MAX_INT32 || (value as number) < MIN_INT32) {
                    logError(wrapError(new Error('Expression result is out of 32-bit int range')));
                    return {
                        result: undefined as T,
                        usedVars: res.usedVars
                    };
                }
                return {
                    result: Number(value) as T,
                    usedVars: res.usedVars
                };
            }
            if (result.type === 'function') {
                return {
                    result: `<${result.value[0]?.name || 'Function'}>` as T,
                    usedVars: res.usedVars
                };
            }
            if (!keepComplex && (result.type === 'array' || result.type === 'dict')) {
                try {
                    return {
                        result: JSON.stringify(value) as T,
                        usedVars: res.usedVars
                    };
                } catch (err) {
                    logError(wrapError(new Error(`Failed to stringify ${result.type}`)));
                    return {
                        result: `<${result.type}>` as T,
                        usedVars: res.usedVars
                    };
                }
            }
            return {
                result: value as T,
                usedVars: res.usedVars
            };
        } catch (err) {
            logError(
                wrapError(new Error('Expression execution error'), {
                    additional: {
                        expression: this.expr
                    }
                })
            );
            return {
                result: undefined as T,
                usedVars: res?.usedVars
            };
        }
    }
}

class VariableBinding {
    private readonly variable: string;

    constructor(variable: string) {
        this.variable = variable;
    }

    /**
     * Applies variables into ast
     * @param variables
     * @param logError
     */
    apply(variables: VariablesMap): VariableValue | string | undefined {
        const varInstance = variables.get(this.variable);
        if (varInstance) {
            return varInstance.getValue();
        }

        return undefined;
    }
}

/**
 * Subtrees (arrays/objects) returned by prepareVarsObj that contain no Expression/Variable
 * bindings anywhere inside — i.e. they are byte-for-byte identical to the original JSON.
 * applyVars consults this set to skip walking static subtrees entirely.
 *
 * WeakSet keeps the entries alive only as long as the JSON itself is alive.
 */
const STATIC_SUBTREES = new WeakSet<object>();

function hasBinding(node: unknown): boolean {
    if (node === null || typeof node !== 'object') return false;
    if (node instanceof ExpressionBinding || node instanceof VariableBinding) return true;
    return !STATIC_SUBTREES.has(node as object);
}

export type MaybeMissing<T> =
    | T
    | (T extends (infer U)[]
          ? MaybeMissing<U>[]
          : T extends object
            ? {
                  [P in keyof T]?: MaybeMissing<T[P]>;
              }
            : T | undefined);

function hasExpressions(str: string): boolean {
    return str.indexOf('@{') > -1 || str.indexOf('\\') > -1;
}

function prepareVarsObj<T>(
    jsonProp: T,
    store: {
        vars: string[];
        hasExpression: boolean;
    },
    logError: LogError,
    maxDepth: number
): unknown {
    if (jsonProp) {
        if (typeof jsonProp === 'string') {
            if (hasExpressions(jsonProp)) {
                store.hasExpression = true;

                if (process.env.ENABLE_EXPRESSIONS || process.env.ENABLE_EXPRESSIONS === undefined) {
                    try {
                        const ast =
                            cacheGet(jsonProp) ||
                            parse(jsonProp, {
                                startRule: 'JsonStringContents'
                            });
                        cacheSet(jsonProp, ast);
                        const propVars = gatherVarsFromAst(ast);
                        store.vars.push(...propVars);

                        return new ExpressionBinding(ast, jsonProp);
                    } catch (err) {
                        logError(
                            wrapError(new Error('Unable to parse expression'), {
                                additional: {
                                    expression: jsonProp
                                }
                            })
                        );
                        return undefined;
                    }
                } else {
                    if (jsonProp === '@{}') {
                        return '';
                    } else if (jsonProp.startsWith('@{') && jsonProp.endsWith('}')) {
                        return new VariableBinding(jsonProp.substring(2, jsonProp.length - 1));
                    }
                    try {
                        return simpleUnescapeString(jsonProp);
                    } catch (err: any) {
                        logError(
                            wrapError(err as Error, {
                                additional: {
                                    expression: jsonProp
                                }
                            })
                        );
                        return undefined;
                    }
                }
            }
        } else if (Array.isArray(jsonProp) && maxDepth > 0) {
            // Walk children, but only allocate a new array if any child returned
            // something different (i.e. got wrapped into an ExpressionBinding /
            // VariableBinding). Otherwise reuse the same array and tag it as a
            // static subtree so applyVars can skip walking it entirely.
            let changed = false;
            const mapped = new Array(jsonProp.length);
            for (let i = 0; i < jsonProp.length; i++) {
                const r = prepareVarsObj(jsonProp[i], store, logError, maxDepth - 1);
                mapped[i] = r;
                if (r !== jsonProp[i]) changed = true;
            }
            if (!changed) {
                STATIC_SUBTREES.add(jsonProp);
                return jsonProp;
            }
            return mapped;
        } else if (typeof jsonProp === 'object' && maxDepth > 0) {
            // Same idea: keep the original object if nothing got rewritten.
            let changed = false;
            const res: Record<string, unknown> = {};
            for (const key in jsonProp) {
                const r = prepareVarsObj(jsonProp[key], store, logError, maxDepth - 1);
                res[key] = r;
                if (r !== (jsonProp as Record<string, unknown>)[key]) changed = true;
            }
            if (!changed) {
                STATIC_SUBTREES.add(jsonProp as object);
                return jsonProp;
            }
            return res;
        }
    }
    return jsonProp;
}

function applyVars<T>(
    jsonProp: T,
    opts: {
        variables: VariablesMap;
        customFunctions: CustomFunctions | undefined;
        logError: LogError;
        store: Store | undefined;
        weekStartDay: number;
        keepComplex?: boolean;
    }
): {
    result: MaybeMissing<T>;
    usedVars?: Set<Variable>;
} {
    if (jsonProp) {
        if (
            (process.env.ENABLE_EXPRESSIONS || process.env.ENABLE_EXPRESSIONS === undefined) &&
            jsonProp instanceof ExpressionBinding
        ) {
            return jsonProp.apply<T>(opts);
        } else if (
            !process.env.ENABLE_EXPRESSIONS &&
            process.env.ENABLE_EXPRESSIONS !== undefined &&
            jsonProp instanceof VariableBinding
        ) {
            return {
                result: jsonProp.apply(opts.variables) as T
            };
        } else if (Array.isArray(jsonProp)) {
            // Fast path: if no item is a binding (i.e. prepareVarsObj returned the
            // same array because the subtree was fully static), don't walk children
            // or allocate a new array. Preserves identity across renders.
            if (!hasBinding(jsonProp)) {
                return { result: jsonProp as MaybeMissing<T> };
            }
            let usedVars: Set<Variable> | undefined;
            let changed = false;
            const arr = new Array(jsonProp.length);
            for (let i = 0; i < jsonProp.length; i++) {
                const subres = applyVars(jsonProp[i], opts);
                arr[i] = subres.result;
                if (subres.result !== jsonProp[i]) changed = true;

                if (subres.usedVars) {
                    if (!usedVars) {
                        usedVars = new Set();
                    }
                    for (const instance of subres.usedVars) {
                        usedVars.add(instance);
                    }
                }
            }
            return {
                result: (changed ? arr : jsonProp) as MaybeMissing<T>,
                usedVars
            };
        } else if (typeof jsonProp === 'object') {
            if (!hasBinding(jsonProp)) {
                return { result: jsonProp as MaybeMissing<T> };
            }
            const res: Record<string, unknown> = {};
            let usedVars: Set<Variable> | undefined;
            let changed = false;
            for (const key in jsonProp) {
                const subres = applyVars(jsonProp[key as keyof typeof jsonProp], opts);
                res[key] = subres.result;
                if (subres.result !== jsonProp[key as keyof typeof jsonProp]) changed = true;

                if (subres.usedVars) {
                    if (!usedVars) {
                        usedVars = new Set();
                    }
                    for (const instance of subres.usedVars) {
                        usedVars.add(instance);
                    }
                }
            }
            return {
                result: (changed ? res : jsonProp) as MaybeMissing<T>,
                usedVars
            };
        }
    }
    return {
        result: jsonProp
    };
}

export interface PreparedExpression<T> {
    vars: string[];
    hasExpression: boolean;
    applyVars: (
        variables: VariablesMap,
        customFunctions?: CustomFunctions,
        keepComplex?: boolean
    ) => {
        result: MaybeMissing<T>;
        usedVars?: Set<Variable>;
    };
}

export function prepareVars<T>(
    jsonProp: T,
    logError: LogError,
    store: Store | undefined,
    weekStartDay: number,
    maxDepth = Infinity
): PreparedExpression<T> {
    const result: {
        vars: string[];
        hasExpression: boolean;
    } = {
        vars: [],
        hasExpression: false
    };
    const root = prepareVarsObj(jsonProp, result, logError, maxDepth);

    const vars = uniq(result.vars);

    return {
        vars,
        hasExpression: result.hasExpression,
        applyVars(variables, customFunctions, keepComplex) {
            return applyVars<T>(root as T, {
                variables,
                customFunctions,
                logError,
                store,
                weekStartDay,
                keepComplex
            });
        }
    };
}
