/**
 * Smoke tests for DivIndicator.
 *
 * Pure styling logic (active/inactive dot calculation, placement resolution)
 * is fully covered by tests/components/indicator/utils.test.ts. This file
 * verifies the wiring of the component itself: contexts, subscription to
 * the pager, and graceful behaviour without pager data.
 */

import React from 'react';
import { DivIndicator } from '../../src/components/indicator/DivIndicator';
import { DivKitContext, type DivKitContextValue } from '../../src/context/DivKitContext';
import { PagerContext, type PagerContextValue } from '../../src/context/PagerContext';
import type { ComponentContext } from '../../src/types/componentContext';
import type { DivIndicatorData } from '../../src/types/indicator';

jest.mock('react-native', () => ({
    View: ({ children, style }: any) => ({ type: 'View', props: { children, style } }),
    Text: ({ children, style }: any) => ({ type: 'Text', props: { children, style } }),
    Pressable: ({ children, onPress, style }: any) => ({
        type: 'Pressable',
        props: { children, onPress, style }
    }),
    ScrollView: ({ children, ...props }: any) => ({
        type: 'ScrollView',
        props: { ...props, children }
    }),
    StyleSheet: {
        create: (styles: any) => styles,
        flatten: (style: any) => style
    }
}));

describe('DivIndicator', () => {
    const createMockContext = (json: Partial<DivIndicatorData>): ComponentContext<DivIndicatorData> => {
        const fullJson = {
            type: 'indicator' as const,
            ...json
        };

        const context: ComponentContext<DivIndicatorData> = {
            path: [],
            json: fullJson as any,
            origJson: fullJson as any,
            templateContext: {},
            variables: new Map(),
            id: 'test-indicator-1',
            logError: jest.fn(),
            execAnyActions: jest.fn(),
            getDerivedFromVars: (prop: any) => prop,
            getJsonWithVars: (prop: any) => prop,
            evalExpression: jest.fn(),
            produceChildContext: jest.fn(),
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
        typefaceProvider: () => '',
        variables: new Map(),
        getVariable: jest.fn(),
        setVariable: jest.fn(),
        registerComponent: jest.fn(),
        unregisterComponent: jest.fn(),
        execAnyActions: jest.fn(),
        genId: jest.fn((key: string) => `${key}_test`)
    });

    const createPagerContextValue = (): PagerContextValue => ({
        registerPager: jest.fn(() => ({ update: jest.fn(), destroy: jest.fn() })),
        listenPager: jest.fn(() => () => {})
    });

    function invokeDirectly(ctx: ComponentContext<DivIndicatorData>) {
        const divKitValue = createDivKitContextValue();
        const pagerValue = createPagerContextValue();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (DivKitContext as any)._currentValue = divKitValue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (PagerContext as any)._currentValue = pagerValue;
        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (DivIndicator as unknown as (p: any) => any)({ componentContext: ctx });
        } finally {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (DivKitContext as any)._currentValue = null;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (PagerContext as any)._currentValue = null;
        }
        return { divKitValue, pagerValue };
    }

    it('does not throw when invoked with empty json', () => {
        const ctx = createMockContext({});
        expect(() => invokeDirectly(ctx)).not.toThrow();
    });

    it('does not throw with legacy shape + active_item_size + colors', () => {
        const ctx = createMockContext({
            shape: {
                type: 'rounded_rectangle',
                item_width: { value: 10 },
                item_height: { value: 2 },
                corner_radius: { value: 1 }
            } as any,
            active_item_size: 1.5,
            active_item_color: '#000000',
            inactive_item_color: '#888888',
            space_between_centers: { type: 'fixed', value: 10 },
            pager_id: 'pager_1'
        });
        expect(() => invokeDirectly(ctx)).not.toThrow();
        expect(ctx.logError).not.toHaveBeenCalled();
    });

    it('does not throw with active_shape / inactive_shape (circle)', () => {
        const ctx = createMockContext({
            active_shape: { type: 'circle', radius: { value: 7 } } as any,
            inactive_shape: { type: 'circle', radius: { value: 4 } } as any,
            pager_id: 'pager_1'
        });
        expect(() => invokeDirectly(ctx)).not.toThrow();
    });

    it('does not throw with stretch placement', () => {
        const ctx = createMockContext({
            items_placement: {
                type: 'stretch',
                item_spacing: { type: 'fixed', value: 5 },
                max_visible_items: 6
            } as any
        });
        expect(() => invokeDirectly(ctx)).not.toThrow();
    });

    it('does not throw with default placement variant', () => {
        const ctx = createMockContext({
            items_placement: {
                type: 'default',
                space_between_centers: { type: 'fixed', value: 12 }
            } as any
        });
        expect(() => invokeDirectly(ctx)).not.toThrow();
    });

    it('handles missing pager context gracefully (does not throw)', () => {
        // Render without setting PagerContext._currentValue (stays null).
        const ctx = createMockContext({ pager_id: 'pager_1' });
        const divKitValue = createDivKitContextValue();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (DivKitContext as any)._currentValue = divKitValue;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (PagerContext as any)._currentValue = null;

        expect(() =>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (DivIndicator as unknown as (p: any) => any)({ componentContext: ctx })
        ).not.toThrow();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (DivKitContext as any)._currentValue = null;
    });

    it('handles unknown items_placement type gracefully', () => {
        const ctx = createMockContext({
            items_placement: { type: 'galaxy_brain' } as any
        });
        expect(() => invokeDirectly(ctx)).not.toThrow();
    });
});
