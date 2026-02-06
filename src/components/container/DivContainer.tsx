import React, { useMemo } from 'react';
import { View, ViewStyle } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivContainerData, ContainerOrientation } from '../../types/container';
import type { ContentAlignmentHorizontal, ContentAlignmentVertical } from '../../types/alignment';
import type { LayoutParams } from '../../types/layoutParams';
import { Outer } from '../utilities/Outer';
import { DivComponent } from '../DivComponent';
import { useDerivedFromVarsSimple } from '../../hooks/useDerivedFromVars';
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
        } else if (orientation === 'vertical') {
            params.parentContainerOrientation = 'vertical';
        }

        return params;
    }, [orientation]);

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

    const renderChildren = () => {
        if (!json.items || json.items.length === 0) {
            return null;
        }

        return json.items.map((item, index) => {
            const childContext = componentContext.produceChildContext(item, {
                path: index
            });

            if (!childContext) {
                return null;
            }

            const child = <DivComponent key={item.id || `item-${index}`} componentContext={childContext} />;

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
