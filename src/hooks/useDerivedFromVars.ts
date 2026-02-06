/**
 * React hook for reactive variable substitution in JSON props
 * Replaces Svelte's $: reactive statements with React hooks
 *
 * Based on getDerivedFromVars pattern from Web Root.svelte
 */

import { useEffect, useState, useMemo, useRef } from 'react';
import type { MaybeMissing } from '../expressions/json';
import { prepareVars } from '../expressions/json';
import type { Variable } from '../expressions/variable';
import type { VariablesMap } from '../expressions/eval';
import type { Store } from '../../typings/store';
import type { CustomFunctions } from '../expressions/funcs/customFuncs';
import type { Unsubscriber } from '../stores/createObservable';

export interface UseDerivedFromVarsOptions {
    /**
     * Variables map (from DivKitContext)
     */
    variables: VariablesMap;

    /**
     * Additional variables (optional, for local context)
     */
    additionalVars?: Map<string, Variable>;

    /**
     * Keep complex types (dict, array) as objects instead of stringifying
     * Default: false
     */
    keepComplex?: boolean;

    /**
     * Maximum depth for expression processing
     * Default: 10
     */
    maxDepth?: number;

    /**
     * Custom functions for expressions
     */
    customFunctions?: CustomFunctions;

    /**
     * Store context (for advanced features)
     */
    store?: Store;

    /**
     * Week start day (0 = Sunday, 1 = Monday)
     * Default: 0
     */
    weekStartDay?: number;

    /**
     * Error logger
     */
    logError?: (error: Error) => void;
}

/**
 * Hook that subscribes to variables used in JSON expressions and re-evaluates when they change
 *
 * @example
 * ```tsx
 * const text = useDerivedFromVars(
 *   json.text, // "Hello @{userName}"
 *   { variables }
 * );
 * // text = "Hello Alice"
 * // When userName variable changes, text automatically updates
 * ```
 */
export function useDerivedFromVars<T>(
    jsonProp: T,
    options: UseDerivedFromVarsOptions
): MaybeMissing<T> {
    const {
        variables,
        additionalVars,
        keepComplex = false,
        maxDepth = 10,
        customFunctions,
        store,
        weekStartDay = 0,
        logError = console.error
    } = options;

    // Merge variables maps
    const allVariables = useMemo(() => {
        if (!additionalVars || additionalVars.size === 0) {
            return variables;
        }
        const merged = new Map(variables);
        additionalVars.forEach((value, key) => {
            merged.set(key, value);
        });
        return merged;
    }, [variables, additionalVars]);

    // Prepare expressions once (parse and analyze JSON for @{} expressions)
    const prepared = useMemo(() => {
        return prepareVars(jsonProp, logError, store, weekStartDay, maxDepth);
    }, [jsonProp, logError, store, weekStartDay, maxDepth]);

    // Apply variables and get initial value
    const getComputedValue = () => {
        const { result, usedVars } = prepared.applyVars(
            allVariables,
            customFunctions,
            keepComplex
        );
        return { result, usedVars };
    };

    // State for the computed value
    const [value, setValue] = useState<MaybeMissing<T>>(() => getComputedValue().result);

    // Track used variables for subscription
    const usedVarsRef = useRef<Set<Variable>>();

    // Subscribe to used variables and update when they change
    useEffect(() => {
        // If no expressions, no need to subscribe
        if (!prepared.hasExpression) {
            return;
        }

        // Compute initial value and get used variables
        const { result, usedVars } = getComputedValue();
        setValue(result);
        usedVarsRef.current = usedVars;

        // Subscribe to all used variables
        const unsubscribers: Unsubscriber[] = [];

        if (usedVars) {
            usedVars.forEach(variable => {
                const unsubscribe = variable.subscribe(() => {
                    // Variable changed - recompute value
                    const { result: newResult, usedVars: newUsedVars } = getComputedValue();
                    setValue(newResult);

                    // If used variables changed, we need to re-subscribe
                    // This happens if expression result depends on conditional logic
                    if (newUsedVars && newUsedVars !== usedVarsRef.current) {
                        const hasChanged =
                            newUsedVars.size !== usedVarsRef.current?.size ||
                            Array.from(newUsedVars).some(v => !usedVarsRef.current?.has(v));

                        if (hasChanged) {
                            // usedVars changed - trigger re-render to re-subscribe
                            usedVarsRef.current = newUsedVars;
                        }
                    }
                });
                unsubscribers.push(unsubscribe);
            });
        }

        return () => {
            unsubscribers.forEach(unsub => unsub());
        };
    }, [prepared, allVariables, customFunctions, keepComplex]);

    if (!prepared.hasExpression) {
        return getComputedValue().result;
    }

    return value;
}

/**
 * Simplified version that only takes variables map (most common use case)
 *
 * @example
 * ```tsx
 * const text = useDerivedFromVarsSimple(json.text, variables);
 * ```
 */
export function useDerivedFromVarsSimple<T>(
    jsonProp: T,
    variables: VariablesMap
): MaybeMissing<T> {
    return useDerivedFromVars(jsonProp, { variables });
}
