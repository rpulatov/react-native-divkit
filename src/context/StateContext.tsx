import { createContext, useContext } from 'react';

/**
 * State setter function type
 * Takes a state ID and returns a promise that resolves when the state is changed
 */
export type StateSetter = (stateId: string) => Promise<void>;

/**
 * State context interface
 * Based on StateCtxValue from Web implementation, simplified for MVP
 *
 * This context manages state transitions for div-state components.
 * In the MVP version, complex transitions are deferred.
 */
export interface StateContextValue {
    /**
     * Register a state component
     * @param id - Component ID
     * @param setState - Function to change the state
     * @returns Unregister function
     */
    registerState(id: string, setState: StateSetter): () => void;

    /**
     * Switch to a specific state by ID
     * @param stateId - The state ID to switch to
     */
    switchState(stateId: string): Promise<void>;

    /**
     * Get state setter by component ID
     * @param id - Component ID
     * @returns State setter function or undefined
     */
    getStateSetter(id: string): StateSetter | undefined;

    /**
     * Register a child component (for tracking purposes)
     * Simplified for MVP - full transition support deferred
     */
    registerChild(id: string): void;

    /**
     * Unregister a child component
     */
    unregisterChild(id: string): void;

    /**
     * Check if there's a transition change for a component
     * MVP: Always returns false (transitions deferred)
     */
    hasTransitionChange(id?: string): boolean;
}

export const StateContext = createContext<StateContextValue | null>(null);

/**
 * Hook to access StateContext
 * Throws an error if used outside of StateContext.Provider
 */
export function useStateContext(): StateContextValue {
    const context = useContext(StateContext);
    if (!context) {
        throw new Error('useStateContext must be used within StateContext.Provider');
    }
    return context;
}

/**
 * Hook to safely access StateContext (returns null if not available)
 */
export function useStateContextOptional(): StateContextValue | null {
    return useContext(StateContext);
}
