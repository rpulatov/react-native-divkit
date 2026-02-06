import { createContext, useContext } from 'react';

/**
 * Action context interface
 * Based on ActionCtxValue from Web implementation
 *
 * This context is used to track whether a component or its parent has actions.
 * It's useful for optimizing rendering and event handling.
 */
export interface ActionContextValue {
    /**
     * Check if the current component or any parent has actions
     * @returns true if actions are present
     */
    hasAction(): boolean;
}

export const ActionContext = createContext<ActionContextValue | null>(null);

/**
 * Hook to access ActionContext
 * Throws an error if used outside of ActionContext.Provider
 */
export function useActionContext(): ActionContextValue {
    const context = useContext(ActionContext);
    if (!context) {
        throw new Error('useActionContext must be used within ActionContext.Provider');
    }
    return context;
}

/**
 * Hook to safely access ActionContext (returns null if not available)
 */
export function useActionContextOptional(): ActionContextValue | null {
    return useContext(ActionContext);
}
