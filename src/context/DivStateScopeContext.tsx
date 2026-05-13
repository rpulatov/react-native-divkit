import { createContext, useContext } from 'react';

/**
 * Scoped context provided by a single DivState wrapping its currently-rendered children.
 *
 * Allows children that declare `transition_out` (via Outer + useAppearanceTransition) to
 * register a playOut callback so that DivState can await all of them in parallel
 * before swapping to a new state. Analogous to Web's stateCtx.registerChildWithTransitionOut.
 */
export interface DivStateScopeValue {
    /**
     * Register a child's transition_out player.
     * Returns an unregister callback (call from cleanup).
     */
    registerTransitionOutPlayer(play: () => Promise<void>): () => void;
}

export const DivStateScopeContext = createContext<DivStateScopeValue | null>(null);

/** Get the nearest DivState scope, or null if outside any DivState. */
export function useDivStateScopeOptional(): DivStateScopeValue | null {
    return useContext(DivStateScopeContext);
}
