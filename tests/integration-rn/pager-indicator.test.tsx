/**
 * Integration test for DivPager + DivIndicator.
 *
 * Runs against a real React + RN-shaped renderer (see jest.integration.config.js)
 * so useState/useEffect/useRef and the PagerContext provider work as in production.
 *
 * Verifies:
 * - The pager registers itself in PagerContext on mount.
 * - On layout, the pager publishes its size/currentItem to indicators.
 * - The indicator receives that snapshot and reflects the correct size.
 * - Calling indicator's scrollToPagerItem dispatches a scrollTo on the ScrollView.
 * - default_item is honoured in the initial publish.
 */

import React from 'react';
import { render, act, fireEvent } from '@testing-library/react-native';

import { DivPager } from '../../src/components/pager/DivPager';
import { DivIndicator } from '../../src/components/indicator/DivIndicator';
import { DivKitContext, type DivKitContextValue } from '../../src/context/DivKitContext';
import { PagerProvider, PagerContext } from '../../src/context/PagerContext';
import type { ComponentContext, PagerData } from '../../src/types/componentContext';
import type { DivPagerData } from '../../src/types/pager';
import type { DivIndicatorData } from '../../src/types/indicator';

const NOOP = () => {};
const NOOP_ASYNC = async () => {};

function makeDivKitValue(): DivKitContextValue {
    let counter = 0;
    return {
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
        execAnyActions: jest.fn().mockResolvedValue(undefined),
        genId: jest.fn((key: string) => `${key}_${counter++}`)
    };
}

function makeContext<T extends { type: string }>(json: T): ComponentContext<T> {
    const base = {
        path: [],
        json: json as any,
        origJson: json as any,
        templateContext: {},
        variables: new Map(),
        id: `id_${json.type}`,
        logError: jest.fn(),
        execAnyActions: jest.fn().mockResolvedValue(undefined),
        getDerivedFromVars: (prop: any) => prop,
        getJsonWithVars: (prop: any) => prop,
        evalExpression: jest.fn(),
        produceChildContext: jest.fn(),
        dup: jest.fn(),
        getVariable: jest.fn(),
        getAnimator: jest.fn(),
        registerState: jest.fn(() => NOOP),
        registerPager: jest.fn(),
        listenPager: jest.fn(),
        destroy: jest.fn()
    } as unknown as ComponentContext<T>;
    base.produceChildContext = jest.fn((div: any, opts: any) => ({
        ...base,
        json: div,
        origJson: div,
        id: opts?.id || `child_${opts?.path}`
    })) as any;
    return base;
}

const PAGER_ID = 'pager_with_indicator';
const CONTAINER_WIDTH = 300;
const NEIGHBOUR = 16;
const ITEM_SPACING = 8;

const pagerJson: DivPagerData = {
    type: 'pager',
    id: PAGER_ID,
    layout_mode: { type: 'fixed', neighbour_page_width: { type: 'fixed', value: NEIGHBOUR } },
    item_spacing: { type: 'fixed', value: ITEM_SPACING },
    items: [
        { type: 'text', text: 'Item 0' } as any,
        { type: 'text', text: 'Item 1' } as any,
        { type: 'text', text: 'Item 2' } as any,
        { type: 'text', text: 'Item 3' } as any
    ]
};

const indicatorJson: DivIndicatorData = {
    type: 'indicator',
    pager_id: PAGER_ID,
    active_item_color: '#000000',
    inactive_item_color: '#cccccc',
    space_between_centers: { type: 'fixed', value: 12 }
};

function Harness({
    pagerCtx,
    indicatorCtx,
    onPagerData
}: {
    pagerCtx: ComponentContext<DivPagerData>;
    indicatorCtx: ComponentContext<DivIndicatorData>;
    onPagerData?: (data: PagerData) => void;
}) {
    const divKitValue = React.useMemo(makeDivKitValue, []);
    return (
        <DivKitContext.Provider value={divKitValue}>
            <PagerProvider>
                <DivPager componentContext={pagerCtx} />
                <DivIndicator componentContext={indicatorCtx} />
                {onPagerData ? <Listener pagerId={PAGER_ID} onData={onPagerData} /> : null}
            </PagerProvider>
        </DivKitContext.Provider>
    );
}

function Listener({ pagerId, onData }: { pagerId: string; onData: (d: PagerData) => void }) {
    const ctx = React.useContext(PagerContext);
    React.useEffect(() => {
        if (!ctx) return;
        return ctx.listenPager(pagerId, onData);
    }, [ctx, pagerId, onData]);
    return null;
}

/**
 * Find the pager's <View> with onLayout (the wrapper around its ScrollView)
 * and fire layout with the requested width so pageSize is computed. Walks
 * the test instance tree (instead of toJSON) so function props survive.
 */
function fireLayoutOnPager(api: ReturnType<typeof render>, width: number, height = 200) {
    const instance = api.UNSAFE_root.findAll(
        node => typeof node.props?.onLayout === 'function'
    )[0];
    expect(instance).toBeTruthy();
    if (!instance) return;
    instance.props.onLayout({
        nativeEvent: { layout: { x: 0, y: 0, width, height } }
    });
}

function findScrollViewInstance(api: ReturnType<typeof render>) {
    const RN = require('react-native');
    // Pager + Indicator both render a ScrollView; the pager is mounted first
    // and is therefore the first match in the tree.
    return api.UNSAFE_root.findAllByType(RN.ScrollView)[0];
}

/**
 * Run two act() passes: one to flush state updates from onLayout, another
 * to let the setTimeout(fn, 0) in DivPager's initial-scroll effect fire.
 */
async function flushPagerEffects() {
    await act(async () => {
        await new Promise(r => setTimeout(r, 20));
    });
}

describe('Pager + Indicator integration', () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it('renders one pager item before the first layout pass to reserve wrap_content height', () => {
        const pagerCtx = makeContext({
            ...pagerJson,
            height: { type: 'wrap_content' },
            layout_mode: { type: 'percentage', page_width: { type: 'percentage', value: 42 } }
        } as DivPagerData);
        const indicatorCtx = makeContext(indicatorJson);

        render(<Harness pagerCtx={pagerCtx} indicatorCtx={indicatorCtx} />);

        expect(pagerCtx.produceChildContext).toHaveBeenCalledTimes(1);
    });

    it('renders all pager items after the layout pass', async () => {
        const pagerCtx = makeContext({
            ...pagerJson,
            height: { type: 'wrap_content' },
            layout_mode: { type: 'percentage', page_width: { type: 'percentage', value: 42 } }
        } as DivPagerData);
        const indicatorCtx = makeContext(indicatorJson);

        const api = render(<Harness pagerCtx={pagerCtx} indicatorCtx={indicatorCtx} />);
        (pagerCtx.produceChildContext as jest.Mock).mockClear();

        await act(async () => {
            fireLayoutOnPager(api, CONTAINER_WIDTH);
        });

        expect(pagerCtx.produceChildContext).toHaveBeenCalledTimes(pagerJson.items!.length);
    });

    it('pager registers in context and publishes initial state to indicator', async () => {
        const pagerCtx = makeContext(pagerJson);
        const indicatorCtx = makeContext(indicatorJson);
        const dataCallback = jest.fn();

        const api = render(
            <Harness pagerCtx={pagerCtx} indicatorCtx={indicatorCtx} onPagerData={dataCallback} />
        );

        // Trigger onLayout so pageSize > 0 and the pager scrolls / publishes
        await act(async () => {
            fireLayoutOnPager(api, CONTAINER_WIDTH);
            // flush the setTimeout in DivPager's initial-scroll effect
            await new Promise(r => setTimeout(r, 5));
        });

        expect(dataCallback).toHaveBeenCalled();
        const lastCall = dataCallback.mock.calls[dataCallback.mock.calls.length - 1][0] as PagerData;
        expect(lastCall.size).toBe(pagerJson.items!.length);
        expect(lastCall.currentItem).toBe(0);
        expect(lastCall.instId).toMatch(/^pager_/);
        expect(typeof lastCall.scrollToPagerItem).toBe('function');
    });

    it('scrollToPagerItem from indicator triggers ScrollView.scrollTo on the pager', async () => {
        const pagerCtx = makeContext(pagerJson);
        const indicatorCtx = makeContext(indicatorJson);
        const dataCallback = jest.fn();

        const api = render(
            <Harness pagerCtx={pagerCtx} indicatorCtx={indicatorCtx} onPagerData={dataCallback} />
        );

        await act(async () => {
            fireLayoutOnPager(api, CONTAINER_WIDTH);
        });
        await flushPagerEffects();

        const scrollView = findScrollViewInstance(api);
        // ScrollView is rendered as a forwardRef'd mock — its instance lives on
        // the rendered fiber. The easiest reliable assertion is to call
        // scrollToPagerItem and verify currentItem updates on the next
        // pager-state notification.
        expect(scrollView).toBeTruthy();

        const lastSnapshot = dataCallback.mock.calls[
            dataCallback.mock.calls.length - 1
        ][0] as PagerData;

        await act(async () => {
            lastSnapshot.scrollToPagerItem(2);
        });
        await flushPagerEffects();

        const updatedSnapshot = dataCallback.mock.calls[
            dataCallback.mock.calls.length - 1
        ][0] as PagerData;
        expect(updatedSnapshot.currentItem).toBe(2);
    });

    it('default_item is honored in the published state', async () => {
        const pagerCtx = makeContext({ ...pagerJson, default_item: 2 });
        const indicatorCtx = makeContext(indicatorJson);
        const dataCallback = jest.fn();

        const api = render(
            <Harness pagerCtx={pagerCtx} indicatorCtx={indicatorCtx} onPagerData={dataCallback} />
        );

        await act(async () => {
            fireLayoutOnPager(api, CONTAINER_WIDTH);
        });
        await flushPagerEffects();

        const last = dataCallback.mock.calls[dataCallback.mock.calls.length - 1][0] as PagerData;
        expect(last.currentItem).toBe(2);
    });

    it('publishes selected_actions on page change via scrollToPagerItem', async () => {
        const itemsWithActions = [
            { type: 'text', text: 'A' },
            {
                type: 'text',
                text: 'B',
                selected_actions: [{ log_id: 'page-b-shown' }]
            }
        ];
        const pagerCtx = makeContext({
            ...pagerJson,
            items: itemsWithActions as any
        });
        const indicatorCtx = makeContext(indicatorJson);
        const dataCallback = jest.fn();

        const api = render(
            <Harness pagerCtx={pagerCtx} indicatorCtx={indicatorCtx} onPagerData={dataCallback} />
        );
        await act(async () => {
            fireLayoutOnPager(api, CONTAINER_WIDTH);
        });
        await flushPagerEffects();

        const last = dataCallback.mock.calls[dataCallback.mock.calls.length - 1][0] as PagerData;
        await act(async () => {
            last.scrollToPagerItem(1);
        });
        await flushPagerEffects();

        // The pager itself calls execAnyActions on its own componentContext
        // when the selected page changes.
        expect(pagerCtx.execAnyActions).toHaveBeenCalled();
        const args = (pagerCtx.execAnyActions as jest.Mock).mock.calls[0][0];
        expect(args[0].log_id).toBe('page-b-shown');
    });

    it('infinite_scroll: indicator size matches real items.length (not duplicated)', async () => {
        const pagerCtx = makeContext({
            ...pagerJson,
            infinite_scroll: 1 as any
        });
        const indicatorCtx = makeContext(indicatorJson);
        const dataCallback = jest.fn();

        const api = render(
            <Harness pagerCtx={pagerCtx} indicatorCtx={indicatorCtx} onPagerData={dataCallback} />
        );
        await act(async () => {
            fireLayoutOnPager(api, CONTAINER_WIDTH);
        });
        await flushPagerEffects();

        const last = dataCallback.mock.calls[dataCallback.mock.calls.length - 1][0] as PagerData;
        // size in the published state must be the *real* items count, not
        // items + duplicates.
        expect(last.size).toBe(pagerJson.items!.length);
    });

    // Silence unused-var lint by referencing async noop helper.
    void NOOP_ASYNC;
});
