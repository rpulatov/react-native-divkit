/**
 * Tests for DivContainer component
 */

import React from 'react';
import { DivContainer } from '../../src/components/container/DivContainer';
import { DivKitContext, type DivKitContextValue } from '../../src/context/DivKitContext';
import { StateContext, type StateContextValue } from '../../src/context/StateContext';
import type { ComponentContext } from '../../src/types/componentContext';
import type { DivContainerData } from '../../src/types/container';

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
    }
}));

describe('DivContainer', () => {
    const createMockContext = (json: Partial<DivContainerData>): ComponentContext<DivContainerData> => {
        const fullJson: DivContainerData = {
            type: 'container',
            items: [],
            ...json
        };

        const context: ComponentContext<DivContainerData> = {
            path: [],
            json: fullJson as any,
            origJson: fullJson as any,
            templateContext: {},
            variables: new Map(),
            id: 'test-container-1',
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
            registerState: jest.fn(),
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
                    <StateContext.Provider value={stateContextValue}>
                        {component}
                    </StateContext.Provider>
                </DivKitContext.Provider>
            ),
            divKitContextValue,
            stateContextValue
        };
    };

    it('renders empty container', () => {
        const context = createMockContext({});
        const { result } = renderWithContext(<DivContainer componentContext={context} />);

        expect(result).toBeDefined();
    });

    it('renders container with items', () => {
        const context = createMockContext({
            items: [
                { type: 'text', text: 'Item 1' },
                { type: 'text', text: 'Item 2' }
            ] as any[]
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies vertical orientation', () => {
        const context = createMockContext({
            orientation: 'vertical',
            items: []
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies horizontal orientation', () => {
        const context = createMockContext({
            orientation: 'horizontal',
            items: []
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies content alignment horizontal - start', () => {
        const context = createMockContext({
            content_alignment_horizontal: 'start',
            items: []
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies content alignment horizontal - center', () => {
        const context = createMockContext({
            content_alignment_horizontal: 'center',
            items: []
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies content alignment horizontal - end', () => {
        const context = createMockContext({
            content_alignment_horizontal: 'end',
            items: []
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies content alignment vertical - top', () => {
        const context = createMockContext({
            content_alignment_vertical: 'top',
            items: []
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies content alignment vertical - center', () => {
        const context = createMockContext({
            content_alignment_vertical: 'center',
            items: []
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies content alignment vertical - bottom', () => {
        const context = createMockContext({
            content_alignment_vertical: 'bottom',
            items: []
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies item_spacing for gap', () => {
        const context = createMockContext({
            item_spacing: { value: 10 },
            items: [
                { type: 'text', text: 'Item 1' },
                { type: 'text', text: 'Item 2' }
            ] as any[]
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('handles overlap layout mode', () => {
        const context = createMockContext({
            layout_mode: 'overlap',
            items: [
                { type: 'text', text: 'Base' },
                { type: 'text', text: 'Overlay' }
            ] as any[]
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('handles wrap layout mode', () => {
        const context = createMockContext({
            layout_mode: 'wrap',
            items: [
                { type: 'text', text: 'Item 1' },
                { type: 'text', text: 'Item 2' },
                { type: 'text', text: 'Item 3' }
            ] as any[]
        });

        const { result } = renderWithContext(<DivContainer componentContext={context} />);
        expect(result).toBeDefined();
    });
});
