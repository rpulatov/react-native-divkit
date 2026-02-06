import React, { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivContainerData, ContainerOrientation } from '../../types/container';
import type { ContentAlignmentHorizontal, ContentAlignmentVertical } from '../../types/alignment';
import { Outer } from '../utilities/Outer';
import { DivComponent } from '../DivComponent';
import { useDerivedFromVarsSimple } from '../../hooks/useDerivedFromVars';
import { useDivKitContext } from '../../context/DivKitContext';

export interface DivContainerProps {
    componentContext: ComponentContext<DivContainerData>;
}

/**
 * DivContainer component - renders a flex container with child items
 * MVP implementation with basic features:
 * - Vertical/horizontal/overlap orientation
 * - Content alignment (horizontal & vertical)
 * - Item spacing (gap)
 * - Flex layout with proper alignment
 *
 * Deferred for post-MVP:
 * - Wrap layout mode
 * - Separators (show_at_start, show_between, show_at_end)
 * - Line separators (for wrap mode)
 * - Aspect ratio constraints
 * - Item builder (dynamic items from data)
 * - Clip to bounds
 *
 * Based on Web Container.svelte
 */
export function DivContainer({ componentContext }: DivContainerProps) {
    const { direction } = useDivKitContext();
    const { json, variables } = componentContext;

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

    const itemSpacing = useDerivedFromVarsSimple<number>(
        json.item_spacing || 0,
        variables || new Map()
    );

    // Build container style
    const containerStyle = useMemo((): ViewStyle => {
        const style: ViewStyle = {
            display: 'flex'
        };

        // Orientation -> flexDirection
        if (orientation === 'horizontal') {
            style.flexDirection = 'row';
        } else if (orientation === 'vertical') {
            style.flexDirection = 'column';
        } else if (orientation === 'overlap') {
            // Overlap is like CSS position: relative with absolute children
            // In React Native, this is achieved differently
            // For MVP, we'll use a simple approach with View
            style.position = 'relative';
        }

        // Content alignment horizontal
        // Maps to justifyContent for row, alignItems for column
        if (orientation === 'horizontal') {
            // Horizontal orientation: content_alignment_horizontal -> justifyContent
            style.justifyContent = mapContentAlignmentToJustify(contentAlignmentHorizontal, direction);
            // content_alignment_vertical -> alignItems (cross axis)
            style.alignItems = mapContentAlignmentToAlign(contentAlignmentVertical);
        } else if (orientation === 'vertical') {
            // Vertical orientation: content_alignment_vertical -> justifyContent
            style.justifyContent = mapContentAlignmentToJustify(contentAlignmentVertical, direction);
            // content_alignment_horizontal -> alignItems (cross axis)
            style.alignItems = mapContentAlignmentToAlign(contentAlignmentHorizontal, direction);
        }

        // Item spacing (gap between items)
        // React Native 0.71+ supports gap property
        if (itemSpacing && itemSpacing > 0 && orientation !== 'overlap') {
            style.gap = itemSpacing;
        }

        return style;
    }, [orientation, contentAlignmentHorizontal, contentAlignmentVertical, itemSpacing, direction]);

    // For overlap mode, we need to position children absolutely
    const childWrapperStyle = useMemo((): ViewStyle | undefined => {
        if (orientation === 'overlap') {
            return {
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
            };
        }
        return undefined;
    }, [orientation]);

    // Render children
    // We'll import DivComponent dynamically or assume it's available
    // For now, we'll use a placeholder and fix this in the integration phase
    const renderChildren = () => {
        if (!json.items || json.items.length === 0) {
            return null;
        }

        return json.items.map((item, index) => {
            const childContext = componentContext.produceChildContext(item, {
                path: index,
            });

            if (!childContext) {
                return null;
            }

            const child = (
                <DivComponent
                    key={item.id || `item-${index}`}
                    componentContext={childContext}
                />
            );

            // Wrap in positioned View for overlap mode
            if (orientation === 'overlap' && childWrapperStyle) {
                return (
                    <View key={item.id || `item-${index}`} style={childWrapperStyle}>
                        {child}
                    </View>
                );
            }

            return child;
        });
    };

    return (
        <Outer componentContext={componentContext}>
            <View style={containerStyle}>
                {renderChildren()}
            </View>
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
