import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { View, ScrollView, Pressable, StyleSheet, ViewStyle } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivIndicatorData } from '../../types/indicator';
import type { PagerData } from '../../types/componentContext';
import { Outer } from '../utilities/Outer';
import { useDerivedFromVarsSimple } from '../../hooks/useDerivedFromVars';
import { usePagerContextOptional } from '../../context/PagerContext';
import { buildDotStyles, resolvePlacement } from './utils';

export interface DivIndicatorProps {
    componentContext: ComponentContext<DivIndicatorData>;
}

/**
 * DivIndicator — page-position dots for a DivPager.
 *
 * Based on Web Indicator.svelte. Adapted for React Native:
 * - Subscribes to a pager via PagerContext (registered by DivPager).
 * - Computes active/inactive dot styles from active_shape/inactive_shape, or
 *   falls back to legacy `shape` + `active_item_size` + colors.
 * - Tap on a dot scrolls the bound pager to that page.
 * - Items_placement supports 'default' (space_between_centers) and 'stretch'
 *   (item_spacing). For unknown placements falls back to default.
 */
export function DivIndicator({ componentContext }: DivIndicatorProps) {
    const pagerCtx = usePagerContextOptional();
    const { json, variables } = componentContext;

    const shapeJson = useDerivedFromVarsSimple<any>(json.shape, variables || new Map());
    const activeShapeJson = useDerivedFromVarsSimple<any>(
        json.active_shape,
        variables || new Map()
    );
    const inactiveShapeJson = useDerivedFromVarsSimple<any>(
        json.inactive_shape,
        variables || new Map()
    );
    const activeColor = useDerivedFromVarsSimple<string | undefined>(
        json.active_item_color,
        variables || new Map()
    );
    const inactiveColor = useDerivedFromVarsSimple<string | undefined>(
        json.inactive_item_color,
        variables || new Map()
    );
    const activeItemSize = useDerivedFromVarsSimple<number | undefined>(
        json.active_item_size,
        variables || new Map()
    );
    const spaceBetweenCenters = useDerivedFromVarsSimple<any>(
        json.space_between_centers,
        variables || new Map()
    );
    const itemsPlacement = useDerivedFromVarsSimple<any>(
        json.items_placement,
        variables || new Map()
    );

    const { active: activeStyle, inactive: inactiveStyle } = useMemo(
        () =>
            buildDotStyles({
                activeShape: activeShapeJson,
                inactiveShape: inactiveShapeJson,
                legacyShape: shapeJson,
                activeColor,
                inactiveColor,
                activeItemSize
            }),
        [activeShapeJson, inactiveShapeJson, shapeJson, activeColor, inactiveColor, activeItemSize]
    );

    const { placement, gap, stretchSpacing, maxVisible } = useMemo(
        () =>
            resolvePlacement({
                itemsPlacement,
                spaceBetweenCenters,
                inactiveWidth: inactiveStyle.width
            }),
        [itemsPlacement, spaceBetweenCenters, inactiveStyle.width]
    );

    const [pagerData, setPagerData] = useState<PagerData | null>(null);
    const scrollerRef = useRef<ScrollView>(null);

    useEffect(() => {
        if (!pagerCtx) return;
        const unsubscribe = pagerCtx.listenPager(json.pager_id, (data: PagerData) => {
            setPagerData(data);
        });
        return unsubscribe;
    }, [pagerCtx, json.pager_id]);

    const onItemPress = useCallback(
        (index: number) => {
            if (!pagerData) return;
            if (index !== pagerData.currentItem) {
                pagerData.scrollToPagerItem(index);
            }
        },
        [pagerData]
    );

    if (!pagerData || pagerData.size <= 1) {
        // Match Web: indicator only shown when size > 1, but Outer still applies
        // sizing/margins. Render an empty Outer so layout (height/margins) holds.
        return <Outer componentContext={componentContext}>{null}</Outer>;
    }

    const renderDot = (index: number) => {
        const isActive = index === pagerData.currentItem;
        const dot = isActive ? activeStyle : inactiveStyle;
        const dotStyle: ViewStyle = {
            width: dot.width,
            height: dot.height,
            borderRadius: dot.borderRadius,
            backgroundColor: dot.background
        };
        const wrapperStyle: ViewStyle = {
            justifyContent: 'center',
            alignItems: 'center',
            // reserve room for the larger active dot so the row height stays stable
            width: placement === 'stretch' ? undefined : Math.max(activeStyle.width, inactiveStyle.width),
            height: Math.max(activeStyle.height, inactiveStyle.height),
            marginLeft: index === 0 ? 0 : placement === 'stretch' ? stretchSpacing : gap / 2,
            marginRight:
                index === pagerData.size - 1 ? 0 : placement === 'stretch' ? stretchSpacing : gap / 2,
            flex: placement === 'stretch' ? 1 : undefined,
            maxWidth: placement === 'stretch' && pagerData.size > maxVisible ? undefined : undefined
        };
        return (
            <Pressable
                key={`indicator-dot-${index}`}
                onPress={() => onItemPress(index)}
                style={wrapperStyle}
            >
                <View style={dotStyle} />
            </Pressable>
        );
    };

    const dots = [];
    for (let i = 0; i < pagerData.size; i++) dots.push(renderDot(i));

    const rowStyle: ViewStyle = {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: placement === 'stretch' ? 'space-between' : 'center'
    };

    return (
        <Outer componentContext={componentContext}>
            <ScrollView
                ref={scrollerRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                style={styles.scroller}
            >
                <View style={rowStyle}>{dots}</View>
            </ScrollView>
        </Outer>
    );
}

const styles = StyleSheet.create({
    scroller: {
        alignSelf: 'stretch'
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center'
    }
});
