import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Animated, Easing, View, ViewStyle, LayoutChangeEvent } from 'react-native';
import type { DivBase } from '../../../typings/common';
import type { ComponentContext } from '../../types/componentContext';
import type { DivStateData, State } from '../../types/state';
import type { TransitionChange } from '../../types/base';
import type { MaybeMissing } from '../../expressions/json';
import { Outer } from '../utilities/Outer';
import { useParentOf } from '../../hooks/useParentOf';
import { useStateContext } from '../../context/StateContext';
import { useDivKitContext } from '../../context/DivKitContext';
import { DivStateScopeContext, type DivStateScopeValue } from '../../context/DivStateScopeContext';
import { LayoutParamsContext } from '../../context/LayoutParamsContext';
import { wrapError } from '../../utils/wrapError';
import { flattenChangeTransition } from '../../utils/flattenTransition';

export interface DivStateProps {
    componentContext: ComponentContext<DivStateData>;
}

interface StagedStateChange {
    targetStateId: string | undefined;
    div: any;
}

interface BoundsFrame {
    left: number;
    top: number;
    width: number;
    height: number;
}

/**
 * DivState component - renders different content based on state
 *
 * Supports:
 * - State selection by state_id
 * - Default state
 * - State switching via actions (set_state) and via state_id_variable two-way binding
 * - transition_change on the state container (smooth layout transitions for neighbours via
 *   configureChangeBoundsLayout)
 * - Per-element transition_out for children declaring it in the OUTGOING state JSON
 *   (children register a playOut via DivStateScopeContext; DivState awaits them in parallel
 *   before mounting the new state). Transition_in for the INCOMING children plays automatically
 *   on mount via Outer's mode='auto-in'.
 *
 * Based on Web State.svelte (simplified — no per-element bbox tracking for transition_change
 * within state subtree).
 */
export function DivState({ componentContext }: DivStateProps) {
    const { json } = componentContext;
    const { getVariable } = useDivKitContext();
    const { registerState } = useStateContext();

    const stateId = json.div_id || json.id;

    // applyPatch support: patched state divs override json.states until the document
    // itself is replaced. Mirrors Web State.svelte (parentOfSimpleMode: each states[].div
    // with an id is an optional-item slot, a change must carry exactly one item).
    const [statesOverride, setStatesOverride] = useState<typeof json.states | null>(null);
    const prevJsonRef = useRef(json);
    if (prevJsonRef.current !== json) {
        prevJsonRef.current = json;
        if (statesOverride !== null) {
            setStatesOverride(null);
        }
    }

    const states = statesOverride ?? json.states;

    const parentOfItems = useMemo(
        () => (Array.isArray(states) ? states : []).map(it => ({
            json: it.div,
            id: (it.div as { id?: string } | undefined)?.id
        })),
        [states]
    );

    const replaceItems = useCallback((newDivs: (DivBase | undefined)[]) => {
        // state_id metadata never changes under patches (single mode replaces divs
        // 1:1 in place), so the original json.states is a safe base even when several
        // patch changes land before a re-render — newDivs is always the full list.
        const base = Array.isArray(json.states) ? json.states : [];
        setStatesOverride(base.map((it, index) => ({
            ...it,
            div: newDivs[index] as typeof it.div
        })));
    }, [json.states]);

    useParentOf(parentOfItems, replaceItems, true);

    const defaultStateId = useMemo(() => {
        if (json.default_state_id) {
            return json.default_state_id;
        }
        if (states && states.length > 0) {
            return states[0].state_id;
        }
        return undefined;
    }, [json.default_state_id, states]);

    const [currentStateId, setCurrentStateId] = useState<string | undefined>(defaultStateId);
    const [stagedStateChange, setStagedStateChange] = useState<StagedStateChange | null>(null);
    const [contentSize, setContentSize] = useState<{ width: number; height: number } | null>(null);
    // True while we're awaiting transition_out of the previous state — we keep rendering the
    // outgoing children during this window so their out-animations remain visible.
    const [pendingStateId, setPendingStateId] = useState<string | undefined>(undefined);

    // Registry of transition_out players from children inside this state's scope.
    // The set is REPLACED each time the state swaps (because children unmount), so we don't need
    // explicit clearing — old entries are pruned naturally by Outer's cleanup effect.
    const outPlayersRef = useRef<Set<() => Promise<void>>>(new Set());
    const scopeValue: DivStateScopeValue = useMemo(() => ({
        registerTransitionOutPlayer(play: () => Promise<void>) {
            outPlayersRef.current.add(play);
            return () => {
                outPlayersRef.current.delete(play);
            };
        }
    }), []);

    const transitionChange = (json as DivStateData).transition_change as MaybeMissing<TransitionChange> | undefined;
    const stageTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const animatedFrame = useRef({
        left: new Animated.Value(0),
        top: new Animated.Value(0),
        width: new Animated.Value(0),
        height: new Animated.Value(0),
    }).current;

    const applyStateChange = useCallback(async (newStateId: string | undefined) => {
        if (newStateId === currentStateId || newStateId === pendingStateId) return;

        const outPlayers = Array.from(outPlayersRef.current);
        if (outPlayers.length > 0) {
            setPendingStateId(newStateId);
            try {
                await Promise.all(outPlayers.map(p => p()));
            } catch (err) {
                componentContext.logError(wrapError(err as Error, {
                    additional: { phase: 'state_transition_out' }
                }));
            }
        }

        const nextState = states?.find(state => state.state_id === newStateId);
        const previousState = states?.find(state => state.state_id === currentStateId);
        const nextTransitionChange = (nextState?.div as any)?.transition_change as MaybeMissing<TransitionChange> | undefined;
        const currentTransitionChange = (previousState?.div as any)?.transition_change as MaybeMissing<TransitionChange> | undefined;
        const effectiveTransitionChange = nextTransitionChange || currentTransitionChange || transitionChange;
        const duration = getChangeBoundsDuration(effectiveTransitionChange);

        if (previousState?.div && nextState?.div && contentSize && duration > 0) {
            const fromFrame = getChildFrame(previousState.div as any, contentSize);
            const toFrame = getChildFrame(nextState.div as any, contentSize);

            animatedFrame.left.setValue(fromFrame.left);
            animatedFrame.top.setValue(fromFrame.top);
            animatedFrame.width.setValue(fromFrame.width);
            animatedFrame.height.setValue(fromFrame.height);
            setPendingStateId(newStateId);
            setStagedStateChange({
                targetStateId: newStateId,
                div: createOverlayDiv(previousState.div)
            });

            await new Promise<void>(resolve => {
                if (stageTimerRef.current) {
                    clearTimeout(stageTimerRef.current);
                }

                Animated.parallel([
                    Animated.timing(animatedFrame.left, {
                        toValue: toFrame.left,
                        duration,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(animatedFrame.top, {
                        toValue: toFrame.top,
                        duration,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(animatedFrame.width, {
                        toValue: toFrame.width,
                        duration,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                    Animated.timing(animatedFrame.height, {
                        toValue: toFrame.height,
                        duration,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: false,
                    }),
                ]).start(() => {
                    resolve();
                });
            });
        }

        setCurrentStateId(newStateId);
        setStagedStateChange(null);
        setPendingStateId(undefined);
    }, [currentStateId, pendingStateId, states, transitionChange, contentSize, animatedFrame, componentContext]);

    // Handle state_id_variable (two-way binding)
    const stateVariableName = json.state_id_variable;
    const stateVariable = stateVariableName ? getVariable(stateVariableName) : undefined;

    useEffect(() => {
        if (stateVariable) {
            const unsubscribe = stateVariable.subscribe((value: unknown) => {
                if (typeof value === 'string' && value !== currentStateId) {
                    void applyStateChange(value);
                }
            });
            return unsubscribe;
        }
        return undefined;
    }, [stateVariable, currentStateId, applyStateChange]);

    useEffect(() => {
        if (stateVariable && currentStateId) {
            const currentValue = stateVariable.getValue();
            if (currentValue !== currentStateId) {
                stateVariable.setValue(currentStateId);
            }
        }
    }, [stateVariable, currentStateId]);

    useEffect(() => {
        if (stateId) {
            const unregister = registerState(stateId, async (newStateId: string) => {
                await applyStateChange(newStateId);
                return undefined;
            });
            return unregister;
        }
        return undefined;
    }, [stateId, registerState, applyStateChange]);

    useEffect(() => {
        if (!states || states.length === 0) {
            componentContext.logError(wrapError(new Error('Empty "states" prop for div "state"')));
        }
        if (!stateId) {
            componentContext.logError(wrapError(new Error('Missing "id" prop for div "state"')));
        }
    }, [states, stateId, componentContext]);

    useEffect(() => {
        return () => {
            if (stageTimerRef.current) {
                clearTimeout(stageTimerRef.current);
                stageTimerRef.current = null;
            }
        };
    }, []);

    const currentState = useMemo((): State | undefined => {
        if (!states) return undefined;
        const found = states.find(s => s.state_id === currentStateId);
        if (!found || !found.state_id) return undefined;
        return found as State;
    }, [states, currentStateId]);

    const renderedDiv = currentState?.div;

    const childContext = useMemo(() => {
        if (!renderedDiv) return undefined;
        return componentContext.produceChildContext(renderedDiv, {
            path: currentStateId
        });
    }, [renderedDiv, currentStateId, componentContext]);

    const contentStyle = useMemo((): ViewStyle => {
        const child = renderedDiv as any;
        const style: ViewStyle = {
            width: '100%',
            alignItems: mapAlignmentToFlex(child?.alignment_horizontal),
            justifyContent: mapAlignmentToFlex(child?.alignment_vertical),
        };

        const heightType = (json.height as any)?.type;
        if (heightType === 'fixed' || heightType === 'match_parent') {
            style.flex = 1;
        }

        return style;
    }, [renderedDiv, json.height]);

    const renderContent = () => {
        if (!renderedDiv || !childContext) {
            return null;
        }
        // Import DivComponent dynamically to avoid circular dependency
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const DivComponent = require('../DivComponent').DivComponent;
        return <DivComponent componentContext={childContext} />;
    };

    const overlayContext = useMemo(() => {
        if (!stagedStateChange?.div) return undefined;
        return componentContext.produceChildContext(stagedStateChange.div, {
            path: currentStateId
        });
    }, [stagedStateChange, currentStateId, componentContext]);

    const renderOverlay = () => {
        if (!stagedStateChange?.div || !overlayContext) {
            return null;
        }
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const DivComponent = require('../DivComponent').DivComponent;
        return (
            <Animated.View
                pointerEvents="none"
                style={{
                    position: 'absolute',
                    left: animatedFrame.left,
                    top: animatedFrame.top,
                    width: animatedFrame.width,
                    height: animatedFrame.height,
                    overflow: 'hidden',
                }}
            >
                <LayoutParamsContext.Provider value={{ parentContainerOrientation: 'vertical' }}>
                    <DivComponent componentContext={overlayContext} />
                </LayoutParamsContext.Provider>
            </Animated.View>
        );
    };

    const handleContentLayout = useCallback((event: LayoutChangeEvent) => {
        const { width, height } = event.nativeEvent.layout;
        setContentSize(prev => {
            if (prev && prev.width === width && prev.height === height) return prev;
            return { width, height };
        });
    }, []);

    return (
        <Outer componentContext={componentContext}>
            <DivStateScopeContext.Provider value={scopeValue}>
                <View style={[contentStyle, { position: 'relative' }]} onLayout={handleContentLayout}>
                    {stagedStateChange ? (
                        <View style={{ opacity: 0 }}>
                            <LayoutParamsContext.Provider value={{ parentContainerOrientation: 'vertical' }}>
                                {renderContent()}
                            </LayoutParamsContext.Provider>
                        </View>
                    ) : (
                        <LayoutParamsContext.Provider value={{ parentContainerOrientation: 'vertical' }}>
                            {renderContent()}
                        </LayoutParamsContext.Provider>
                    )}
                    {renderOverlay()}
                </View>
            </DivStateScopeContext.Provider>
        </Outer>
    );
}

type FlexAlignment = 'flex-start' | 'center' | 'flex-end';

function mapAlignmentToFlex(alignment: string | undefined): FlexAlignment {
    switch (alignment) {
        case 'center':
            return 'center';
        case 'right':
        case 'bottom':
        case 'end':
            return 'flex-end';
        case 'left':
        case 'top':
        case 'start':
        default:
            return 'flex-start';
    }
}

function getChangeBoundsDuration(transition: MaybeMissing<TransitionChange> | undefined): number {
    if (!transition) return 0;
    return flattenChangeTransition(transition).reduce((max, item) => {
        const duration = Math.max(0, (item as any).duration ?? 300);
        const delay = Math.max(0, (item as any).start_delay ?? 0);
        return Math.max(max, duration + delay);
    }, 0);
}

function createOverlayDiv(previousDiv: any): any {
    return {
        ...previousDiv,
        alignment_horizontal: 'left',
        alignment_vertical: 'top',
        width: { type: 'match_parent' },
        height: { type: 'match_parent' },
        margins: undefined,
        transition_change: undefined,
    };
}

function getChildFrame(div: any, container: { width: number; height: number }): BoundsFrame {
    const margins = div?.margins || {};
    const leftMargin = numberOrZero(margins.left ?? margins.start);
    const rightMargin = numberOrZero(margins.right ?? margins.end);
    const topMargin = numberOrZero(margins.top);
    const bottomMargin = numberOrZero(margins.bottom);
    const availableWidth = Math.max(0, container.width - leftMargin - rightMargin);
    const availableHeight = Math.max(0, container.height - topMargin - bottomMargin);
    const width = resolveSize(div?.width, availableWidth);
    const height = resolveSize(div?.height, availableHeight);

    return {
        left: resolvePosition(div?.alignment_horizontal, leftMargin, availableWidth, width),
        top: resolvePosition(div?.alignment_vertical, topMargin, availableHeight, height),
        width,
        height,
    };
}

function resolveSize(size: any, available: number): number {
    if (size?.type === 'fixed') return Math.max(0, numberOrZero(size.value));
    return available;
}

function resolvePosition(alignment: string | undefined, start: number, available: number, size: number): number {
    switch (alignment) {
        case 'center':
            return start + (available - size) / 2;
        case 'right':
        case 'bottom':
        case 'end':
            return start + available - size;
        case 'left':
        case 'top':
        case 'start':
        default:
            return start;
    }
}

function numberOrZero(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}
