/**
 * React hooks for executing DivKit actions
 * Handles click actions, visibility actions, and other user interactions
 */

import { useCallback } from 'react';
import type { Action } from '../../typings/common';
import type { MaybeMissing } from '../expressions/json';
import { useDivKitContext } from '../context/DivKitContext';
import type { ComponentContext } from '../types/componentContext';

export interface UseActionOptions {
    /**
     * Component context (for action execution context)
     */
    componentContext?: ComponentContext;

    /**
     * Whether to process URLs (open external links)
     * Default: true
     */
    processUrls?: boolean;
}

/**
 * Hook to execute a single action
 *
 * @param options Action execution options
 * @returns Function to execute an action
 *
 * @example
 * ```tsx
 * function MyButton({ action }: { action: Action }) {
 *   const execAction = useAction();
 *
 *   return (
 *     <Pressable onPress={() => execAction(action)}>
 *       <Text>Click me</Text>
 *     </Pressable>
 *   );
 * }
 * ```
 */
export function useAction(options?: UseActionOptions) {
    const { execAnyActions } = useDivKitContext();

    return useCallback(
        async (action: MaybeMissing<Action> | undefined) => {
            if (!action) {
                return;
            }

            await execAnyActions([action], options);
        },
        [execAnyActions, options]
    );
}

/**
 * Hook to execute multiple actions
 *
 * @param options Action execution options
 * @returns Function to execute an array of actions
 *
 * @example
 * ```tsx
 * function MyButton({ actions }: { actions: Action[] }) {
 *   const execActions = useActions();
 *
 *   return (
 *     <Pressable onPress={() => execActions(actions)}>
 *       <Text>Click me</Text>
 *     </Pressable>
 *   );
 * }
 * ```
 */
export function useActions(options?: UseActionOptions) {
    const { execAnyActions } = useDivKitContext();

    return useCallback(
        async (actions: MaybeMissing<Action[]> | undefined) => {
            if (!actions || actions.length === 0) {
                return;
            }

            await execAnyActions(actions, options);
        },
        [execAnyActions, options]
    );
}

/**
 * Hook to create an onPress handler from actions
 * Convenience hook for Pressable/TouchableOpacity components
 *
 * @param actions Actions to execute on press
 * @param options Action execution options
 * @returns onPress handler function, or undefined if no actions
 *
 * @example
 * ```tsx
 * function DivText({ json }: { json: DivTextJson }) {
 *   const onPress = useActionHandler(json.actions);
 *
 *   return (
 *     <Pressable onPress={onPress}>
 *       <Text>{json.text}</Text>
 *     </Pressable>
 *   );
 * }
 * ```
 */
export function useActionHandler(
    actions: MaybeMissing<Action[]> | undefined,
    options?: UseActionOptions
): (() => Promise<void>) | undefined {
    const execActions = useActions(options);

    return useCallback(() => {
        if (!actions || actions.length === 0) {
            return Promise.resolve();
        }
        return execActions(actions);
    }, [actions, execActions]);
}

/**
 * Hook to check if actions array is not empty
 * Useful for conditional rendering or styling
 *
 * @param actions Actions to check
 * @returns true if actions exist and are not empty
 *
 * @example
 * ```tsx
 * function DivText({ json }: { json: DivTextJson }) {
 *   const hasActions = useHasActions(json.actions);
 *
 *   return (
 *     <Text style={{ cursor: hasActions ? 'pointer' : 'default' }}>
 *       {json.text}
 *     </Text>
 *   );
 * }
 * ```
 */
export function useHasActions(
    actions: MaybeMissing<Action[]> | undefined
): boolean {
    return Boolean(actions && actions.length > 0);
}
