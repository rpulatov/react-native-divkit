/**
 * Unit tests for pure pager helpers.
 */

import {
    DUPLICATES_IN_INFINITE,
    buildRenderedItems,
    computeContentPad,
    computePageSize,
    isInDuplicateRegion,
    isInfiniteEnabled,
    offsetToPosition,
    positionToReal,
    realToPosition
} from '../../../src/components/pager/utils';

describe('pager/utils', () => {
    describe('computePageSize', () => {
        const base = { itemSpacing: 0, innerPadStart: 0, innerPadEnd: 0 };

        it('returns 0 when containerSize is 0', () => {
            expect(
                computePageSize({
                    ...base,
                    containerSize: 0,
                    layoutMode: { type: 'fixed', neighbour_page_width: { value: 16 } },
                    scrollAxisAlignment: 'center'
                })
            ).toBe(0);
        });

        it('returns 0 when containerSize is negative', () => {
            expect(
                computePageSize({
                    ...base,
                    containerSize: -10,
                    layoutMode: { type: 'fixed', neighbour_page_width: { value: 16 } },
                    scrollAxisAlignment: 'center'
                })
            ).toBe(0);
        });

        it('fixed + center: containerW − 2·neighbour − 2·spacing', () => {
            expect(
                computePageSize({
                    containerSize: 412,
                    layoutMode: { type: 'fixed', neighbour_page_width: { value: 16 } },
                    scrollAxisAlignment: 'center',
                    itemSpacing: 8,
                    innerPadStart: 4,
                    innerPadEnd: 4
                })
            ).toBe(412 - 2 * 16 - 2 * 8);
        });

        it('fixed + start: containerW − neighbour − spacing', () => {
            expect(
                computePageSize({
                    containerSize: 400,
                    layoutMode: { type: 'fixed', neighbour_page_width: { value: 20 } },
                    scrollAxisAlignment: 'start',
                    itemSpacing: 10,
                    innerPadStart: 0,
                    innerPadEnd: 0
                })
            ).toBe(400 - 20 - 10);
        });

        it('fixed + end: same formula as start', () => {
            expect(
                computePageSize({
                    containerSize: 400,
                    layoutMode: { type: 'fixed', neighbour_page_width: { value: 20 } },
                    scrollAxisAlignment: 'end',
                    itemSpacing: 10,
                    innerPadStart: 0,
                    innerPadEnd: 0
                })
            ).toBe(400 - 20 - 10);
        });

        it('fixed + missing neighbour_page_width treated as 0', () => {
            expect(
                computePageSize({
                    ...base,
                    containerSize: 300,
                    layoutMode: { type: 'fixed' },
                    scrollAxisAlignment: 'center'
                })
            ).toBe(300);
        });

        it('percentage: page_width / 100 * containerW', () => {
            expect(
                computePageSize({
                    ...base,
                    containerSize: 400,
                    layoutMode: { type: 'percentage', page_width: { value: 75 } },
                    scrollAxisAlignment: 'center'
                })
            ).toBe(300);
        });

        it('percentage: missing page_width defaults to 100%', () => {
            expect(
                computePageSize({
                    ...base,
                    containerSize: 400,
                    layoutMode: { type: 'percentage' },
                    scrollAxisAlignment: 'center'
                })
            ).toBe(400);
        });

        it('wrap_content: returns usable area', () => {
            expect(
                computePageSize({
                    ...base,
                    containerSize: 400,
                    layoutMode: { type: 'wrap_content' },
                    scrollAxisAlignment: 'center',
                    innerPadStart: 10,
                    innerPadEnd: 20
                })
            ).toBe(400 - 10 - 20);
        });

        it('null/undefined layoutMode: falls back to usable area', () => {
            expect(
                computePageSize({
                    ...base,
                    containerSize: 200,
                    layoutMode: undefined,
                    scrollAxisAlignment: 'center'
                })
            ).toBe(200);
        });

        it('never returns negative pageSize', () => {
            expect(
                computePageSize({
                    ...base,
                    containerSize: 50,
                    layoutMode: { type: 'fixed', neighbour_page_width: { value: 100 } },
                    scrollAxisAlignment: 'center',
                    itemSpacing: 50
                })
            ).toBe(0);
        });
    });

    describe('computeContentPad', () => {
        const args = {
            containerSize: 412,
            pageSize: 360,
            innerPadStart: 4,
            innerPadEnd: 4,
            scrollAxisAlignment: 'center' as const,
            itemSpacing: 8,
            isInfinite: false,
            layoutMode: { type: 'fixed', neighbour_page_width: { value: 16 } }
        };

        it('infinite mode: zero on both sides regardless of layout', () => {
            expect(computeContentPad({ ...args, isInfinite: true })).toEqual({ start: 0, end: 0 });
        });

        it('fixed + center: (neighbour + spacing) on both sides', () => {
            expect(computeContentPad(args)).toEqual({ start: 16 + 8, end: 16 + 8 });
        });

        it('fixed + start: only end pad uses neighbour', () => {
            expect(
                computeContentPad({ ...args, scrollAxisAlignment: 'start' })
            ).toEqual({ start: 4, end: 16 + 8 + 4 });
        });

        it('fixed + end: only start pad uses neighbour', () => {
            expect(computeContentPad({ ...args, scrollAxisAlignment: 'end' })).toEqual({
                start: 16 + 8 + 4,
                end: 4
            });
        });

        it('non-fixed layout: uses inner paddings as-is', () => {
            expect(
                computeContentPad({ ...args, layoutMode: { type: 'percentage' } })
            ).toEqual({ start: 4, end: 4 });
        });

        it('zero containerSize: falls back to inner paddings', () => {
            expect(computeContentPad({ ...args, containerSize: 0 })).toEqual({ start: 4, end: 4 });
        });

        it('zero pageSize: falls back to inner paddings', () => {
            expect(computeContentPad({ ...args, pageSize: 0 })).toEqual({ start: 4, end: 4 });
        });
    });

    describe('realToPosition / positionToReal', () => {
        it('non-infinite: realToPosition is identity', () => {
            expect(realToPosition(0, false)).toBe(0);
            expect(realToPosition(3, false)).toBe(3);
            expect(realToPosition(99, false)).toBe(99);
        });

        it('infinite: realToPosition shifts by DUPLICATES', () => {
            expect(realToPosition(0, true)).toBe(DUPLICATES_IN_INFINITE);
            expect(realToPosition(3, true)).toBe(DUPLICATES_IN_INFINITE + 3);
        });

        it('non-infinite: positionToReal clamps to [0, size−1]', () => {
            expect(positionToReal(-2, false, 5)).toBe(0);
            expect(positionToReal(0, false, 5)).toBe(0);
            expect(positionToReal(4, false, 5)).toBe(4);
            expect(positionToReal(99, false, 5)).toBe(4);
        });

        it('positionToReal returns 0 for empty list', () => {
            expect(positionToReal(3, false, 0)).toBe(0);
            expect(positionToReal(3, true, 0)).toBe(0);
        });

        it('infinite: positionToReal wraps modulo size', () => {
            const N = DUPLICATES_IN_INFINITE; // 2
            const size = 5;
            // Real region: [N..N+size-1] = [2..6] -> 0..4
            expect(positionToReal(N, true, size)).toBe(0);
            expect(positionToReal(N + 4, true, size)).toBe(4);
            // Left duplicates: positions 0,1 -> 3,4 (last items)
            expect(positionToReal(0, true, size)).toBe(3);
            expect(positionToReal(1, true, size)).toBe(4);
            // Right duplicates: positions 7,8 -> 0,1 (first items)
            expect(positionToReal(N + size, true, size)).toBe(0);
            expect(positionToReal(N + size + 1, true, size)).toBe(1);
        });

        it('round-trip non-infinite within range', () => {
            for (let i = 0; i < 5; i++) {
                expect(positionToReal(realToPosition(i, false), false, 5)).toBe(i);
            }
        });

        it('round-trip infinite for real items', () => {
            for (let i = 0; i < 5; i++) {
                expect(positionToReal(realToPosition(i, true), true, 5)).toBe(i);
            }
        });
    });

    describe('isInDuplicateRegion', () => {
        const N = DUPLICATES_IN_INFINITE;

        it('always false in non-infinite mode', () => {
            expect(isInDuplicateRegion(0, false, 5)).toBe(false);
            expect(isInDuplicateRegion(99, false, 5)).toBe(false);
            expect(isInDuplicateRegion(-1, false, 5)).toBe(false);
        });

        it('left duplicate region', () => {
            expect(isInDuplicateRegion(0, true, 5)).toBe(true);
            expect(isInDuplicateRegion(N - 1, true, 5)).toBe(true);
        });

        it('right duplicate region', () => {
            expect(isInDuplicateRegion(N + 5, true, 5)).toBe(true);
            expect(isInDuplicateRegion(N + 5 + 1, true, 5)).toBe(true);
        });

        it('real region returns false', () => {
            expect(isInDuplicateRegion(N, true, 5)).toBe(false);
            expect(isInDuplicateRegion(N + 4, true, 5)).toBe(false);
        });
    });

    describe('isInfiniteEnabled', () => {
        it('true variants', () => {
            expect(isInfiniteEnabled(true, 5)).toBe(true);
            expect(isInfiniteEnabled(1, 5)).toBe(true);
            expect(isInfiniteEnabled('1', 5)).toBe(true);
            expect(isInfiniteEnabled('true', 5)).toBe(true);
        });

        it('false / falsy variants', () => {
            expect(isInfiniteEnabled(false, 5)).toBe(false);
            expect(isInfiniteEnabled(0, 5)).toBe(false);
            expect(isInfiniteEnabled('0', 5)).toBe(false);
            expect(isInfiniteEnabled(undefined, 5)).toBe(false);
            expect(isInfiniteEnabled(null, 5)).toBe(false);
            expect(isInfiniteEnabled('false', 5)).toBe(false);
        });

        it('disabled when items.length < DUPLICATES_IN_INFINITE', () => {
            expect(isInfiniteEnabled(true, 0)).toBe(false);
            expect(isInfiniteEnabled(true, 1)).toBe(false);
            expect(isInfiniteEnabled(true, DUPLICATES_IN_INFINITE)).toBe(true);
        });
    });

    describe('offsetToPosition', () => {
        it('returns 0 when snapInterval <= 0', () => {
            expect(offsetToPosition(100, 0)).toBe(0);
            expect(offsetToPosition(100, -1)).toBe(0);
        });

        it('rounds offset / snapInterval', () => {
            expect(offsetToPosition(0, 100)).toBe(0);
            expect(offsetToPosition(49, 100)).toBe(0);
            expect(offsetToPosition(50, 100)).toBe(1);
            expect(offsetToPosition(149, 100)).toBe(1);
            expect(offsetToPosition(150, 100)).toBe(2);
        });
    });

    describe('buildRenderedItems', () => {
        const items = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }];

        it('returns empty for empty input', () => {
            expect(buildRenderedItems([], false)).toEqual([]);
            expect(buildRenderedItems([], true)).toEqual([]);
        });

        it('non-infinite: realIndex matches array order', () => {
            const out = buildRenderedItems(items, false);
            expect(out).toHaveLength(items.length);
            out.forEach((entry, i) => {
                expect(entry.realIndex).toBe(i);
                expect(entry.item).toBe(items[i]);
            });
        });

        it('infinite: prefix has last DUPLICATES, suffix has first DUPLICATES', () => {
            const N = DUPLICATES_IN_INFINITE;
            const out = buildRenderedItems(items, true);
            expect(out).toHaveLength(items.length + 2 * N);
            // Head dup: last 2 = items[3], items[4]
            expect(out[0].realIndex).toBe(3);
            expect(out[0].item).toBe(items[3]);
            expect(out[1].realIndex).toBe(4);
            expect(out[1].item).toBe(items[4]);
            // Real items
            for (let i = 0; i < items.length; i++) {
                expect(out[N + i].realIndex).toBe(i);
                expect(out[N + i].item).toBe(items[i]);
            }
            // Tail dup: first 2 = items[0], items[1]
            expect(out[N + items.length].realIndex).toBe(0);
            expect(out[N + items.length + 1].realIndex).toBe(1);
        });

        it('infinite: keys are unique', () => {
            const out = buildRenderedItems(items, true);
            const keys = new Set(out.map(e => e.key));
            expect(keys.size).toBe(out.length);
        });
    });
});
