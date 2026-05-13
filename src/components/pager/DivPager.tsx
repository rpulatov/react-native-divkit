import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import {
    View,
    ScrollView,
    NativeScrollEvent,
    NativeSyntheticEvent,
    LayoutChangeEvent,
    StyleSheet
} from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivPagerData, PagerOrientation } from '../../types/pager';
import type { PagerData, PagerRegisterData } from '../../types/componentContext';
import { Outer } from '../utilities/Outer';
import { DivComponent } from '../DivComponent';
import { useDerivedFromVarsSimple } from '../../hooks/useDerivedFromVars';
import { useDivKitContext } from '../../context/DivKitContext';
import { usePagerContextOptional } from '../../context/PagerContext';
import { wrapError } from '../../utils/wrapError';
import {
    DUPLICATES_IN_INFINITE,
    buildRenderedItems,
    computeContentPad,
    computePageSize,
    isInDuplicateRegion as isInDuplicateRegionFn,
    isInfiniteEnabled,
    offsetToPosition,
    positionToReal as positionToRealFn,
    realToPosition as realToPositionFn,
    type ScrollAxisAlignment
} from './utils';

export interface DivPagerProps {
    componentContext: ComponentContext<DivPagerData>;
}

const DUPLICATES = DUPLICATES_IN_INFINITE;

/**
 * DivPager — horizontal/vertical pager with snap-to-page scrolling.
 *
 * Based on Web Pager.svelte. Adapted for React Native:
 * - Uses ScrollView with snapToInterval for paging behaviour.
 * - Computes per-page size from layout_mode (fixed neighbour, percentage,
 *   wrap_content) once container size is known.
 * - infinite_scroll: renders DUPLICATES extra items at each end; when the user
 *   lands on a duplicate the scroll position is silently snapped to the
 *   matching real item (no animation), giving a seamless loop.
 * - Exposes its current page/size to indicators via PagerContext using the
 *   same registerPager/listenPager contract as Web. The "currentItem" reported
 *   to indicators is always the real index in [0, items.length).
 */
export function DivPager({ componentContext }: DivPagerProps) {
    const { genId } = useDivKitContext();
    const pagerCtx = usePagerContextOptional();
    const { json, variables } = componentContext;

    const orientation = useDerivedFromVarsSimple<PagerOrientation>(
        (json.orientation as PagerOrientation) || 'horizontal',
        variables || new Map()
    );
    const layoutMode = useDerivedFromVarsSimple<any>(
        json.layout_mode,
        variables || new Map()
    );
    const itemSpacingObj = useDerivedFromVarsSimple(json.item_spacing, variables || new Map());
    const paddings = useDerivedFromVarsSimple(json.paddings, variables || new Map());
    const scrollAxisAlignment = useDerivedFromVarsSimple(
        json.scroll_axis_alignment || 'center',
        variables || new Map()
    );
    const defaultItem = useDerivedFromVarsSimple<number>(
        typeof json.default_item === 'number' ? json.default_item : 0,
        variables || new Map()
    );
    const infiniteScroll = useDerivedFromVarsSimple<number | boolean | undefined>(
        json.infinite_scroll,
        variables || new Map()
    );

    const isHorizontal = orientation !== 'vertical';
    const itemSpacing = (itemSpacingObj as { value?: number } | undefined)?.value ?? 0;

    const items = useMemo(() => {
        return Array.isArray(json.items) ? json.items : [];
    }, [json.items]);

    const isInfinite = useMemo(
        () => isInfiniteEnabled(infiniteScroll, items.length),
        [infiniteScroll, items.length]
    );

    // Pager paddings — applied on the inner ScrollView so we can also use them
    // for snap math. Outer should NOT also apply them, so we strip them from
    // the json passed into Outer below.
    const innerPadStart = useMemo(() => {
        const p = (paddings as any) || {};
        if (isHorizontal) {
            return Number(p.start ?? p.left ?? 0) || 0;
        }
        return Number(p.top ?? 0) || 0;
    }, [paddings, isHorizontal]);
    const innerPadEnd = useMemo(() => {
        const p = (paddings as any) || {};
        if (isHorizontal) {
            return Number(p.end ?? p.right ?? 0) || 0;
        }
        return Number(p.bottom ?? 0) || 0;
    }, [paddings, isHorizontal]);

    const [containerSize, setContainerSize] = useState(0);
    const scrollRef = useRef<ScrollView>(null);
    const currentItemRef = useRef(0); // real index, always in [0, items.length)
    const initialScrollDone = useRef(false);
    const registerDataRef = useRef<PagerRegisterData | null>(null);
    const pagerInstId = useRef<string>(genId('pager'));

    const pageSize = useMemo(
        () =>
            computePageSize({
                containerSize,
                layoutMode,
                scrollAxisAlignment: scrollAxisAlignment as ScrollAxisAlignment,
                itemSpacing,
                innerPadStart,
                innerPadEnd
            }),
        [containerSize, innerPadStart, innerPadEnd, layoutMode, scrollAxisAlignment, itemSpacing]
    );

    const snapInterval = pageSize > 0 ? pageSize + itemSpacing : 0;

    const contentPad = useMemo(
        () =>
            computeContentPad({
                containerSize,
                pageSize,
                innerPadStart,
                innerPadEnd,
                layoutMode,
                scrollAxisAlignment: scrollAxisAlignment as ScrollAxisAlignment,
                itemSpacing,
                isInfinite
            }),
        [
            containerSize,
            pageSize,
            innerPadStart,
            innerPadEnd,
            layoutMode,
            scrollAxisAlignment,
            itemSpacing,
            isInfinite
        ]
    );

    const realToPosition = useCallback(
        (realIdx: number) => realToPositionFn(realIdx, isInfinite, DUPLICATES),
        [isInfinite]
    );

    const positionToReal = useCallback(
        (pos: number) => positionToRealFn(pos, isInfinite, items.length, DUPLICATES),
        [isInfinite, items.length]
    );

    const isInDuplicateRegion = useCallback(
        (pos: number) => isInDuplicateRegionFn(pos, isInfinite, items.length, DUPLICATES),
        [isInfinite, items.length]
    );

    const runSelectedActions = useCallback(
        (index: number) => {
            const item = items[index] as any;
            const actions = item?.selected_actions;
            if (Array.isArray(actions) && actions.length > 0) {
                componentContext.execAnyActions(actions);
            }
        },
        [items, componentContext]
    );

    const scrollToItem = useCallback(
        (realIndex: number, animated: boolean) => {
            const node = scrollRef.current;
            if (!node || snapInterval <= 0 || items.length === 0) return;
            const clampedReal = isInfinite
                ? ((realIndex % items.length) + items.length) % items.length
                : Math.max(0, Math.min(items.length - 1, realIndex));
            const pos = realToPosition(clampedReal);
            const offset = pos * snapInterval;
            if (isHorizontal) {
                node.scrollTo({ x: offset, y: 0, animated });
            } else {
                node.scrollTo({ x: 0, y: offset, animated });
            }
            if (clampedReal !== currentItemRef.current) {
                currentItemRef.current = clampedReal;
                pushPagerState(clampedReal);
                runSelectedActions(clampedReal);
            }
        },
        // pushPagerState is hoisted via closure (defined right below).
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [items.length, snapInterval, isHorizontal, isInfinite, realToPosition, runSelectedActions]
    );

    const pushPagerState = useCallback(
        (item: number) => {
            const reg = registerDataRef.current;
            if (!reg) return;
            const data: PagerData = {
                instId: pagerInstId.current,
                size: items.length,
                currentItem: item,
                scrollToPagerItem: (index: number) => scrollToItem(index, true)
            };
            reg.update(data);
        },
        [items.length, scrollToItem]
    );

    // Register pager in context (so indicators can find it)
    useEffect(() => {
        if (!pagerCtx) return;
        const pagerId = json.id;
        const reg = pagerCtx.registerPager(pagerId);
        registerDataRef.current = reg;
        pushPagerState(currentItemRef.current);
        return () => {
            reg.destroy();
            registerDataRef.current = null;
        };
    }, [pagerCtx, json.id, pushPagerState]);

    // Re-broadcast on items length / scrollToItem changes
    useEffect(() => {
        pushPagerState(currentItemRef.current);
    }, [pushPagerState]);

    // Initial scroll to default_item once we know page size
    useEffect(() => {
        if (initialScrollDone.current) return;
        if (snapInterval <= 0) return;
        const initial = Math.max(0, Math.min(items.length - 1, defaultItem ?? 0));
        currentItemRef.current = initial;
        const id = setTimeout(() => {
            scrollToItem(initial, false);
            initialScrollDone.current = true;
            pushPagerState(initial);
        }, 0);
        return () => clearTimeout(id);
    }, [snapInterval, defaultItem, items.length, scrollToItem, pushPagerState]);

    const onScrollEnd = useCallback(
        (event: NativeSyntheticEvent<NativeScrollEvent>) => {
            if (snapInterval <= 0) return;
            const { contentOffset } = event.nativeEvent;
            const offset = isHorizontal ? contentOffset.x : contentOffset.y;
            const pos = offsetToPosition(offset, snapInterval);
            const realIdx = positionToReal(pos);

            // In infinite mode: silently snap from a duplicate back to the
            // matching real item without animation.
            if (isInfinite && isInDuplicateRegion(pos)) {
                const realPos = realToPosition(realIdx);
                const node = scrollRef.current;
                if (node) {
                    const realOffset = realPos * snapInterval;
                    if (isHorizontal) {
                        node.scrollTo({ x: realOffset, y: 0, animated: false });
                    } else {
                        node.scrollTo({ x: 0, y: realOffset, animated: false });
                    }
                }
            }

            if (realIdx !== currentItemRef.current) {
                currentItemRef.current = realIdx;
                pushPagerState(realIdx);
                runSelectedActions(realIdx);
            }
        },
        [
            snapInterval,
            isHorizontal,
            positionToReal,
            isInDuplicateRegion,
            isInfinite,
            realToPosition,
            pushPagerState,
            runSelectedActions
        ]
    );

    const onLayout = useCallback(
        (e: LayoutChangeEvent) => {
            const size = isHorizontal ? e.nativeEvent.layout.width : e.nativeEvent.layout.height;
            if (size && Math.abs(size - containerSize) > 0.5) {
                setContainerSize(size);
            }
        },
        [containerSize, isHorizontal]
    );

    // Strip paddings from Outer — we apply them on the ScrollView ourselves.
    const outerContext = useMemo(() => {
        const restJson = { ...(json as any) };
        delete restJson.paddings;
        return { ...componentContext, json: restJson } as ComponentContext<DivPagerData>;
    }, [componentContext, json]);

    const renderedItems = useMemo(
        () => buildRenderedItems(items, isInfinite, DUPLICATES),
        [items, isInfinite]
    );

    if (!json.layout_mode) {
        componentContext.logError(
            wrapError(new Error('Empty "layout_mode" prop for div "pager"'))
        );
        return null;
    }

    const renderItems = () => {
        if (!renderedItems.length || pageSize <= 0) return null;
        return renderedItems.map((entry, posIndex) => {
            const childContext = componentContext.produceChildContext(entry.item, {
                path: posIndex
            });
            const isLast = posIndex === renderedItems.length - 1;
            const itemStyle = isHorizontal
                ? { width: pageSize, marginRight: isLast ? 0 : itemSpacing }
                : { height: pageSize, marginBottom: isLast ? 0 : itemSpacing };
            return (
                <View key={entry.key} style={[styles.itemWrapper, itemStyle]}>
                    <DivComponent componentContext={childContext} />
                </View>
            );
        });
    };

    return (
        <Outer componentContext={outerContext}>
            <View style={styles.fill} onLayout={onLayout}>
                {pageSize > 0 ? (
                    <ScrollView
                        ref={scrollRef}
                        horizontal={isHorizontal}
                        showsHorizontalScrollIndicator={false}
                        showsVerticalScrollIndicator={false}
                        decelerationRate="fast"
                        snapToInterval={snapInterval}
                        snapToAlignment="start"
                        disableIntervalMomentum
                        onMomentumScrollEnd={onScrollEnd}
                        onScrollEndDrag={onScrollEnd}
                        scrollEventThrottle={16}
                        contentContainerStyle={
                            isHorizontal
                                ? { paddingLeft: contentPad.start, paddingRight: contentPad.end }
                                : { paddingTop: contentPad.start, paddingBottom: contentPad.end }
                        }
                        style={styles.fill}
                    >
                        {renderItems()}
                    </ScrollView>
                ) : null}
            </View>
        </Outer>
    );
}

const styles = StyleSheet.create({
    fill: {
        flex: 1,
        alignSelf: 'stretch'
    },
    itemWrapper: {
        overflow: 'hidden'
    }
});
