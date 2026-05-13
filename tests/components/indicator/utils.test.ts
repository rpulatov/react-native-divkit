/**
 * Unit tests for pure indicator helpers.
 */

import {
    DEFAULT_ACTIVE,
    DEFAULT_INACTIVE,
    buildDotStyles,
    resolvePlacement,
    shapeToDot
} from '../../../src/components/indicator/utils';

describe('indicator/utils', () => {
    describe('shapeToDot', () => {
        it('returns base when shape is missing', () => {
            expect(shapeToDot(undefined, '#fff', DEFAULT_INACTIVE)).toBe(DEFAULT_INACTIVE);
            expect(shapeToDot(null, '#fff', DEFAULT_INACTIVE)).toBe(DEFAULT_INACTIVE);
        });

        it('returns base for unknown shape type', () => {
            expect(shapeToDot({ type: 'triangle' }, '#fff', DEFAULT_ACTIVE)).toBe(DEFAULT_ACTIVE);
        });

        it('rounded_rectangle: uses item_width / item_height / corner_radius', () => {
            const dot = shapeToDot(
                {
                    type: 'rounded_rectangle',
                    item_width: { value: 12 },
                    item_height: { value: 4 },
                    corner_radius: { value: 2 },
                    background_color: '#000000'
                },
                '#ffffff',
                DEFAULT_INACTIVE
            );
            expect(dot.width).toBe(12);
            expect(dot.height).toBe(4);
            expect(dot.borderRadius).toBe(2);
            // correctColor returns lowercase normalized
            expect(dot.background.toLowerCase()).toBe('#000000');
        });

        it('rounded_rectangle: defaults missing corner_radius to half min(w, h)', () => {
            const dot = shapeToDot(
                {
                    type: 'rounded_rectangle',
                    item_width: { value: 20 },
                    item_height: { value: 8 }
                },
                '#fff',
                DEFAULT_INACTIVE
            );
            expect(dot.borderRadius).toBe(4); // min(20, 8) / 2
        });

        it('rounded_rectangle: defaults missing dimensions to base', () => {
            const dot = shapeToDot(
                { type: 'rounded_rectangle' },
                '#fff',
                DEFAULT_INACTIVE
            );
            expect(dot.width).toBe(DEFAULT_INACTIVE.width);
            expect(dot.height).toBe(DEFAULT_INACTIVE.height);
        });

        it('rounded_rectangle: bad background_color falls back to provided fallback', () => {
            const dot = shapeToDot(
                { type: 'rounded_rectangle', item_width: { value: 6 }, item_height: { value: 6 } },
                '#aabbcc',
                DEFAULT_INACTIVE
            );
            expect(dot.background.toLowerCase()).toBe('#aabbcc');
        });

        it('circle: uses radius for size and borderRadius', () => {
            const dot = shapeToDot(
                { type: 'circle', radius: { value: 7 }, background_color: '#ff0000' },
                '#fff',
                DEFAULT_INACTIVE
            );
            expect(dot.width).toBe(14);
            expect(dot.height).toBe(14);
            expect(dot.borderRadius).toBe(7);
            expect(dot.background.toLowerCase()).toBe('#ff0000');
        });

        it('circle: defaults missing radius to base.width / 2', () => {
            const dot = shapeToDot({ type: 'circle' }, '#fff', DEFAULT_INACTIVE);
            expect(dot.width).toBe(DEFAULT_INACTIVE.width);
            expect(dot.height).toBe(DEFAULT_INACTIVE.width);
            expect(dot.borderRadius).toBe(DEFAULT_INACTIVE.width / 2);
        });
    });

    describe('buildDotStyles', () => {
        it('returns defaults when no inputs', () => {
            const { active, inactive } = buildDotStyles({});
            expect(active).toEqual(DEFAULT_ACTIVE);
            expect(inactive).toEqual(DEFAULT_INACTIVE);
        });

        it('explicit active_shape overrides only active', () => {
            const { active, inactive } = buildDotStyles({
                activeShape: { type: 'circle', radius: { value: 9 } }
            });
            expect(active.width).toBe(18);
            expect(inactive).toEqual(DEFAULT_INACTIVE);
        });

        it('explicit inactive_shape overrides only inactive', () => {
            const { active, inactive } = buildDotStyles({
                inactiveShape: { type: 'circle', radius: { value: 4 } }
            });
            expect(inactive.width).toBe(8);
            expect(active).toEqual(DEFAULT_ACTIVE);
        });

        it('legacy: shape + active_item_size scales inactive into active', () => {
            const { active, inactive } = buildDotStyles({
                legacyShape: {
                    type: 'rounded_rectangle',
                    item_width: { value: 10 },
                    item_height: { value: 2 },
                    corner_radius: { value: 1 }
                },
                activeItemSize: 1.5,
                activeColor: '#000000',
                inactiveColor: '#888888'
            });
            expect(inactive.width).toBe(10);
            expect(inactive.height).toBe(2);
            expect(inactive.background.toLowerCase()).toBe('#888888');
            expect(active.width).toBe(15);
            expect(active.height).toBe(3);
            expect(active.background.toLowerCase()).toBe('#000000');
        });

        it('legacy: defaults active_item_size to 1.3 when missing/non-positive', () => {
            const { active, inactive } = buildDotStyles({
                legacyShape: {
                    type: 'rounded_rectangle',
                    item_width: { value: 10 },
                    item_height: { value: 10 }
                }
            });
            expect(active.width).toBeCloseTo(13);
            expect(inactive.width).toBe(10);
        });

        it('legacy is ignored if any explicit shape is present', () => {
            const { active } = buildDotStyles({
                activeShape: { type: 'circle', radius: { value: 5 } },
                legacyShape: { type: 'circle', radius: { value: 99 } },
                activeItemSize: 3
            });
            // Active comes from activeShape, not legacy×activeItemSize
            expect(active.width).toBe(10);
        });

        it('legacy: bad colors keep base background', () => {
            const { active, inactive } = buildDotStyles({
                legacyShape: { type: 'circle', radius: { value: 5 } },
                activeColor: undefined,
                inactiveColor: undefined
            });
            expect(active.background).toBe(DEFAULT_ACTIVE.background);
            expect(inactive.background).toBe(DEFAULT_INACTIVE.background);
        });
    });

    describe('resolvePlacement', () => {
        it('default placement when no inputs: gap = 15 - inactiveWidth', () => {
            const r = resolvePlacement({ inactiveWidth: 10 });
            expect(r.placement).toBe('default');
            expect(r.gap).toBe(5);
            expect(r.stretchSpacing).toBe(0);
            expect(r.maxVisible).toBe(10);
        });

        it('default placement: gap clamped at 0 when inactiveWidth >= center', () => {
            const r = resolvePlacement({ inactiveWidth: 20 });
            expect(r.gap).toBe(0);
        });

        it('default placement uses spaceBetweenCenters.value', () => {
            const r = resolvePlacement({
                spaceBetweenCenters: { value: 24 },
                inactiveWidth: 8
            });
            expect(r.gap).toBe(16);
        });

        it('items_placement: default overrides spaceBetweenCenters.value', () => {
            const r = resolvePlacement({
                spaceBetweenCenters: { value: 30 },
                itemsPlacement: { type: 'default', space_between_centers: { value: 12 } },
                inactiveWidth: 4
            });
            expect(r.placement).toBe('default');
            expect(r.gap).toBe(8); // 12 - 4
        });

        it('items_placement: stretch with item_spacing and max_visible_items', () => {
            const r = resolvePlacement({
                itemsPlacement: { type: 'stretch', item_spacing: { value: 6 }, max_visible_items: 7 },
                inactiveWidth: 10
            });
            expect(r.placement).toBe('stretch');
            expect(r.stretchSpacing).toBe(6);
            expect(r.maxVisible).toBe(7);
            expect(r.gap).toBe(0);
        });

        it('items_placement: stretch with missing fields falls back to defaults', () => {
            const r = resolvePlacement({
                itemsPlacement: { type: 'stretch' },
                inactiveWidth: 10
            });
            expect(r.placement).toBe('stretch');
            expect(r.stretchSpacing).toBe(5);
            expect(r.maxVisible).toBe(10);
        });

        it('items_placement: unknown type falls back to default', () => {
            const r = resolvePlacement({
                itemsPlacement: { type: 'whatever' },
                inactiveWidth: 6
            });
            expect(r.placement).toBe('default');
        });

        it('negative space_between_centers ignored', () => {
            const r = resolvePlacement({
                spaceBetweenCenters: { value: -10 },
                inactiveWidth: 6
            });
            // Falls back to default 15 - 6 = 9
            expect(r.gap).toBe(9);
        });
    });
});
