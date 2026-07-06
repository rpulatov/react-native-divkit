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

import React, { useMemo, useCallback, useRef, useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import type { Action, DivJson, DivVariable, Direction, VariableTrigger } from '../typings/common';
import type { DivBaseData } from './types/base';
import type { ComponentContext } from './types/componentContext';
import type { MaybeMissing } from './expressions/json';
import { DivKitContext, type DivKitContextValue, type DivImageLoadTracker, type TypefaceProvider } from './context/DivKitContext';
import type { DivImageAdapter } from './types/imageAdapter';
import { rnImageAdapter } from './adapters/rn-image';
import { ActionContext, type ActionContextValue } from './context/ActionContext';
import { StateContext, type StateContextValue, type StateSetter } from './context/StateContext';
import { PagerProvider } from './context/PagerContext';
import { DivComponent } from './components/DivComponent';
import { createVariable, Variable, type VariableType } from './expressions/variable';
import { GlobalVariablesController } from './expressions/globalVariablesController';
import { applyTemplatesRecursively } from './utils/applyTemplate';
import { wrapError, type WrappedError } from './utils/wrapError';
import { arrayInsert, arrayRemove, arraySet } from './actions/array';
import { dictSetValue } from './actions/dict';
import { copyToClipboard } from './actions/copyToClipboard';
import { updateStructure } from './actions/updateStructure';
import { applySetStateAction, type ActionSetStateCompat } from './actions/setState';
import { evalExpression } from './expressions/eval';
import { parse } from './expressions/expressions';
import { prepareVars } from './expressions/json';
import { getUrlSchema } from './utils/url';

/**
 * Callback for logging statistics
 */
export type StatCallback = (stat: { type: string; action: Action }) => void;

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

    /** Global variables controller for sharing variables across DivKit instances */
    globalVariablesController?: GlobalVariablesController;

    /**
     * Custom font provider for mapping font_family names to platform-specific fonts.
     * Called even when font_family is omitted (in that case receives an empty string).
     * Default: returns empty string (uses system default font)
     *
     * @example
     * ```tsx
     * <DivKit
     *   typefaceProvider={(fontFamily, opts) => {
     *     if (!fontFamily) return 'MyDefaultText-Regular';
     *     if (fontFamily === 'display') return 'MyCustomDisplay-Bold';
     *     return '';
     *   }}
     * />
     * ```
     */
    typefaceProvider?: TypefaceProvider;

    /**
     * Custom image renderer. Shipped presets live under
     * `react-native-divkit/adapters/{rn-image,expo-image,fast-image}`.
     * Defaults to the bundled `rnImageAdapter` (React Native `Image`).
     *
     * @example
     * ```tsx
     * import { expoImageAdapter } from 'react-native-divkit/adapters/expo-image';
     * <DivKit data={json} imageAdapter={expoImageAdapter} />
     * ```
     */
    imageAdapter?: DivImageAdapter;

    /**
     * Tracker of in-flight image loads. Every `DivImage` calls `increment()`
     * when it starts loading and `decrement()` when the load ends (success or
     * error). Lets the host know when all images have finished loading —
     * useful as a readiness signal for screenshot-based UI tests.
     */
    imageLoadTracker?: DivImageLoadTracker;
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
    id = 'root',
    globalVariablesController,
    typefaceProvider = _fontFamily => '',
    imageAdapter = rnImageAdapter,
    imageLoadTracker
}: DivKitProps) {
    const componentIdCounter = useRef(0);
    const componentsMap = useRef<Map<string, ComponentContext>>(new Map());
    const statesMap = useRef<Map<string, StateSetter>>(new Map());

    // Error logging
    const logError = useCallback(
        (error: WrappedError) => {
            if (onError) {
                onError(error);
            } else {
                console.error('[DivKit Error]', error);
            }
        },
        [onError]
    );

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
                resolvedDiv = applyTemplatesRecursively(divData, templatesData, logError);
            } catch (err) {
                logError(
                    wrapError(err as Error, {
                        additional: { phase: 'template_resolution' }
                    })
                );
            }
        }

        return {
            rootDiv: resolvedDiv as DivBaseData | null,
            initialVariables: card.variables || []
        };
    }, [data, logError]);

    // Create or reuse variables controller
    const variablesController = useMemo(
        () => globalVariablesController || new GlobalVariablesController(),
        [globalVariablesController]
    );

    const globalVariables = variablesController.getVariables();

    // Initialize variables: local (from JSON) + global, local has precedence
    const variables = useMemo(() => {
        const localVariables = new Map<string, Variable>();
        // Combined map: local and global variables, with local in precedence
        const map = new Map<string, Variable>();

        // First, add global variables
        for (const [varName, variable] of globalVariables) {
            map.set(varName, variable);
        }

        // Then, add local variables (from card JSON) — they override globals
        initialVariables.forEach((varData: DivVariable) => {
            try {
                // Skip property variables for MVP (complex feature)
                if (varData.type === 'property') {
                    return;
                }

                if (localVariables.has(varData.name)) {
                    logError(
                        wrapError(new Error('Duplicate variable'), {
                            additional: { name: varData.name }
                        })
                    );
                    return;
                }

                const variable = createVariable(varData.name, varData.type as VariableType, varData.value);
                localVariables.set(varData.name, variable);
                map.set(varData.name, variable);
            } catch (err) {
                logError(
                    wrapError(err as Error, {
                        additional: {
                            variable: varData.name,
                            type: varData.type
                        }
                    })
                );
            }
        });

        return map;
    }, [initialVariables, globalVariables, logError]);

    // Subscribe to new global variables added after initialization
    useEffect(() => {
        const store = variablesController.getLastAddedVariableStore();
        const unsubscribe = store.subscribe((newVarName: string) => {
            if (newVarName && !variables.has(newVarName)) {
                const varInstance = globalVariables.get(newVarName);
                if (varInstance) {
                    variables.set(newVarName, varInstance);
                }
            }
        });
        return unsubscribe;
    }, [variablesController, variables, globalVariables]);

    // Generate unique component IDs
    const genId = useCallback((key: string): string => {
        return `${key}_${componentIdCounter.current++}`;
    }, []);

    // Card-level variable_triggers (data.card.variable_triggers).
    // We can't subscribe here yet — execAnyActions is defined below; the actual subscription
    // happens in a useEffect after execAnyActions is in scope.
    const variableTriggers = useMemo<VariableTrigger[] | undefined>(() => {
        const raw = data.card?.variable_triggers;
        return Array.isArray(raw) ? (raw as VariableTrigger[]) : undefined;
    }, [data]);

    // Variable management
    const getVariable = useCallback(
        (name: string): Variable | undefined => {
            return variables.get(name);
        },
        [variables]
    );

    const setVariable = useCallback(
        (name: string, value: unknown): void => {
            const variable = variables.get(name);
            if (!variable) {
                logError(
                    wrapError(new Error('Variable not found'), {
                        additional: { variable: name }
                    })
                );
                return;
            }

            try {
                variable.setValue(value);
            } catch (err) {
                logError(
                    wrapError(err as Error, {
                        additional: {
                            variable: name,
                            value
                        }
                    })
                );
            }
        },
        [variables, logError]
    );

    // Action execution
    const execAnyActions = useCallback(
        async (
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

            // Variable scope for resolving expressions inside actions.
            // Mirrors Web execAnyActions, which calls getJsonWithVars(action) before dispatch:
            // every field (url, typed.value, etc.) is resolved against the action's
            // component context (where local template/node variables live), falling back
            // to the global scope.
            const effectiveVars = componentContext?.variables ?? variables;

            for (const rawAction of actions) {
                if (!rawAction) continue;

                // Pre-resolve @{...} in all string fields of the action so URL handlers,
                // typed handlers, and onCustomAction all see fully-substituted values.
                let action = rawAction;
                try {
                    const prepared = prepareVars(rawAction, logError, undefined, 0);
                    if (prepared.hasExpression) {
                        const applied = prepared.applyVars(effectiveVars, undefined, true);
                        if (applied.result) {
                            action = applied.result as MaybeMissing<Action>;
                        }
                    }
                } catch (err) {
                    logError(
                        wrapError(err as Error, {
                            additional: { phase: 'action_expression_resolve' }
                        })
                    );
                }

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
                                    if (
                                        typeof typedValue === 'object' &&
                                        typedValue !== null &&
                                        'value' in typedValue
                                    ) {
                                        value = typedValue.value;
                                    } else {
                                        value = typedValue;
                                    }

                                    // Evaluate expression if value is a string with @{...}
                                    if (typeof value === 'string' && value.includes('@{')) {
                                        try {
                                            const ast = parse(value, { startRule: 'JsonStringContents' });

                                            const res = evalExpression(variables, undefined, undefined, ast);

                                            if (res.result.type !== 'error') {
                                                value = res.result.value;
                                            }
                                        } catch (err) {
                                            logError(
                                                wrapError(err as Error, {
                                                    additional: {
                                                        phase: 'set_variable_expression',
                                                        expression: value
                                                    }
                                                })
                                            );
                                        }
                                    }

                                    setVariable(typed.variable_name, value);
                                }
                                break;

                            case 'set_state': {
                                await applySetStateAction(typed as ActionSetStateCompat, statesMap.current);
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
                        logError(
                            wrapError(err as Error, {
                                additional: {
                                    action: typed.type
                                }
                            })
                        );
                    }
                }

                // Handle URL actions
                if (action.url) {
                    const actionUrl = action.url;
                    const schema = getUrlSchema(actionUrl);

                    if (schema === 'div-action') {
                        // Internal DivKit action — parse and execute
                        try {
                            const url = actionUrl.replace(/div-action:\/\//, '');
                            const parts = /([^?]+)\?(.+)/.exec(url);
                            if (parts) {
                                const params = new URLSearchParams(parts[2]);

                                switch (parts[1]) {
                                    case 'set_state': {
                                        const stateId = params.get('state_id');
                                        if (stateId) {
                                            await applySetStateAction(
                                                { state_id: stateId } as ActionSetStateCompat,
                                                statesMap.current
                                            );
                                        }
                                        break;
                                    }
                                    case 'set_variable': {
                                        const name = params.get('name');
                                        const value = params.get('value');
                                        if (name && value !== null) {
                                            const variableInstance = variables.get(name);
                                            if (variableInstance) {
                                                try {
                                                    variableInstance.set(value);
                                                } catch (err) {
                                                    logError(
                                                        wrapError(err as Error, {
                                                            additional: { variable: name, value }
                                                        })
                                                    );
                                                }
                                            } else {
                                                logError(
                                                    wrapError(new Error('Cannot find variable'), {
                                                        additional: { name }
                                                    })
                                                );
                                            }
                                        } else {
                                            logError(
                                                wrapError(new Error('Incorrect set_variable_action'), {
                                                    additional: { url }
                                                })
                                            );
                                        }
                                        break;
                                    }
                                    // MVP: other div-action types (timer, scroll, pager) deferred
                                    default:
                                        break;
                                }
                            }
                        } catch (err) {
                            logError(
                                wrapError(err as Error, {
                                    additional: { action: 'div-action', url: actionUrl }
                                })
                            );
                        }
                    } else if (processUrls && onCustomAction && action.log_id) {
                        // Custom action — pass to user callback
                        onCustomAction(action as Action & { url: string });
                    }
                }
            }
        },
        [variables, logError, onStat, onCustomAction, setVariable]
    );

    // Subscribe card-level variable_triggers (по образцу Web Root.svelte processVariableTriggers).
    // on_condition — actions fire only on false→true transition.
    // on_variable  — actions fire every time used variables change while condition is true.
    useEffect(() => {
        if (!variableTriggers || variableTriggers.length === 0) {
            return;
        }

        const cleanups: Array<() => void> = [];

        for (const trigger of variableTriggers) {
            if (typeof trigger.condition !== 'string') {
                logError(wrapError(new Error('variable_trigger has a condition that is not a string'), {
                    additional: { condition: trigger.condition as unknown as string }
                }));
                continue;
            }
            if (!Array.isArray(trigger.actions)) {
                logError(wrapError(new Error('variable_trigger has no actions'), {
                    additional: { condition: trigger.condition }
                }));
                continue;
            }
            const mode = trigger.mode || 'on_condition';
            if (mode !== 'on_variable' && mode !== 'on_condition') {
                logError(wrapError(new Error('variable_trigger has an unsupported mode'), {
                    additional: { mode }
                }));
                continue;
            }

            const prepared = prepareVars(
                { condition: trigger.condition },
                logError,
                undefined,
                0
            );

            if (prepared.vars.length === 0) {
                logError(wrapError(new Error('variable_trigger must have variables in the condition'), {
                    additional: { condition: trigger.condition }
                }));
                continue;
            }

            const evaluate = (): boolean => {
                const { result } = prepared.applyVars(variables, undefined, false);
                const value = (result as { condition?: unknown } | undefined)?.condition;
                if (value === undefined) {
                    return false;
                }
                // Boolean expressions stringify to '0'/'1' via prepareVars.
                if (value === '1' || value === 1 || value === true) return true;
                if (value === '0' || value === 0 || value === false) return false;
                return Boolean(value);
            };

            let prevConditionResult = false;
            let initialized = false;

            const onChange = () => {
                if (!initialized) return;
                const cond = evaluate();
                if (cond && (mode === 'on_variable' || prevConditionResult === false)) {
                    prevConditionResult = cond;
                    execAnyActions(trigger.actions, { processUrls: true });
                } else {
                    prevConditionResult = cond;
                }
            };

            const unsubs: Array<() => void> = [];
            for (const varName of prepared.vars) {
                const variable = variables.get(varName);
                if (!variable) continue;
                unsubs.push(variable.subscribe(onChange));
            }

            // After all immediate subscribe-callbacks have fired (and been ignored),
            // run initial evaluation explicitly — matches Web first-emit behavior.
            initialized = true;
            const initialCond = evaluate();
            if (initialCond) {
                prevConditionResult = initialCond;
                execAnyActions(trigger.actions, { processUrls: true });
            }

            cleanups.push(() => {
                unsubs.forEach(u => u());
            });
        }

        return () => {
            cleanups.forEach(c => c());
        };
    }, [variableTriggers, variables, execAnyActions, logError]);

    // Component registration
    const registerComponent = useCallback((_componentId: string, context: ComponentContext): void => {
        componentsMap.current.set(context.id, context);
    }, []);

    const unregisterComponent = useCallback((_componentId: string): void => {
        // Component cleanup
    }, []);

    // State Context implementation
    const stateContextValue = useMemo<StateContextValue>(
        () => ({
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
        }),
        []
    );

    // Action Context implementation
    const actionContextValue = useMemo<ActionContextValue>(
        () => ({
            hasAction: (): boolean => {
                // MVP: Simplified - always return false
                // Full action tracking deferred
                return false;
            }
        }),
        []
    );

    // DivKit Context implementation
    const divKitContextValue = useMemo<DivKitContextValue>(
        () => ({
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

            typefaceProvider,

            imageAdapter,
            imageLoadTracker,

            variables,
            getVariable,
            setVariable,

            registerComponent,
            unregisterComponent,

            execAnyActions,

            genId
        }),
        [
            onStat,
            onCustomAction,
            direction,
            platform,
            typefaceProvider,
            imageAdapter,
            imageLoadTracker,
            variables,
            getVariable,
            setVariable,
            registerComponent,
            unregisterComponent,
            execAnyActions,
            genId
        ]
    );

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

            // NB: declared as a regular method so that `this` refers to whichever context
            // the consumer calls `.produceChildContext(...)` on. The same function value
            // is shared via `{...context}` in the spread below, so children also use their
            // own `this.variables` — which is what propagates local-scope variables down.
            produceChildContext(this: ComponentContext, div: MaybeMissing<DivBaseData>, opts?: any): ComponentContext {
                const childPath = opts?.path !== undefined ? [...this.path, String(opts.path)] : this.path;

                const childContext: ComponentContext = {
                    ...this,
                    path: childPath,
                    parent: this,
                    json: div,
                    origJson: opts?.origJson || div,
                    id: opts?.id || genId('component'),
                    // Fall back to parent scope (which may include local variables added by
                    // useLocalVariables), not the root closure.
                    variables: opts?.variables || this.variables || variables,
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
                    update() {
                        /* noop */
                    },
                    destroy() {
                        /* noop */
                    }
                };
            },

            listenPager: (): (() => void) => {
                // MVP: Pagers deferred
                return () => {
                    /* noop */
                };
            },

            destroy: (): void => {
                // Cleanup if needed
            }
        };

        return context;
    }, [rootDiv, variables, logError, execAnyActions, genId, id, stateContextValue]);

    // Render
    if (!rootDiv || !rootComponentContext) {
        return <View style={style}>{/* Empty state - could render error UI here */}</View>;
    }

    return (
        <DivKitContext.Provider value={divKitContextValue}>
            <ActionContext.Provider value={actionContextValue}>
                <StateContext.Provider value={stateContextValue}>
                    <PagerProvider>
                        <View style={style}>
                            <DivComponent componentContext={rootComponentContext} />
                        </View>
                    </PagerProvider>
                </StateContext.Provider>
            </ActionContext.Provider>
        </DivKitContext.Provider>
    );
}
