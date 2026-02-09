import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivStateData, State } from '../../types/state';
import { Outer } from '../utilities/Outer';
import { useStateContext } from '../../context/StateContext';
import { useDivKitContext } from '../../context/DivKitContext';
import { wrapError } from '../../utils/wrapError';

export interface DivStateProps {
    componentContext: ComponentContext<DivStateData>;
}

/**
 * DivState component - renders different content based on state
 * MVP implementation with basic features:
 * - State selection by state_id
 * - Default state
 * - State switching via actions (set_state)
 * - State registration in StateContext
 * - State variable binding (state_id_variable)
 *
 * Deferred for post-MVP:
 * - Transition animations (in/out/change)
 * - Animation timing and interpolation
 * - Clip to bounds
 * - Advanced state management
 * - Multiple concurrent state transitions
 *
 * Based on Web State.svelte
 */
export function DivState({ componentContext }: DivStateProps) {
    const { json } = componentContext;
    const { getVariable } = useDivKitContext();
    const { registerState } = useStateContext();

    // Get state ID for registration
    const stateId = json.div_id || json.id;

    // Find default state
    const defaultStateId = useMemo(() => {
        if (json.default_state_id) {
            return json.default_state_id;
        }
        // If no default, use first state
        if (json.states && json.states.length > 0) {
            return json.states[0].state_id;
        }
        return undefined;
    }, [json.default_state_id, json.states]);

    // State management
    const [currentStateId, setCurrentStateId] = useState<string | undefined>(defaultStateId);

    // Handle state_id_variable (two-way binding)
    const stateVariableName = json.state_id_variable;
    const stateVariable = stateVariableName ? getVariable(stateVariableName) : undefined;

    // Sync with state variable
    useEffect(() => {
        if (stateVariable) {
            // Subscribe to variable changes
            const unsubscribe = stateVariable.subscribe((value: unknown) => {
                if (typeof value === 'string' && value !== currentStateId) {
                    setCurrentStateId(value);
                }
            });

            return unsubscribe;
        }
        return undefined;
    }, [stateVariable, currentStateId]);

    // Update variable when state changes
    useEffect(() => {
        if (stateVariable && currentStateId) {
            const currentValue = stateVariable.getValue();
            if (currentValue !== currentStateId) {
                stateVariable.setValue(currentStateId);
            }
        }
    }, [stateVariable, currentStateId]);

    // Register state in context for set_state action
    useEffect(() => {
        if (stateId) {
            const unregister = registerState(stateId, async (newStateId: string) => {
                setCurrentStateId(newStateId);
                return undefined;
            });
            return unregister;
        }
        return undefined;
    }, [stateId, registerState]);

    // Validate states
    useEffect(() => {
        if (!json.states || json.states.length === 0) {
            componentContext.logError(wrapError(new Error('Empty "states" prop for div "state"')));
        }
        if (!stateId) {
            componentContext.logError(wrapError(new Error('Missing "id" prop for div "state"')));
        }
    }, [json.states, stateId, componentContext]);

    // Find current state
    const currentState = useMemo((): State | undefined => {
        if (!json.states) return undefined;
        const found = json.states.find(s => s.state_id === currentStateId);
        if (!found || !found.state_id) return undefined;
        return found as State;
    }, [json.states, currentStateId]);

    // Create child context for current state
    const childContext = useMemo(() => {
        if (!currentState?.div) return undefined;

        return componentContext.produceChildContext(currentState.div, {
            path: currentStateId
        });
    }, [currentState, currentStateId, componentContext]);

    // Render current state
    const renderContent = () => {
        if (!currentState?.div || !childContext) {
            return null;
        }

        // Import DivComponent dynamically to avoid circular dependency
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const DivComponent = require('../DivComponent').DivComponent;

        return <DivComponent componentContext={childContext} />;
    };

    return (
        <Outer componentContext={componentContext}>
            <View>{renderContent()}</View>
        </Outer>
    );
}
