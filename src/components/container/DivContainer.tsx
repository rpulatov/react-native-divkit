import React, { useCallback, useMemo, useRef, useState } from 'react';
import { View, ViewStyle } from 'react-native';
import type { DivBase } from '../../../typings/common';
import type { ComponentContext } from '../../types/componentContext';
import type { DivContainerData, ContainerOrientation } from '../../types/container';
import type { ContentAlignmentHorizontal, ContentAlignmentVertical } from '../../types/alignment';
import type { LayoutParams } from '../../types/layoutParams';
import { Outer } from '../utilities/Outer';
import { DivComponent } from '../DivComponent';
import { useDerivedFromVarsSimple } from '../../hooks/useDerivedFromVars';
import { useParentOf } from '../../hooks/useParentOf';
import { useDivKitContext } from '../../context/DivKitContext';
import { LayoutParamsContext } from '../../context/LayoutParamsContext';

export interface DivContainerProps {
    componentContext: ComponentContext<DivContainerData>;
}

/**
 * DivContainer component - renders a flex container with child items
 * Based on Web Container.svelte
 */
export function DivContainer({ componentContext }: DivContainerProps) {
    const { direction } = useDivKitContext();
    const { json, variables } = componentContext;

    // applyPatch support: patched items override json.items until the document
    // itself is replaced (setData/new json identity resets the override).
    // Mirrors Web Container.svelte replaceItems, which rewrites componentContext.json.
    const [itemsOverride, setItemsOverride] = useState<DivBase[] | null>(null);
    const prevJsonRef = useRef(json);
    if (prevJsonRef.current !== json) {
        prevJsonRef.current = json;
        if (itemsOverride !== null) {
            setItemsOverride(null);
        }
    }

    const items = useMemo(
        () => itemsOverride ?? (Array.isArray(json.items) ? json.items : []),
        [itemsOverride, json.items]
    );

    const parentOfItems = useMemo(
        () => items.map(item => ({
            json: item,
            id: (item as { id?: string } | undefined)?.id
        })),
        [items]
    );

    const replaceItems = useCallback((newItems: (DivBase | undefined)[]) => {
        setItemsOverride(newItems.filter(Boolean) as DivBase[]);
    }, []);

    useParentOf(parentOfItems, replaceItems);

    // Reactive properties
    const orientation = useDerivedFromVarsSimple<ContainerOrientation>(
        json.orientation || 'vertical',
        variables || new Map()
    );

    const contentAlignmentHorizontal = useDerivedFromVarsSimple<ContentAlignmentHorizontal>(
        json.content_alignment_horizontal || 'start',
        variables || new Map()
    );

    const contentAlignmentVertical = useDerivedFromVarsSimple<ContentAlignmentVertical>(
        json.content_alignment_vertical || 'top',
        variables || new Map()
    );

    const itemSpacing = useDerivedFromVarsSimple<number>(json.item_spacing || 0, variables || new Map());

    // Build container style — passed to Outer via style prop
    // Outer's View becomes the flex container directly (Background is absolute-positioned)
    const containerStyle = useMemo((): ViewStyle => {
        const style: ViewStyle = {};

        // Orientation -> flexDirection
        if (orientation === 'horizontal') {
            style.flexDirection = 'row';
        } else if (orientation === 'vertical') {
            style.flexDirection = 'column';
        } else if (orientation === 'overlap') {
            style.position = 'relative';
        }

        // Content alignment
        if (orientation === 'horizontal') {
            style.justifyContent = mapContentAlignmentToJustify(contentAlignmentHorizontal, direction);
            style.alignItems = mapContentAlignmentToAlign(contentAlignmentVertical);
        } else if (orientation === 'vertical') {
            style.justifyContent = mapContentAlignmentToJustify(contentAlignmentVertical, direction);
            style.alignItems = mapContentAlignmentToAlign(contentAlignmentHorizontal, direction);
        }

        // Item spacing
        if (itemSpacing && itemSpacing > 0 && orientation !== 'overlap') {
            style.gap = itemSpacing;
        }

        return style;
    }, [orientation, contentAlignmentHorizontal, contentAlignmentVertical, itemSpacing, direction]);

    // LayoutParams for children — tells Outer how to handle flex sizing
    const childLayoutParams = useMemo((): LayoutParams => {
        const params: LayoutParams = {};

        if (orientation === 'overlap') {
            params.overlapParent = true;
        }

        if (orientation === 'horizontal') {
            params.parentContainerOrientation = 'horizontal';
            // If this horizontal container wraps its own content, children with default
            // (match_parent) width should NOT use flexGrow — they should wrap their content too.
            if ((json as any).width?.type === 'wrap_content') {
                params.parentHorizontalWrapContent = true;
            }
        } else if (orientation === 'vertical') {
            params.parentContainerOrientation = 'vertical';
        }

        // Pass parent alignment to children (same logic as Web Container.svelte)
        const hAlignMap: Record<string, 'start' | 'center' | 'end'> = {
            start: 'start', left: 'start', center: 'center', end: 'end', right: 'end',
            'space-between': 'start', 'space-around': 'start', 'space-evenly': 'start'
        };
        const vAlignMap: Record<string, 'start' | 'center' | 'end' | 'baseline'> = {
            start: 'start', top: 'start', center: 'center', end: 'end', bottom: 'end', baseline: 'baseline',
            'space-between': 'start', 'space-around': 'start', 'space-evenly': 'start'
        };

        if (orientation !== 'horizontal') {
            params.parentHAlign = hAlignMap[contentAlignmentHorizontal as string] || 'start';
        }
        if (orientation !== 'vertical') {
            params.parentVAlign = vAlignMap[contentAlignmentVertical as string] || 'start';
        }

        return params;
    }, [orientation, contentAlignmentHorizontal, contentAlignmentVertical]);

    // For overlap mode, build a per-child absolute wrapper style
    // justifyContent / alignItems position the child within the full-area overlay
    const getOverlapWrapperStyle = useMemo(() => {
        if (orientation !== 'overlap') return undefined;

        return (item: any): ViewStyle => {
            // Child's own alignment takes priority over container's content alignment
            const alignV: string = item.alignment_vertical || contentAlignmentVertical || 'top';
            const alignH: string = item.alignment_horizontal || contentAlignmentHorizontal || 'start';
            return {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                flexDirection: 'column',
                justifyContent: mapContentAlignmentToJustify(alignV as any, direction),
                alignItems: mapContentAlignmentToAlign(alignH as any, direction),
            };
        };
    }, [orientation, contentAlignmentVertical, contentAlignmentHorizontal, direction]);

    // When the overlap container has a definite height (match_parent or fixed), all children
    // must be absolutely positioned so they don't contribute to the container's minimum size.
    // This matches the Web behaviour where stretchHeight prevents children from sizing the parent.
    // When height is wrap_content (or unset), the first child stays in normal flow to give
    // the container its intrinsic height.
    const overlapAllAbsolute = orientation === 'overlap' &&
        (json.height?.type === 'match_parent' || json.height?.type === 'fixed');

    const renderChildren = () => {
        if (items.length === 0) {
            return null;
        }

        return items.map((item, index) => {
            const childContext = componentContext.produceChildContext(item, {
                path: index
            });

            if (!childContext) {
                return null;
            }

            const itemKey = (item as { id?: string }).id || `item-${index}`;
            const child = <DivComponent key={itemKey} componentContext={childContext} />;

            // Wrap in positioned View for overlap mode.
            // When the container has a definite height (match_parent/fixed), ALL children are
            // absolutely positioned so they don't push the container beyond its allocated size.
            // When height is wrap_content, only subsequent children (index > 0) are absolute;
            // the first child stays in normal flow to establish the container's intrinsic height.
            if (orientation === 'overlap' && (overlapAllAbsolute || index > 0) && getOverlapWrapperStyle) {
                return (
                    <View key={itemKey} style={getOverlapWrapperStyle(item)}>
                        {child}
                    </View>
                );
            }

            return child;
        });
    };

    return (
        <Outer componentContext={componentContext} style={containerStyle}>
            <LayoutParamsContext.Provider value={childLayoutParams}>
                {renderChildren()}
            </LayoutParamsContext.Provider>
        </Outer>
    );
}

/**
 * Maps DivKit ContentAlignment to React Native justifyContent
 * Used for main axis alignment
 */
function mapContentAlignmentToJustify(
    alignment: ContentAlignmentHorizontal | ContentAlignmentVertical | undefined,
    _direction: 'ltr' | 'rtl' = 'ltr'
): ViewStyle['justifyContent'] {
    if (!alignment) return 'flex-start';

    switch (alignment) {
        case 'start':
        case 'left':
        case 'top':
            return 'flex-start';
        case 'center':
            return 'center';
        case 'end':
        case 'right':
        case 'bottom':
            return 'flex-end';
        case 'space-between':
            return 'space-between';
        case 'space-around':
            return 'space-around';
        case 'space-evenly':
            return 'space-evenly';
        default:
            return 'flex-start';
    }
}

/**
 * Maps DivKit ContentAlignment to React Native alignItems
 * Used for cross axis alignment
 */
function mapContentAlignmentToAlign(
    alignment: ContentAlignmentHorizontal | ContentAlignmentVertical | undefined,
    _direction: 'ltr' | 'rtl' = 'ltr'
): ViewStyle['alignItems'] {
    if (!alignment) return 'flex-start';

    switch (alignment) {
        case 'start':
        case 'left':
        case 'top':
            return 'flex-start';
        case 'center':
            return 'center';
        case 'end':
        case 'right':
        case 'bottom':
            return 'flex-end';
        case 'baseline':
            return 'baseline';
        // space-* values don't apply to cross axis
        case 'space-between':
        case 'space-around':
        case 'space-evenly':
            return 'flex-start';
        default:
            return 'flex-start';
    }
}
