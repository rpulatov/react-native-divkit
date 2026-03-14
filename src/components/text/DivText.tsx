import React, { useMemo } from 'react';
import { PixelRatio, Text, TextStyle, ViewStyle } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivTextData, FontSizeUnit, FontWeight, Truncate } from '../../types/text';
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
    const { direction, typefaceProvider } = useDivKitContext();
    const { json, variables } = componentContext;

    // Reactive properties - use hooks for properties that may contain variables
    const text = useDerivedFromVarsSimple<string>(json.text || '', variables || new Map());

    const fontSize = useDerivedFromVarsSimple<number>(json.font_size || 12, variables || new Map());

    const textColor = useDerivedFromVarsSimple<string>(json.text_color || '#000000', variables || new Map());

    const textAlignmentHorizontal = useDerivedFromVarsSimple(
        json.text_alignment_horizontal || 'start',
        variables || new Map()
    );

    const textAlignmentVertical = useDerivedFromVarsSimple(
        json.text_alignment_vertical || 'top',
        variables || new Map()
    );

    const fontSizeUnit = useDerivedFromVarsSimple<FontSizeUnit>(json.font_size_unit || 'sp', variables || new Map());

    const lineHeight = useDerivedFromVarsSimple<number | undefined>(json.line_height, variables || new Map());

    const letterSpacing = useDerivedFromVarsSimple<number | undefined>(json.letter_spacing, variables || new Map());

    const maxLines = useDerivedFromVarsSimple<number | undefined>(json.max_lines, variables || new Map());

    // Convert size value based on font_size_unit
    // sp = scalable pixels (allowFontScaling handles this in RN)
    // dp = density-independent pixels (RN default unit)
    // px = physical pixels (need to divide by PixelRatio)
    const convertSize = (value: number): number => {
        if (fontSizeUnit === 'px') {
            return value / PixelRatio.get();
        }
        return value;
    };

    const allowFontScaling = fontSizeUnit === 'sp';

    // Build text style
    const textStyle = useMemo((): TextStyle => {
        const style: TextStyle = {};

        // Font size
        if (fontSize) {
            style.fontSize = convertSize(fontSize);
        }

        // Text color
        if (textColor) {
            style.color = textColor;
        }

        // Font weight
        if (json.font_weight) {
            const weightMap: Record<FontWeight, TextStyle['fontWeight']> = {
                light: '300',
                regular: '400',
                medium: '500',
                bold: '700'
            };
            style.fontWeight = weightMap[json.font_weight] || '400';
        } else if (json.font_weight_value) {
            // Custom weight value (100-900)
            const weight = Math.max(100, Math.min(900, json.font_weight_value));
            style.fontWeight = String(weight) as TextStyle['fontWeight'];
        }

        // Font family - use typefaceProvider to map font name (like Web TextRange.svelte)
        // If font_family is missing, provider receives empty string and can return global fallback.
        const sourceFontFamily = typeof json.font_family === 'string' ? json.font_family : '';
        const fontWeight = style.fontWeight ? Number(style.fontWeight) : 400;
        const mappedFamily = typefaceProvider(sourceFontFamily, { fontWeight });
        if (mappedFamily) {
            style.fontFamily = mappedFamily;
        }

        // Line height
        // Android requires lineHeight to be an integer >= fontSize
        if (lineHeight && fontSize) {
            const computedLineHeight = convertSize(lineHeight);
            const computedFontSize = style.fontSize || convertSize(fontSize);
            style.lineHeight = Math.round(Math.max(computedLineHeight, computedFontSize));
        }

        // Letter spacing
        if (letterSpacing !== undefined) {
            style.letterSpacing = letterSpacing;
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
        fontSizeUnit,
        textColor,
        textAlignmentHorizontal,
        json.font_weight,
        json.font_weight_value,
        json.font_family,
        typefaceProvider,
        lineHeight,
        letterSpacing,
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

    // Build wrapper style for text block alignment inside the Outer container
    // In Web, .text is display:flex with justify-content (halign) and align-items (valign)
    // In RN (column layout): justifyContent = vertical, alignItems = horizontal
    const outerStyle = useMemo((): ViewStyle => {
        const style: ViewStyle = {};

        // Vertical alignment of text block
        switch (textAlignmentVertical) {
            case 'center':
                style.justifyContent = 'center';
                break;
            case 'bottom':
                style.justifyContent = 'flex-end';
                break;
            case 'baseline':
                style.justifyContent = 'flex-end';
                break;
            default: // top
                style.justifyContent = 'flex-start';
                break;
        }

        return style;
    }, [textAlignmentVertical]);

    return (
        <Outer componentContext={componentContext} style={outerStyle}>
            <Text
                style={textStyle}
                numberOfLines={numberOfLines}
                ellipsizeMode={ellipsizeMode}
                allowFontScaling={allowFontScaling}
            >
                {text}
            </Text>
        </Outer>
    );
}
