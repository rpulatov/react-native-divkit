import React, { useMemo } from 'react';
import { Text, TextStyle } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivTextData, FontWeight, Truncate } from '../../types/text';
import { Outer } from '../utilities/Outer';
import { useDerivedFromVarsSimple } from '../../hooks/useDerivedFromVars';
import { useDivKitContext } from '../../context/DivKitContext';

export interface DivTextProps {
    componentContext: ComponentContext<DivTextData>;
}

/**
 * DivText component - renders text with styling
 * MVP implementation with basic features:
 * - Text rendering with variable substitution
 * - Font styling (size, weight, color, family)
 * - Text alignment (horizontal & vertical)
 * - Max lines with ellipsize
 * - Line height, letter spacing
 * - Text decorations (underline, strikethrough)
 *
 * Deferred for post-MVP:
 * - Text ranges (nested styling)
 * - Text images
 * - Text gradients
 * - Text shadows
 * - Auto ellipsize
 * - Selectable text with custom actions
 *
 * Based on Web Text.svelte
 */
export function DivText({ componentContext }: DivTextProps) {
    const { direction } = useDivKitContext();
    const { json, variables } = componentContext;

    // Reactive properties - use hooks for properties that may contain variables
    const text = useDerivedFromVarsSimple<string>(
        json.text || '',
        variables || new Map()
    );

    const fontSize = useDerivedFromVarsSimple<number>(
        json.font_size || 12,
        variables || new Map()
    );

    const textColor = useDerivedFromVarsSimple<string>(
        json.text_color || '#000000',
        variables || new Map()
    );

    const textAlignmentHorizontal = useDerivedFromVarsSimple(
        json.text_alignment_horizontal || 'start',
        variables || new Map()
    );

    const maxLines = useDerivedFromVarsSimple<number | undefined>(
        json.max_lines,
        variables || new Map()
    );

    // Build text style
    const textStyle = useMemo((): TextStyle => {
        const style: TextStyle = {};

        // Font size
        if (fontSize) {
            style.fontSize = fontSize;
        }

        // Text color
        if (textColor) {
            style.color = textColor;
        }

        // Font weight
        if (json.font_weight) {
            const weightMap: Record<FontWeight, TextStyle['fontWeight']> = {
                'light': '300',
                'regular': '400',
                'medium': '500',
                'bold': '700'
            };
            style.fontWeight = weightMap[json.font_weight] || '400';
        } else if (json.font_weight_value) {
            // Custom weight value (100-900)
            const weight = Math.max(100, Math.min(900, json.font_weight_value));
            style.fontWeight = String(weight) as TextStyle['fontWeight'];
        }

        // Font family
        if (json.font_family) {
            style.fontFamily = json.font_family;
        }

        // Line height
        if (json.line_height && fontSize) {
            // DivKit line_height is in pixels, React Native expects ratio or pixels
            // Convert to ratio: line_height / font_size
            style.lineHeight = json.line_height;
        }

        // Letter spacing
        if (json.letter_spacing !== undefined) {
            style.letterSpacing = json.letter_spacing;
        }

        // Text alignment
        const alignValue = textAlignmentHorizontal;
        if (alignValue === 'start') {
            style.textAlign = direction === 'rtl' ? 'right' : 'left';
        } else if (alignValue === 'end') {
            style.textAlign = direction === 'rtl' ? 'left' : 'right';
        } else if (alignValue === 'center') {
            style.textAlign = 'center';
        } else if (alignValue === 'left' || alignValue === 'right') {
            style.textAlign = alignValue;
        }

        // Text decoration - underline
        if (json.underline === 'single') {
            style.textDecorationLine = 'underline';
        }

        // Text decoration - strike (strikethrough)
        if (json.strike === 'single') {
            if (style.textDecorationLine === 'underline') {
                style.textDecorationLine = 'underline line-through';
            } else {
                style.textDecorationLine = 'line-through';
            }
        }

        // Font feature settings (advanced typography)
        if (json.font_feature_settings) {
            // React Native supports fontVariant for some features
            // For full support, this may require native modules
            // MVP: basic support
            style.fontVariant = json.font_feature_settings.split(',').map(s => s.trim()) as any;
        }

        return style;
    }, [
        fontSize,
        textColor,
        textAlignmentHorizontal,
        json.font_weight,
        json.font_weight_value,
        json.font_family,
        json.line_height,
        json.letter_spacing,
        json.underline,
        json.strike,
        json.font_feature_settings,
        direction
    ]);

    // Determine numberOfLines prop
    const numberOfLines = maxLines && maxLines > 0 ? maxLines : undefined;

    // Ellipsize mode
    const ellipsizeMode = useMemo(() => {
        const truncate = json.truncate as Truncate | undefined;
        if (truncate === 'end' || numberOfLines !== undefined) {
            return 'tail';
        }
        return undefined;
    }, [json.truncate, numberOfLines]);

    // Vertical alignment is handled by Outer component via alignment props
    // For text, we primarily care about horizontal alignment which is in textStyle

    return (
        <Outer componentContext={componentContext}>
            <Text
                style={textStyle}
                numberOfLines={numberOfLines}
                ellipsizeMode={ellipsizeMode}
                allowFontScaling={false} // DivKit has fixed sizes
            >
                {text}
            </Text>
        </Outer>
    );
}
