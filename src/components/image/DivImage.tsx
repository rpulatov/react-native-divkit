import React, { useMemo, useState } from 'react';
import { Image, View, ViewStyle, ImageStyle, ActivityIndicator } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivImageData } from '../../types/image';
import type { ImageScale } from '../../types/imageScale';
import { Outer } from '../utilities/Outer';
import { useDerivedFromVarsSimple } from '../../hooks/useDerivedFromVars';
import { wrapError } from '../../utils/wrapError';

export interface DivImageProps {
    componentContext: ComponentContext<DivImageData>;
}

/**
 * DivImage component - renders images from network URLs
 * MVP implementation with basic features:
 * - Network image loading
 * - Scaling modes (fill, fit, stretch, no_scale)
 * - Placeholder color while loading
 * - Content alignment (horizontal & vertical)
 * - Aspect ratio
 *
 * Deferred for post-MVP:
 * - GIF support (requires native module or library)
 * - Image preview (blur-up technique)
 * - Tint color and tint modes
 * - Image filters (blur, etc.)
 * - Appearance animations
 * - High priority preview
 * - Preload required flag
 * - react-native-fast-image integration
 *
 * Based on Web Image.svelte
 */
export function DivImage({ componentContext }: DivImageProps) {
    const { json, variables } = componentContext;
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    // Reactive properties
    const imageUrl = useDerivedFromVarsSimple<string | undefined>(
        json.image_url || json.gif_url,
        variables || new Map()
    );

    const scale = useDerivedFromVarsSimple<ImageScale>(json.scale || 'fill', variables || new Map());

    const placeholderColor = useDerivedFromVarsSimple<string | undefined>(
        json.placeholder_color,
        variables || new Map()
    );

    // Map DivKit scale to React Native resizeMode
    const resizeMode = useMemo((): ImageStyle['resizeMode'] => {
        switch (scale) {
            case 'fill':
                return 'cover'; // Fills the area, may crop
            case 'fit':
                return 'contain'; // Fits within area, no crop
            case 'stretch':
                return 'stretch'; // Stretches to fill, may distort
            case 'no_scale':
                return 'center'; // Original size, centered
            default:
                return 'cover';
        }
    }, [scale]);

    // Container style (for placeholder and loading)
    const containerStyle = useMemo((): ViewStyle => {
        const style: ViewStyle = {
            overflow: 'hidden'
        };

        // Placeholder background
        if (placeholderColor && loading) {
            style.backgroundColor = placeholderColor;
        }

        // Aspect ratio
        if (json.aspect?.ratio) {
            style.aspectRatio = json.aspect.ratio;
        }

        return style;
    }, [placeholderColor, loading, json.aspect]);

    // Image style
    const imageStyle = useMemo((): ImageStyle => {
        const style: ImageStyle = {
            width: '100%',
            height: '100%'
        };

        // Aspect ratio
        if (json.aspect?.ratio) {
            style.aspectRatio = json.aspect.ratio;
        }

        return style;
    }, [json.aspect]);

    const handleLoadEnd = () => {
        setLoading(false);
    };

    const handleError = () => {
        setLoading(false);
        setError(true);
        componentContext.logError(wrapError(new Error(`Failed to load image: ${imageUrl}`)));
    };

    // Render error state
    if (error) {
        return (
            <Outer componentContext={componentContext}>
                <View style={[containerStyle, { backgroundColor: placeholderColor || '#EEEEEE' }]}>
                    {/* Error placeholder - could be customized */}
                </View>
            </Outer>
        );
    }

    // Render loading state
    if (!imageUrl) {
        return (
            <Outer componentContext={componentContext}>
                <View style={[containerStyle, { backgroundColor: placeholderColor || '#EEEEEE' }]} />
            </Outer>
        );
    }

    return (
        <Outer componentContext={componentContext}>
            <View style={containerStyle}>
                <Image
                    source={{ uri: imageUrl }}
                    style={imageStyle}
                    resizeMode={resizeMode}
                    onLoadEnd={handleLoadEnd}
                    onError={handleError}
                />
                {loading && (
                    <View
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            justifyContent: 'center',
                            alignItems: 'center',
                            backgroundColor: placeholderColor || 'transparent'
                        }}
                    >
                        <ActivityIndicator size="small" color="#999999" />
                    </View>
                )}
            </View>
        </Outer>
    );
}
