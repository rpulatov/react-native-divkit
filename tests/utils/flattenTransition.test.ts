import { flattenAppearanceTransition, flattenChangeTransition } from '../../src/utils/flattenTransition';
import type { AppearanceTransition, TransitionChange } from '../../src/types/base';

describe('flattenAppearanceTransition', () => {
    test('single fade', () => {
        const t = { type: 'fade', alpha: 0, duration: 200 } as AppearanceTransition;
        expect(flattenAppearanceTransition(t)).toEqual([t]);
    });

    test('flattens set of mixed transitions', () => {
        const t: AppearanceTransition = {
            type: 'set',
            items: [
                { type: 'fade', alpha: 0 } as AppearanceTransition,
                { type: 'scale', scale: 0.5 } as AppearanceTransition,
                { type: 'slide', edge: 'right' } as AppearanceTransition
            ]
        };
        const res = flattenAppearanceTransition(t);
        expect(res).toHaveLength(3);
        expect(res.map(it => (it as any).type)).toEqual(['fade', 'scale', 'slide']);
    });

    test('recursively flattens nested sets', () => {
        const t: AppearanceTransition = {
            type: 'set',
            items: [
                {
                    type: 'set',
                    items: [{ type: 'fade', alpha: 0 } as AppearanceTransition]
                } as AppearanceTransition,
                { type: 'scale', scale: 0 } as AppearanceTransition
            ]
        };
        const res = flattenAppearanceTransition(t);
        expect(res).toHaveLength(2);
        expect(res.map(it => (it as any).type)).toEqual(['fade', 'scale']);
    });

    test('handles empty items array gracefully', () => {
        const t: AppearanceTransition = { type: 'set', items: [] };
        expect(flattenAppearanceTransition(t)).toEqual([]);
    });
});

describe('flattenChangeTransition', () => {
    test('single change_bounds', () => {
        const t = { type: 'change_bounds', duration: 300 } as TransitionChange;
        expect(flattenChangeTransition(t)).toEqual([t]);
    });

    test('flattens set of change_bounds', () => {
        const t: TransitionChange = {
            type: 'set',
            items: [
                { type: 'change_bounds', duration: 200 },
                { type: 'change_bounds', duration: 300 }
            ]
        };
        const res = flattenChangeTransition(t);
        expect(res).toHaveLength(2);
        expect(res.map(it => (it as any).duration)).toEqual([200, 300]);
    });
});
