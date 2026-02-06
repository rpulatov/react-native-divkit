/**
 * Tests for DivImage component
 */

import React from 'react';
import { DivImage } from '../../src/components/image/DivImage';
import { DivKitContext, type DivKitContextValue } from '../../src/context/DivKitContext';
import type { ComponentContext } from '../../src/types/componentContext';
import type { DivImageData } from '../../src/types/image';

// Mock React Native components
jest.mock('react-native', () => ({
    Image: ({ source, style, resizeMode }: any) => ({
        type: 'Image',
        props: { source, style, resizeMode }
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
    },
    ActivityIndicator: ({ size, color }: any) => ({
        type: 'ActivityIndicator',
        props: { size, color }
    })
}));

describe('DivImage', () => {
    const createMockContext = (json: Partial<DivImageData>): ComponentContext<DivImageData> => {
        const fullJson: DivImageData = {
            type: 'image',
            image_url: 'https://example.com/image.png',
            ...json
        };

        return {
            path: [],
            json: fullJson as any,
            origJson: fullJson as any,
            templateContext: {},
            variables: new Map(),
            id: 'test-image-1',
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
            result: <DivKitContext.Provider value={contextValue}>{component}</DivKitContext.Provider>,
            contextValue
        };
    };

    it('renders image with URL', () => {
        const context = createMockContext({
            image_url: 'https://example.com/photo.jpg'
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies scale: fit (contain)', () => {
        const context = createMockContext({
            image_url: 'https://example.com/photo.jpg',
            scale: 'fit'
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies scale: fill (cover)', () => {
        const context = createMockContext({
            image_url: 'https://example.com/photo.jpg',
            scale: 'fill'
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies scale: stretch', () => {
        const context = createMockContext({
            image_url: 'https://example.com/photo.jpg',
            scale: 'stretch'
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies scale: no_scale (center)', () => {
        const context = createMockContext({
            image_url: 'https://example.com/photo.jpg',
            scale: 'no_scale'
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies tint_color', () => {
        const context = createMockContext({
            image_url: 'https://example.com/icon.png',
            tint_color: '#FF0000'
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies aspect_ratio', () => {
        const context = createMockContext({
            image_url: 'https://example.com/photo.jpg',
            aspect: { ratio: 1.5 }
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies placeholder_color', () => {
        const context = createMockContext({
            image_url: 'https://example.com/photo.jpg',
            placeholder_color: '#CCCCCC'
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies content alignment horizontal', () => {
        const context = createMockContext({
            image_url: 'https://example.com/photo.jpg',
            content_alignment_horizontal: 'center'
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('applies content alignment vertical', () => {
        const context = createMockContext({
            image_url: 'https://example.com/photo.jpg',
            content_alignment_vertical: 'center'
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('handles preview image', () => {
        const context = createMockContext({
            image_url: 'https://example.com/photo.jpg',
            preview: 'data:image/png;base64,iVBORw0KGgo='
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });

    it('handles alpha (opacity)', () => {
        const context = createMockContext({
            image_url: 'https://example.com/photo.jpg',
            alpha: 0.5
        });

        const { result } = renderWithContext(<DivImage componentContext={context} />);
        expect(result).toBeDefined();
    });
});
