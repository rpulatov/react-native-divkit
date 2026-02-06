/**
 * DivKit - Main entry point component for React Native
 *
 * Based on Root.svelte from Web implementation
 * Provides context setup, variable management, and component rendering
 *
 * MVP Scope:
 * - 4 basic components (Text, Container, Image, State)
 * - Variable system with reactive updates
 * - Action execution
 * - Template resolution
 *
 * Deferred for post-MVP:
 * - Timers
 * - Variable triggers
 * - Complex animations
 * - Custom components
 * - Extensions
 */

import React, { useMemo, useCallback, useRef } from 'react';
import { View, StyleSheet, type ViewStyle } from 'react-native';
import type { Action, DivJson, DivVariable, Direction } from '../typings/common';
import type { DivBaseData } from './types/base';
import type { ComponentContext } from './types/componentContext';
import type { MaybeMissing } from './expressions/json';
import { DivKitContext, type DivKitContextValue } from './context/DivKitContext';
import { ActionContext, type ActionContextValue } from './context/ActionContext';
import { StateContext, type StateContextValue, type StateSetter } from './context/StateContext';
import { DivComponent } from './components/DivComponent';
import { createVariable, Variable, type VariableType } from './expressions/variable';
import { applyTemplate, applyTemplatesRecursively } from './utils/applyTemplate';
import { wrapError, type WrappedError } from './utils/wrapError';
import { arrayInsert, arrayRemove, arraySet } from './actions/array';
import { dictSetValue } from './actions/dict';
import { copyToClipboard } from './actions/copyToClipboard';
import { updateStructure } from './actions/updateStructure';
import { evalExpression } from './expressions/eval';

/**
 * Callback for logging statistics
 */
export type StatCallback = (stat: {
    type: string;
    action: Action;
}) => void;

/**
 * Callback for custom actions (actions with URLs)
 */
export type CustomActionCallback = (action: Action & { url: string }) => void;

/**
 * Callback for errors
 */
export type ErrorCallback = (error: WrappedError) => void;

/**
 * Props for DivKit component
 */
export interface DivKitProps {
    /** DivKit JSON data */
    data: Partial<DivJson>;

    /** Callback for statistics/logging */
    onStat?: StatCallback;

    /** Callback for custom actions */
    onCustomAction?: CustomActionCallback;

    /** Callback for errors */
    onError?: ErrorCallback;

    /** Text direction (default: 'ltr') */
    direction?: Direction;

    /** Platform type (default: 'touch' for mobile) */
    platform?: 'desktop' | 'touch';

    /** Custom style for the root container */
    style?: ViewStyle;

    /** Component ID (for debugging) */
    id?: string;
}

/**
 * DivKit - Main component
 *
 * Renders DivKit JSON as React Native components
 */
export function DivKit({
    data,
    onStat,
    onCustomAction,
    onError,
    direction = 'ltr',
    platform = 'touch',
    style,
    id = 'root'
}: DivKitProps) {
    const componentIdCounter = useRef(0);
    const componentsMap = useRef<Map<string, ComponentContext>>(new Map());
    const statesMap = useRef<Map<string, StateSetter>>(new Map());

    // Error logging
    const logError = useCallback((error: WrappedError) => {
        if (onError) {
            onError(error);
        } else {
            console.error('[DivKit Error]', error);
        }
    }, [onError]);

    // Parse JSON and apply templates
    const { rootDiv, initialVariables } = useMemo(() => {
        const card = data.card;
        if (!card || !card.states || card.states.length === 0) {
            logError(wrapError(new Error('Invalid DivKit JSON: missing card or states')));
            return {
                rootDiv: null,
                initialVariables: []
            };
        }

        const state = card.states[0];
        const divData = state.div;
        const templatesData = data.templates || {};

        // Apply template if needed
        let resolvedDiv = divData;
        if (divData && typeof divData === 'object' && 'type' in divData) {
            try {
                // Use recursive template application to handle nested templates
                resolvedDiv = applyTemplatesRecursively(
                    divData,
                    templatesData,
                    logError
                );
            } catch (err) {
                logError(wrapError(err as Error, {
                    additional: { phase: 'template_resolution' }
                }));
            }
        }

        return {
            rootDiv: resolvedDiv as DivBaseData | null,
            initialVariables: card.variables || []
        };
    }, [data, logError]);

    // Initialize variables
    const variables = useMemo(() => {
        const map = new Map<string, Variable>();

        initialVariables.forEach((varData: DivVariable) => {
            try {
                // Skip property variables for MVP (complex feature)
                if (varData.type === 'property') {
                    return;
                }

                const variable = createVariable(
                    varData.name,
                    varData.type as VariableType,
                    varData.value
                );
                map.set(varData.name, variable);
            } catch (err) {
                logError(wrapError(err as Error, {
                    additional: {
                        variable: varData.name,
                        type: varData.type
                    }
                }));
            }
        });

        return map;
    }, [initialVariables, logError]);

    // Generate unique component IDs
    const genId = useCallback((key: string): string => {
        return `${key}_${componentIdCounter.current++}`;
    }, []);

    // Variable management
    const getVariable = useCallback((name: string): Variable | undefined => {
        return variables.get(name);
    }, [variables]);

    const setVariable = useCallback((name: string, value: unknown): void => {
        const variable = variables.get(name);
        if (!variable) {
            logError(wrapError(new Error('Variable not found'), {
                additional: { variable: name }
            }));
            return;
        }

        try {
            variable.setValue(value);
        } catch (err) {
            logError(wrapError(err as Error, {
                additional: {
                    variable: name,
                    value
                }
            }));
        }
    }, [variables, logError]);

    // Action execution
    const execAnyActions = useCallback(async (
        actions: MaybeMissing<Action[]> | undefined,
        opts?: {
            componentContext?: ComponentContext;
            processUrls?: boolean;
        }
    ): Promise<void> => {
        if (!actions || !Array.isArray(actions)) {
            return;
        }

        const processUrls = opts?.processUrls ?? true;
        const componentContext = opts?.componentContext;

        for (const action of actions) {
            if (!action) continue;

            // Log statistics
            if (action.log_id && onStat) {
                onStat({
                    type: 'action',
                    action: action as Action
                });
            }

            // Handle typed actions
            if (action.typed) {
                const typed = action.typed;

                try {
                    switch (typed.type) {
                        case 'set_variable':
                            if (typed.variable_name && typed.value) {
                                const typedValue = typed.value;
                                let value: unknown;

                                // Convert typed value to raw value
                                if (typeof typedValue === 'object' && typedValue !== null && 'value' in typedValue) {
                                    value = typedValue.value;
                                } else {
                                    value = typedValue;
                                }

                                setVariable(typed.variable_name, value);
                            }
                            break;

                        case 'set_state': {
                            const setStateAction = typed as any;
                            if (setStateAction.state_id && setStateAction.temporary_state_id) {
                                const setter = statesMap.current.get(setStateAction.state_id);
                                if (setter) {
                                    await setter(String(setStateAction.temporary_state_id));
                                }
                            }
                            break;
                        }

                        case 'array_insert_value':
                            arrayInsert(componentContext, variables, logError, typed as any);
                            break;

                        case 'array_remove_value':
                            arrayRemove(componentContext, variables, logError, typed as any);
                            break;

                        case 'array_set_value':
                            arraySet(componentContext, variables, logError, typed as any);
                            break;

                        case 'dict_set_value':
                            dictSetValue(componentContext, variables, logError, typed as any);
                            break;

                        case 'update_structure':
                            updateStructure(componentContext, variables, logError, typed as any);
                            break;

                        case 'copy_to_clipboard':
                            copyToClipboard(logError, typed as any);
                            break;

                        // MVP: Other action types deferred (timer, animator, etc.)
                        default:
                            break;
                    }
                } catch (err) {
                    logError(wrapError(err as Error, {
                        additional: {
                            action: typed.type
                        }
                    }));
                }
            }

            // Handle URL actions
            if (processUrls && action.url && onCustomAction) {
                onCustomAction(action as Action & { url: string });
            }
        }
    }, [variables, logError, onStat, onCustomAction, setVariable]);

    // Component registration
    const registerComponent = useCallback((_componentId: string, context: ComponentContext): void => {
        componentsMap.current.set(context.id, context);
    }, []);

    const unregisterComponent = useCallback((_componentId: string): void => {
        // Component cleanup
    }, []);

    // State Context implementation
    const stateContextValue = useMemo<StateContextValue>(() => ({
        registerState: (componentId: string, setState: StateSetter): (() => void) => {
            statesMap.current.set(componentId, setState);
            return () => {
                statesMap.current.delete(componentId);
            };
        },

        switchState: async (stateId: string): Promise<void> => {
            const setter = statesMap.current.get(stateId);
            if (setter) {
                await setter(stateId);
            }
        },

        getStateSetter: (componentId: string): StateSetter | undefined => {
            return statesMap.current.get(componentId);
        },

        registerChild: (_componentId: string): void => {
            // MVP: Simplified implementation
            // Full transition tracking deferred
        },

        unregisterChild: (_componentId: string): void => {
            // MVP: Simplified implementation
        },

        hasTransitionChange: (): boolean => {
            // MVP: Always false (transitions deferred)
            return false;
        }
    }), []);

    // Action Context implementation
    const actionContextValue = useMemo<ActionContextValue>(() => ({
        hasAction: (): boolean => {
            // MVP: Simplified - always return false
            // Full action tracking deferred
            return false;
        }
    }), []);

    // DivKit Context implementation
    const divKitContextValue = useMemo<DivKitContextValue>(() => ({
        logStat: (type: string, action: MaybeMissing<Action>) => {
            if (onStat && action && action.log_id) {
                onStat({ type, action: action as Action });
            }
        },

        execCustomAction: (action: Action & { url: string }) => {
            if (onCustomAction) {
                onCustomAction(action);
            }
        },

        direction,
        platform,

        variables,
        getVariable,
        setVariable,

        registerComponent,
        unregisterComponent,

        execAnyActions,

        genId
    }), [
        onStat,
        onCustomAction,
        direction,
        platform,
        variables,
        getVariable,
        setVariable,
        registerComponent,
        unregisterComponent,
        execAnyActions,
        genId
    ]);

    // Create root component context
    const rootComponentContext = useMemo<ComponentContext<DivBaseData> | null>(() => {
        if (!rootDiv) {
            return null;
        }

        const context: ComponentContext<DivBaseData> = {
            path: [],
            json: rootDiv as MaybeMissing<DivBaseData>,
            origJson: rootDiv as MaybeMissing<DivBaseData>,
            templateContext: {},
            variables,
            id: genId(id),

            logError,

            execAnyActions,

            // MVP: Simplified implementations
            getDerivedFromVars: <T,>(jsonProp: T): any => {
                // This is a placeholder for Svelte's readable store
                // In React Native, we use hooks instead (useDerivedFromVars)
                return jsonProp;
            },

            getJsonWithVars: <T,>(jsonProp: T): MaybeMissing<T> => {
                // Simplified implementation for MVP
                return jsonProp as MaybeMissing<T>;
            },

            evalExpression: (store: any, expr: any, opts?: any) => {
                const allVars = variables;
                return evalExpression(allVars, undefined, store, expr, opts);
            },

            produceChildContext: (
                div: MaybeMissing<DivBaseData>,
                opts?: any
            ): ComponentContext => {
                const childPath = opts?.path !== undefined
                    ? [...context.path, String(opts.path)]
                    : context.path;

                const childContext: ComponentContext = {
                    ...context,
                    path: childPath,
                    parent: context,
                    json: div,
                    origJson: opts?.origJson || div,
                    id: opts?.id || genId('component'),
                    variables: opts?.variables || variables,
                    isRootState: opts?.isRootState,
                    isTooltipRoot: opts?.isTooltipRoot,
                    key: opts?.key
                };

                return childContext;
            },

            dup: (fakeReason: number): ComponentContext => {
                return {
                    ...context,
                    fakeElement: fakeReason
                };
            },

            getVariable: (varName: string): Variable | undefined => {
                return variables.get(varName);
            },

            getAnimator: (): undefined => {
                // MVP: Animators deferred
                return undefined;
            },

            registerState: (stateId: string, setState: any): (() => void) => {
                // Convert ComponentContext StateSetter to StateContext StateSetter
                const wrappedSetState = async (id: string) => {
                    await setState(id);
                    return undefined;
                };
                return stateContextValue.registerState(stateId, wrappedSetState);
            },

            registerPager: (): any => {
                // MVP: Pagers deferred
                return {
                    update: () => {},
                    destroy: () => {}
                };
            },

            listenPager: (): (() => void) => {
                // MVP: Pagers deferred
                return () => {};
            },

            destroy: (): void => {
                // Cleanup if needed
            }
        };

        return context;
    }, [rootDiv, variables, logError, execAnyActions, genId, id, stateContextValue]);

    // Render
    if (!rootDiv || !rootComponentContext) {
        return (
            <View style={[styles.container, style]}>
                {/* Empty state - could render error UI here */}
            </View>
        );
    }

    return (
        <DivKitContext.Provider value={divKitContextValue}>
            <ActionContext.Provider value={actionContextValue}>
                <StateContext.Provider value={stateContextValue}>
                    <View style={[styles.container, style]}>
                        <DivComponent componentContext={rootComponentContext} />
                    </View>
                </StateContext.Provider>
            </ActionContext.Provider>
        </DivKitContext.Provider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1
    }
});
