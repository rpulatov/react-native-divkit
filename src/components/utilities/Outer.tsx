import React, { ReactNode, useMemo } from 'react';
import { View, Pressable, ViewStyle, StyleSheet } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivBaseData } from '../../types/base';
import type { Visibility } from '../../types/base';
import type { FixedSize, MatchParentSize } from '../../types/sizes';
import type { MaybeMissing } from '../../expressions/json';
import { useDerivedFromVarsSimple } from '../../hooks/useDerivedFromVars';
import { useActionHandler, useHasActions } from '../../hooks/useAction';
import { useDivKitContext } from '../../context/DivKitContext';
import { Background } from './Background';

export interface OuterProps<T extends DivBaseData = DivBaseData> {
    componentContext: ComponentContext<T>;
    children: ReactNode;
    style?: ViewStyle;
}

/**
 * Outer component - base wrapper for all DivKit components
 * Handles visibility, sizing, padding, margins, background, borders, and actions
 *
 * Based on Web Outer.svelte but simplified for React Native MVP
 */
export function Outer<T extends DivBaseData = DivBaseData>({
    componentContext,
    children,
    style: customStyle
}: OuterProps<T>) {
    const { direction } = useDivKitContext();
    const { json, variables } = componentContext;

    // Only use reactive hooks for truly dynamic properties (visibility, alpha)
    // For MVP, other properties are read directly from JSON (can be enhanced later)
    const visibility = useDerivedFromVarsSimple<Visibility>(json.visibility || 'visible', variables || new Map());
    const alpha = useDerivedFromVarsSimple<number>(json.alpha !== undefined ? json.alpha : 1, variables || new Map());

    // Extract properties directly from JSON for MVP (non-reactive)
    const paddings = json.paddings;
    const margins = json.margins;
    const background = json.background;
    const border = json.border;
    const width = json.width;
    const height = json.height;

    // Actions - use type assertion for now (will be refined in component implementations)
    const jsonAny = json as any;
    const actions = jsonAny.actions || (jsonAny.action ? [jsonAny.action] : []);
    const hasActions = useHasActions(actions);
    const handlePress = useActionHandler(actions, { componentContext });

    // Early return for gone visibility
    if (visibility === 'gone') {
        return null;
    }

    // Build styles
    const containerStyle = useMemo(() => {
        const styles: ViewStyle = {};

        // Visibility (invisible = opacity 0, but still takes space)
        if (visibility === 'invisible') {
            styles.opacity = 0;
        } else if (typeof alpha === 'number' && alpha !== 1) {
            styles.opacity = Math.max(0, Math.min(1, alpha));
        }

        // Width
        if (width) {
            const widthVal = width as MaybeMissing<any>;
            if (widthVal.type === 'fixed') {
                styles.width = (widthVal as FixedSize).value;
            } else if (widthVal.type === 'match_parent') {
                // Use alignSelf: 'stretch' instead of width: '100%' so that
                // margins are subtracted from the available space rather than
                // added on top of 100%, which would cause overflow.
                styles.alignSelf = 'stretch';
                styles.flexGrow = (widthVal as MatchParentSize).weight || 1;
                // CSS defaults flex-shrink to 1, but RN defaults to 0.
                // Without flexShrink, items in horizontal containers won't
                // shrink below their content size, causing text overflow.
                styles.flexShrink = 1;
            } else if (widthVal.type === 'wrap_content') {
                styles.alignSelf = 'flex-start';
                // React Native default is wrap_content-like for View
            }
        } else {
            // Default: match_parent
            styles.alignSelf = 'stretch';
            styles.flexGrow = 1;
            styles.flexShrink = 1;
        }

        // Height
        if (height) {
            const heightVal = height as MaybeMissing<any>;
            if (heightVal.type === 'fixed') {
                styles.height = (heightVal as FixedSize).value;
            } else if (heightVal.type === 'match_parent') {
                styles.height = '100%';
                styles.flexGrow = (heightVal as MatchParentSize).weight || 1;
            }
            // wrap_content is default in React Native
        }

        // Paddings
        if (paddings) {
            const p = paddings as any;
            if (p.top !== undefined) styles.paddingTop = p.top;
            if (p.bottom !== undefined) styles.paddingBottom = p.bottom;

            // Handle RTL for start/end
            if (direction === 'rtl') {
                if (p.start !== undefined) styles.paddingRight = p.start;
                if (p.end !== undefined) styles.paddingLeft = p.end;
            } else {
                if (p.start !== undefined) styles.paddingLeft = p.start;
                if (p.end !== undefined) styles.paddingRight = p.end;
            }

            // Fallback to left/right if start/end not provided
            if (p.left !== undefined && p.start === undefined) {
                styles.paddingLeft = p.left;
            }
            if (p.right !== undefined && p.end === undefined) {
                styles.paddingRight = p.right;
            }
        }

        // Margins
        if (margins) {
            const m = margins as any;
            if (m.top !== undefined) styles.marginTop = m.top;
            if (m.bottom !== undefined) styles.marginBottom = m.bottom;

            // Handle RTL for start/end
            if (direction === 'rtl') {
                if (m.start !== undefined) styles.marginRight = m.start;
                if (m.end !== undefined) styles.marginLeft = m.end;
            } else {
                if (m.start !== undefined) styles.marginLeft = m.start;
                if (m.end !== undefined) styles.marginRight = m.end;
            }

            // Fallback to left/right
            if (m.left !== undefined && m.start === undefined) {
                styles.marginLeft = m.left;
            }
            if (m.right !== undefined && m.end === undefined) {
                styles.marginRight = m.right;
            }
        }

        // Background handled by Background component
        
        // Border
        if (border) {
            const b = border as any;
            if (b.stroke) {
                const strokeWidth = b.stroke.width || 1;
                const strokeColor = b.stroke.color || '#000000';
                styles.borderWidth = strokeWidth;
                styles.borderColor = strokeColor;
                styles.borderStyle = b.stroke.style?.type === 'dashed' ? 'dashed' : 'solid';
            }

            // Border radius
            if (b.corner_radius !== undefined) {
                styles.borderRadius = b.corner_radius;
            } else if (b.corners_radius) {
                // React Native supports individual corners
                const corners = b.corners_radius;
                if (corners['top-left'] !== undefined) {
                    styles.borderTopLeftRadius = corners['top-left'];
                }
                if (corners['top-right'] !== undefined) {
                    styles.borderTopRightRadius = corners['top-right'];
                }
                if (corners['bottom-left'] !== undefined) {
                    styles.borderBottomLeftRadius = corners['bottom-left'];
                }
                if (corners['bottom-right'] !== undefined) {
                    styles.borderBottomRightRadius = corners['bottom-right'];
                }
            }

            // Shadow (box-shadow equivalent)
            if (b.has_shadow) {
                const shadow = b.shadow;
                if (shadow) {
                    styles.shadowColor = shadow.color || '#000000';
                    styles.shadowOffset = {
                        width: shadow.offset?.x?.value || 0,
                        height: shadow.offset?.y?.value || 2
                    };
                    styles.shadowOpacity = shadow.alpha !== undefined ? shadow.alpha : 0.18;
                    styles.shadowRadius = shadow.blur || 2;
                    // Android elevation
                    styles.elevation = 3;
                } else {
                    // Default shadow
                    styles.shadowColor = '#000000';
                    styles.shadowOffset = { width: 0, height: 1 };
                    styles.shadowOpacity = 0.18;
                    styles.shadowRadius = 2;
                    styles.elevation = 2;
                }
            }
        }

        return styles;
    }, [visibility, alpha, width, height, paddings, margins, background, border, direction]);

    const finalStyle = useMemo(() => {
        return StyleSheet.flatten([containerStyle, customStyle]);
    }, [containerStyle, customStyle]);

    const borderStyle = useMemo(() => {
        const s = finalStyle || {};
        const res: ViewStyle = {};
        if (s.borderRadius) res.borderRadius = s.borderRadius;
        if (s.borderTopLeftRadius) res.borderTopLeftRadius = s.borderTopLeftRadius;
        if (s.borderTopRightRadius) res.borderTopRightRadius = s.borderTopRightRadius;
        if (s.borderBottomLeftRadius) res.borderBottomLeftRadius = s.borderBottomLeftRadius;
        if (s.borderBottomRightRadius) res.borderBottomRightRadius = s.borderBottomRightRadius;
        return res;
    }, [finalStyle]);

    // Render with or without Pressable based on actions
    if (hasActions) {
        return (
            <Pressable onPress={handlePress} style={finalStyle}>
                <Background layers={background as any} style={borderStyle} />
                {children}
            </Pressable>
        );
    }

    return (
        <View style={finalStyle}>
            <Background layers={background as any} style={borderStyle} />
            {children}
        </View>
    );
}
