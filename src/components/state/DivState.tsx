import React, { useState, useEffect, useMemo } from 'react';
import { View } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivStateData, State } from '../../types/state';
import { Outer } from '../utilities/Outer';
import { useStateContext } from '../../context/StateContext';
import { useDivKitContext } from '../../context/DivKitContext';

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
    const { json, variables } = componentContext;
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
            const unsubscribe = stateVariable.subscribe((value) => {
                if (typeof value === 'string' && value !== currentStateId) {
                    setCurrentStateId(value);
                }
            });

            return unsubscribe;
        }
    }, [stateVariable, currentStateId]);

    // Update variable when state changes
    useEffect(() => {
        if (stateVariable && currentStateId) {
            const currentValue = stateVariable.get();
            if (currentValue !== currentStateId) {
                stateVariable.set(currentStateId);
            }
        }
    }, [stateVariable, currentStateId]);

    // Register state in context for set_state action
    useEffect(() => {
        if (stateId) {
            const unregister = registerState(stateId, async (newStateId: string) => {
                setCurrentStateId(newStateId);
            });
            return unregister;
        }
    }, [stateId, registerState]);

    // Validate states
    useEffect(() => {
        if (!json.states || json.states.length === 0) {
            componentContext.logError(new Error('Empty "states" prop for div "state"'));
        }
        if (!stateId) {
            componentContext.logError(new Error('Missing "id" prop for div "state"'));
        }
    }, [json.states, stateId, componentContext]);

    // Find current state
    const currentState = useMemo((): State | undefined => {
        if (!json.states) return undefined;
        return json.states.find(s => s.state_id === currentStateId);
    }, [json.states, currentStateId]);

    // Create child context for current state
    const childContext = useMemo(() => {
        if (!currentState?.div) return undefined;

        // Produce child context
        // In the real implementation, this should use componentContext.produceChildContext
        // For now, we'll create a basic context structure
        return {
            json: currentState.div,
            variables: variables || new Map(),
            // TODO: Proper child context creation
        } as ComponentContext;
    }, [currentState, variables]);

    // Render current state
    const renderContent = () => {
        if (!currentState?.div || !childContext) {
            return null;
        }

        // Import DivComponent dynamically to avoid circular dependency
        const DivComponent = require('../DivComponent').DivComponent;

        return (
            <DivComponent
                componentContext={childContext}
            />
        );
    };

    return (
        <Outer componentContext={componentContext}>
            <View>
                {renderContent()}
            </View>
        </Outer>
    );
}
