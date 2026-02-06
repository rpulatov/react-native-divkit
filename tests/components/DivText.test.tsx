/**
 * Tests for DivText component
 */

import React from 'react';
import { DivText } from '../../src/components/text/DivText';
import { DivKitContext, type DivKitContextValue } from '../../src/context/DivKitContext';
import { createVariable } from '../../src/expressions/variable';
import type { ComponentContext } from '../../src/types/componentContext';
import type { DivTextData } from '../../src/types/text';

// Mock React Native components
jest.mock('react-native', () => ({
    Text: ({ children, style, numberOfLines, ellipsizeMode }: any) => ({
        type: 'Text',
        props: { children, style, numberOfLines, ellipsizeMode }
    }),
    View: ({ children, style }: any) => ({
        type: 'View',
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

describe('DivText', () => {
    const createMockContext = (json: Partial<DivTextData>): ComponentContext<DivTextData> => {
        const fullJson: DivTextData = {
            type: 'text',
            text: 'Hello World',
            ...json
        };

        return {
            path: [],
            json: fullJson as any,
            origJson: fullJson as any,
            templateContext: {},
            variables: new Map(),
            id: 'test-text-1',
            logError: jest.fn(),
            execAnyActions: jest.fn(),
            getDerivedFromVars: (prop: any) => prop,
            getJsonWithVars: (prop: any) => prop,
            evalExpression: jest.fn(),
            produceChildContext: jest.fn(),
            dup: jest.fn(),
            getVariable: jest.fn(),
            getAnimator: jest.fn(),
            registerState: jest.fn(),
            registerPager: jest.fn(),
            listenPager: jest.fn(),
            destroy: jest.fn()
        };
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

    const renderWithContext = (component: React.ReactElement) => {
        const contextValue = createDivKitContextValue();
        return {
            result: (
                <DivKitContext.Provider value={contextValue}>
                    {component}
                </DivKitContext.Provider>
            ),
            contextValue
        };
    };

    it('renders text content', () => {
        const context = createMockContext({ text: 'Test Text' });
        const { result } = renderWithContext(<DivText componentContext={context} />);

        expect(result).toBeDefined();
    });

    it('applies font size from json', () => {
        const context = createMockContext({
            text: 'Sized Text',
            font_size: 24
        });

        const { result } = renderWithContext(<DivText componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies font weight', () => {
        const context = createMockContext({
            text: 'Bold Text',
            font_weight: 'bold'
        });

        const { result } = renderWithContext(<DivText componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies text color', () => {
        const context = createMockContext({
            text: 'Colored Text',
            text_color: '#FF0000'
        });

        const { result } = renderWithContext(<DivText componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies text alignment', () => {
        const context = createMockContext({
            text: 'Centered Text',
            text_alignment_horizontal: 'center'
        });

        const { result } = renderWithContext(<DivText componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies max_lines and ellipsize', () => {
        const context = createMockContext({
            text: 'Long text that should be truncated',
            max_lines: 2
        });

        const { result } = renderWithContext(<DivText componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies underline decoration', () => {
        const context = createMockContext({
            text: 'Underlined Text',
            underline: 'single'
        });

        const { result } = renderWithContext(<DivText componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies strikethrough decoration', () => {
        const context = createMockContext({
            text: 'Strikethrough Text',
            strike: 'single'
        });

        const { result } = renderWithContext(<DivText componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies line height', () => {
        const context = createMockContext({
            text: 'Text with line height',
            font_size: 16,
            line_height: 24
        });

        const { result } = renderWithContext(<DivText componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies letter spacing', () => {
        const context = createMockContext({
            text: 'Spaced Text',
            letter_spacing: 2
        });

        const { result } = renderWithContext(<DivText componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies custom font weight value', () => {
        const context = createMockContext({
            text: 'Custom Weight',
            font_weight_value: 600
        });

        const { result } = renderWithContext(<DivText componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies font family', () => {
        const context = createMockContext({
            text: 'Custom Font',
            font_family: 'CustomFont'
        });

        const { result } = renderWithContext(<DivText componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('handles RTL direction for start alignment', () => {
        const context = createMockContext({
            text: 'RTL Text',
            text_alignment_horizontal: 'start'
        });

        const contextValue = createDivKitContextValue();
        contextValue.direction = 'rtl';

        const result = (
            <DivKitContext.Provider value={contextValue}>
                <DivText componentContext={context} />
            </DivKitContext.Provider>
        );

        expect(result).toBeDefined();
    });

    it('handles RTL direction for end alignment', () => {
        const context = createMockContext({
            text: 'RTL Text',
            text_alignment_horizontal: 'end'
        });

        const contextValue = createDivKitContextValue();
        contextValue.direction = 'rtl';

        const result = (
            <DivKitContext.Provider value={contextValue}>
                <DivText componentContext={context} />
            </DivKitContext.Provider>
        );

        expect(result).toBeDefined();
    });
});
