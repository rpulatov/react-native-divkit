/**
 * Local variables scope for any div-node (not just card root).
 *
 * Mirrors Web Root.svelte processChildContext (handling of childProcessedJson.variables):
 * if a node declares `variables`, we instantiate them (merged with parent scope, local wins)
 * and expose the resulting scope to children. Combined with template `$value` substitution
 * this lets a template parameter flow into a real variable visible inside `@{...}`.
 */

import { useMemo } from 'react';
import type { DivVariable } from '../../typings/common';
import type { ComponentContext } from '../types/componentContext';
import type { Variable, VariableType } from '../expressions/variable';
import { createVariable } from '../expressions/variable';
import { wrapError } from '../utils/wrapError';

export function useLocalVariables<T extends ComponentContext>(componentContext: T): T {
    const localVarsList = (componentContext.json as any)?.variables as
        | DivVariable[]
        | undefined;
    const { logError } = componentContext;

    const localVariables = useMemo(() => {
        if (!Array.isArray(localVarsList) || localVarsList.length === 0) {
            return null;
        }

        const map = new Map<string, Variable>();
        for (const desc of localVarsList) {
            if (!desc || typeof desc !== 'object') continue;
            const name = (desc as any).name as string | undefined;
            const type = (desc as any).type as string | undefined;
            if (!name || !type) continue;
            // Skip property-variables — they need actions/getter machinery (post-MVP).
            if (type === 'property') continue;
            try {
                map.set(name, createVariable(name, type as VariableType, (desc as any).value));
            } catch (err) {
                logError(
                    wrapError(err as Error, {
                        additional: { variable: name, type }
                    })
                );
            }
        }

        return map.size > 0 ? map : null;
    }, [localVarsList, logError]);

    // Merge parent + local into a single Variables Map. Depend on the parent Map
    // identity (not the whole componentContext), so the merged Map keeps its identity
    // across parent re-renders that don't actually change variables — this is what
    // lets React.memo(DivComponent) skip work for template subtrees.
    const parentVariables = componentContext.variables;
    const mergedVariables = useMemo(() => {
        if (!localVariables) return parentVariables;
        const merged = new Map<string, Variable>();
        if (parentVariables) {
            for (const [k, v] of parentVariables) merged.set(k, v);
        }
        for (const [k, v] of localVariables) {
            merged.set(k, v);
        }
        return merged;
    }, [parentVariables, localVariables]);

    return useMemo(() => {
        if (!localVariables) return componentContext;
        return {
            ...componentContext,
            variables: mergedVariables
        };
    }, [componentContext, localVariables, mergedVariables]);
}
