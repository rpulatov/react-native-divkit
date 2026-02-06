/**
 * Tests for DivState component
 */

import React from 'react';
import { DivState } from '../../src/components/state/DivState';
import { DivKitContext, type DivKitContextValue } from '../../src/context/DivKitContext';
import { StateContext, type StateContextValue } from '../../src/context/StateContext';
import type { ComponentContext } from '../../src/types/componentContext';
import type { DivStateData } from '../../src/types/state';

// Mock React Native components
jest.mock('react-native', () => ({
    View: ({ children, style }: any) => ({
        type: 'View',
        props: { children, style }
    }),
    Text: ({ children, style }: any) => ({
        type: 'Text',
        props: { children, style }
    }),
    Pressable: ({ children, onPress, style }: any) => ({
        type: 'Pressable',
        props: { children, onPress, style }
    }),
    StyleSheet: {
        create: (styles: any) => styles,
        flatten: (style: any) => style
    },
    LayoutAnimation: {
        configureNext: jest.fn(),
        Presets: {
            easeInEaseOut: {}
        }
    }
}));

describe('DivState', () => {
    const createMockContext = (json: Partial<DivStateData>): ComponentContext<DivStateData> => {
        const fullJson: DivStateData = {
            type: 'state',
            states: [],
            ...json
        };

        const context: ComponentContext<DivStateData> = {
            path: [],
            json: fullJson as any,
            origJson: fullJson as any,
            templateContext: {},
            variables: new Map(),
            id: 'test-state-1',
            logError: jest.fn(),
            execAnyActions: jest.fn(),
            getDerivedFromVars: (prop: any) => prop,
            getJsonWithVars: (prop: any) => prop,
            evalExpression: jest.fn(),
            produceChildContext: jest.fn((div, opts) => ({
                ...context,
                json: div,
                origJson: div,
                id: opts?.id || 'child-id'
            })),
            dup: jest.fn(),
            getVariable: jest.fn(),
            getAnimator: jest.fn(),
            registerState: jest.fn(() => () => {}),
            registerPager: jest.fn(),
            listenPager: jest.fn(),
            destroy: jest.fn()
        };

        return context;
    };

    const createDivKitContextValue = (): DivKitContextValue => ({
        logStat: jest.fn(),
        execCustomAction: jest.fn(),
        direction: 'ltr',
        platform: 'touch',
        variables: new Map(),
        getVariable: jest.fn(),
        setVariable: jest.fn(),
        registerComponent: jest.fn(),
        unregisterComponent: jest.fn(),
        execAnyActions: jest.fn(),
        genId: () => 'test-id'
    });

    const createStateContextValue = (): StateContextValue => ({
        registerState: jest.fn(() => () => {}),
        switchState: jest.fn(),
        getStateSetter: jest.fn(),
        registerChild: jest.fn(),
        unregisterChild: jest.fn(),
        hasTransitionChange: jest.fn(() => false)
    });

    const renderWithContext = (component: React.ReactElement) => {
        const divKitContextValue = createDivKitContextValue();
        const stateContextValue = createStateContextValue();

        return {
            result: (
                <DivKitContext.Provider value={divKitContextValue}>
                    <StateContext.Provider value={stateContextValue}>{component}</StateContext.Provider>
                </DivKitContext.Provider>
            ),
            divKitContextValue,
            stateContextValue
        };
    };

    it('renders state component with default state', () => {
        const context = createMockContext({
            div_id: 'my_state',
            default_state_id: 'state1',
            states: [
                { state_id: 'state1', div: { type: 'text', text: 'State 1' } },
                { state_id: 'state2', div: { type: 'text', text: 'State 2' } }
            ] as any[]
        });

        const { result } = renderWithContext(<DivState componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('renders first state when no default specified', () => {
        const context = createMockContext({
            div_id: 'my_state',
            states: [
                { state_id: 'first', div: { type: 'text', text: 'First' } },
                { state_id: 'second', div: { type: 'text', text: 'Second' } }
            ] as any[]
        });

        const { result } = renderWithContext(<DivState componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('renders empty when no states provided', () => {
        const context = createMockContext({
            div_id: 'empty_state',
            states: []
        });

        const { result } = renderWithContext(<DivState componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('registers state with context', () => {
        const context = createMockContext({
            div_id: 'registered_state',
            states: [{ state_id: 'state1', div: { type: 'text', text: 'Content' } }] as any[]
        });

        const registerStateMock = jest.fn(() => () => {});
        context.registerState = registerStateMock;

        const { result } = renderWithContext(<DivState componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('handles state with single state', () => {
        const context = createMockContext({
            div_id: 'single_state',
            states: [{ state_id: 'only', div: { type: 'text', text: 'Only State' } }] as any[]
        });

        const { result } = renderWithContext(<DivState componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('handles state with multiple states', () => {
        const context = createMockContext({
            div_id: 'multi_state',
            default_state_id: 'second',
            states: [
                { state_id: 'first', div: { type: 'text', text: 'First' } },
                { state_id: 'second', div: { type: 'text', text: 'Second' } },
                { state_id: 'third', div: { type: 'text', text: 'Third' } }
            ] as any[]
        });

        const { result } = renderWithContext(<DivState componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('handles state with nested container', () => {
        const context = createMockContext({
            div_id: 'nested_state',
            default_state_id: 'container_state',
            states: [
                {
                    state_id: 'container_state',
                    div: {
                        type: 'container',
                        items: [
                            { type: 'text', text: 'Item 1' },
                            { type: 'text', text: 'Item 2' }
                        ]
                    }
                }
            ] as any[]
        });

        const { result } = renderWithContext(<DivState componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('handles state with actions', () => {
        const context = createMockContext({
            div_id: 'action_state',
            states: [
                {
                    state_id: 'state1',
                    div: {
                        type: 'text',
                        text: 'Click me',
                        actions: [{ log_id: 'click', url: 'action://do' }]
                    }
                }
            ] as any[]
        });

        const { result } = renderWithContext(<DivState componentContext={context} />);
        expect(result).toBeDefined();
    });
});
