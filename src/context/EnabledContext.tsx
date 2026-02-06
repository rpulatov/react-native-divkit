import { createContext, useContext } from 'react';
import type { Observable } from '../stores/createObservable';

/**
 * Enabled context interface
 * Based on EnabledCtxValue from Web implementation
 *
 * This context tracks whether the current component is enabled.
 * Used for cascading enabled/disabled state down the component tree.
 */
export interface EnabledContextValue {
    /**
     * Observable that tracks whether the component is enabled
     * Subscribers will be notified when the enabled state changes
     */
    isEnabled: Observable<boolean>;
}

export const EnabledContext = createContext<EnabledContextValue | null>(null);

/**
 * Hook to access EnabledContext
 * Throws an error if used outside of EnabledContext.Provider
 */
export function useEnabledContext(): EnabledContextValue {
    const context = useContext(EnabledContext);
    if (!context) {
        throw new Error('useEnabledContext must be used within EnabledContext.Provider');
    }
    return context;
}

/**
 * Hook to safely access EnabledContext (returns null if not available)
 */
export function useEnabledContextOptional(): EnabledContextValue | null {
    return useContext(EnabledContext);
}

/**
 * Hook to get the current enabled state value
 * Returns true if no EnabledContext is available (enabled by default)
 */
export function useIsEnabled(): boolean {
    const context = useEnabledContextOptional();
    if (!context) {
        return true; // Enabled by default if no context
    }
    return context.isEnabled.get();
}
