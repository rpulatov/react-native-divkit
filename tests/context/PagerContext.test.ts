/**
 * Tests for PagerContext provider — registration, listening, replay, destroy.
 *
 * The React mock turns useRef/useMemo/useCallback into trivial stubs (refs
 * keep their identity per call, useMemo simply runs the factory). That means
 * we can directly invoke PagerProvider with plain props and pull the produced
 * value out of the element tree to drive the API.
 */

import { PagerProvider, type PagerContextValue } from '../../src/context/PagerContext';
import type { PagerData } from '../../src/types/componentContext';

function getProviderValue(): PagerContextValue {
    const element = (PagerProvider as unknown as (props: { children: unknown }) => any)({
        children: null
    });
    return element.props.value as PagerContextValue;
}

function makeData(overrides: Partial<PagerData> = {}): PagerData {
    return {
        instId: 'pager_1',
        size: 5,
        currentItem: 0,
        scrollToPagerItem: jest.fn(),
        ...overrides
    };
}

describe('PagerContext', () => {
    describe('registration + listening', () => {
        it('subscriber receives no data when nothing has been published', () => {
            const ctx = getProviderValue();
            const listener = jest.fn();

            ctx.listenPager('pager_1', listener);

            expect(listener).not.toHaveBeenCalled();
        });

        it('subscriber receives data from update()', () => {
            const ctx = getProviderValue();
            const listener = jest.fn();
            const reg = ctx.registerPager('pager_1');

            ctx.listenPager('pager_1', listener);
            const data = makeData({ currentItem: 2 });
            reg.update(data);

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(data);
        });

        it('late subscriber gets the last published snapshot immediately (replay)', () => {
            const ctx = getProviderValue();
            const reg = ctx.registerPager('pager_1');
            const data = makeData({ currentItem: 3 });
            reg.update(data);

            const listener = jest.fn();
            ctx.listenPager('pager_1', listener);

            expect(listener).toHaveBeenCalledTimes(1);
            expect(listener).toHaveBeenCalledWith(data);
        });

        it('multiple subscribers all receive updates', () => {
            const ctx = getProviderValue();
            const reg = ctx.registerPager('pager_1');
            const a = jest.fn();
            const b = jest.fn();
            ctx.listenPager('pager_1', a);
            ctx.listenPager('pager_1', b);

            const data = makeData({ currentItem: 1 });
            reg.update(data);

            expect(a).toHaveBeenCalledWith(data);
            expect(b).toHaveBeenCalledWith(data);
        });
    });

    describe('unsubscribe', () => {
        it('returned unsubscribe stops further notifications', () => {
            const ctx = getProviderValue();
            const reg = ctx.registerPager('pager_1');
            const listener = jest.fn();

            const unsub = ctx.listenPager('pager_1', listener);
            reg.update(makeData({ currentItem: 0 }));
            unsub();
            reg.update(makeData({ currentItem: 4 }));

            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('unsubscribe is idempotent / safe to call when nothing was registered', () => {
            const ctx = getProviderValue();
            const listener = jest.fn();
            const unsub = ctx.listenPager('nope', listener);
            expect(() => {
                unsub();
                unsub();
            }).not.toThrow();
        });
    });

    describe('destroy', () => {
        it('clears stored snapshot — late subscribers get nothing', () => {
            const ctx = getProviderValue();
            const reg = ctx.registerPager('pager_1');
            reg.update(makeData({ currentItem: 1 }));
            reg.destroy();

            const listener = jest.fn();
            ctx.listenPager('pager_1', listener);

            expect(listener).not.toHaveBeenCalled();
        });

        it('does not affect already-attached subscribers (no auto-unsubscribe)', () => {
            const ctx = getProviderValue();
            const reg = ctx.registerPager('pager_1');
            const listener = jest.fn();
            ctx.listenPager('pager_1', listener);

            reg.update(makeData({ currentItem: 0 }));
            reg.destroy();
            // After destroy a NEW pager registers and updates — existing
            // listeners should still get those notifications.
            const reg2 = ctx.registerPager('pager_1');
            reg2.update(makeData({ currentItem: 2 }));

            expect(listener).toHaveBeenCalledTimes(2);
            expect(listener.mock.calls[1][0].currentItem).toBe(2);
        });
    });

    describe('pager_id isolation', () => {
        it('updates on one pager_id do not leak to listeners of another', () => {
            const ctx = getProviderValue();
            const regA = ctx.registerPager('pager_a');
            const regB = ctx.registerPager('pager_b');
            const listenerA = jest.fn();
            const listenerB = jest.fn();
            ctx.listenPager('pager_a', listenerA);
            ctx.listenPager('pager_b', listenerB);

            regA.update(makeData({ instId: 'A', currentItem: 1 }));
            regB.update(makeData({ instId: 'B', currentItem: 9 }));

            expect(listenerA).toHaveBeenCalledTimes(1);
            expect(listenerA.mock.calls[0][0].instId).toBe('A');
            expect(listenerB).toHaveBeenCalledTimes(1);
            expect(listenerB.mock.calls[0][0].instId).toBe('B');
        });

        it('undefined pager_id is a valid key', () => {
            const ctx = getProviderValue();
            const reg = ctx.registerPager(undefined);
            const listener = jest.fn();
            ctx.listenPager(undefined, listener);
            reg.update(makeData({ instId: 'no-id' }));

            expect(listener).toHaveBeenCalledTimes(1);
        });

        it('undefined and string pager_ids are independent keys', () => {
            const ctx = getProviderValue();
            const regUndef = ctx.registerPager(undefined);
            const regStr = ctx.registerPager('pager_1');
            const listenerUndef = jest.fn();
            const listenerStr = jest.fn();
            ctx.listenPager(undefined, listenerUndef);
            ctx.listenPager('pager_1', listenerStr);

            regUndef.update(makeData({ instId: 'undef' }));
            expect(listenerUndef).toHaveBeenCalledTimes(1);
            expect(listenerStr).not.toHaveBeenCalled();

            regStr.update(makeData({ instId: 'str' }));
            expect(listenerStr).toHaveBeenCalledTimes(1);
        });
    });

    describe('listener errors', () => {
        it('an error in one listener does not stop others from receiving the update', () => {
            const ctx = getProviderValue();
            const reg = ctx.registerPager('pager_1');
            const bad = jest.fn(() => {
                throw new Error('boom');
            });
            const good = jest.fn();
            ctx.listenPager('pager_1', bad);
            ctx.listenPager('pager_1', good);

            // Silence expected console.error from the provider's safety net.
            const errSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
            reg.update(makeData({ currentItem: 1 }));
            errSpy.mockRestore();

            expect(bad).toHaveBeenCalledTimes(1);
            expect(good).toHaveBeenCalledTimes(1);
        });
    });

    describe('scrollToPagerItem replay', () => {
        it('subscriber can call scrollToPagerItem from replayed snapshot', () => {
            const ctx = getProviderValue();
            const reg = ctx.registerPager('pager_1');
            const scrollSpy = jest.fn();
            reg.update(makeData({ currentItem: 2, scrollToPagerItem: scrollSpy }));

            const listener = jest.fn();
            ctx.listenPager('pager_1', listener);

            const replayed: PagerData = listener.mock.calls[0][0];
            replayed.scrollToPagerItem(7);

            expect(scrollSpy).toHaveBeenCalledWith(7);
        });
    });
});
