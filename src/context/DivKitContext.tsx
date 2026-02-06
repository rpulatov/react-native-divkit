import { createContext, useContext } from 'react';
import type { Action, Direction } from '../../typings/common';
import type { MaybeMissing } from '../expressions/json';
import type { Variable } from '../expressions/variable';
import type { ComponentContext } from '../types/componentContext';

/**
 * Main DivKit context interface
 * Based on RootCtxValue from Web implementation with simplifications for MVP
 */
export interface DivKitContextValue {
    // Logging & callbacks
    logStat(type: string, action: MaybeMissing<Action>): void;
    execCustomAction(action: Action & { url: string }): void;

    // Configuration
    direction: Direction;
    platform: 'desktop' | 'touch';

    // Variable system
    variables: Map<string, Variable>;
    getVariable(name: string): Variable | undefined;
    setVariable(name: string, value: unknown): void;

    // Component registration (simplified for MVP)
    registerComponent(id: string, context: ComponentContext): void;
    unregisterComponent(id: string): void;

    // Action execution
    execAnyActions(
        actions: MaybeMissing<Action[]> | undefined,
        opts?: {
            componentContext?: ComponentContext;
            processUrls?: boolean;
        }
    ): Promise<void>;

    // ID generation (for unique component IDs)
    genId(key: string): string;
}

export const DivKitContext = createContext<DivKitContextValue | null>(null);

/**
 * Hook to access DivKitContext
 * Throws an error if used outside of DivKitContext.Provider
 */
export function useDivKitContext(): DivKitContextValue {
    const context = useContext(DivKitContext);
    if (!context) {
        throw new Error('useDivKitContext must be used within DivKitContext.Provider');
    }
    return context;
}
