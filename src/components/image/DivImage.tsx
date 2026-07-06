import React, { useMemo, useState, useEffect } from 'react';
import { View, ViewStyle, ImageStyle } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivImageData } from '../../types/image';
import type { ImageScale } from '../../types/imageScale';
import { Outer } from '../utilities/Outer';
import { useDerivedFromVarsSimple } from '../../hooks/useDerivedFromVars';
import { wrapError } from '../../utils/wrapError';
import { alignHToFlex, alignVToFlex } from '../../utils/correctImageAlignment';
import { useDivKitContext } from '../../context/DivKitContext';

export interface DivImageProps {
    componentContext: ComponentContext<DivImageData>;
}

/**
 * DivImage component — renders images from network URLs.
 *
 * Delegates the actual `<Image>` rendering and `getSize` to a pluggable
 * `DivImageAdapter` taken from `DivKitContext`. Default adapter is
 * `rnImageAdapter` (React Native `Image`); the host app can opt into
 * `expo-image` or `react-native-fast-image` via
 * `react-native-divkit/adapters/{expo-image,fast-image}` presets.
 *
 * Implemented:
 * - Network image loading via adapter
 * - Scaling modes (fill, fit, stretch, no_scale) — mapped by adapter
 * - Placeholder color while loading
 * - content_alignment_horizontal / content_alignment_vertical
 *   - no_scale: exact positioning via adapter.getSize + container flex
 *   - fit/fill: best-effort via container flex
 * - aspect: { ratio } — explicit aspect ratio
 * - height: wrap_content — natural size via adapter.getSize
 *
 * Deferred for post-MVP:
 * - GIF animation support
 * - Image preview / blur-up (preview field)
 * - Tint color and tint modes
 * - Image filters (blur, etc.)
 * - Appearance animations
 * - High priority preview
 * - Preload required
 *
 * Based on Web Image.svelte
 */
export function DivImage({ componentContext }: DivImageProps) {
    const { json, variables } = componentContext;
    const { imageAdapter, imageLoadTracker } = useDivKitContext();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);

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

    const contentAlignH = useDerivedFromVarsSimple<string>(
        json.content_alignment_horizontal || 'center',
        variables || new Map()
    );

    const contentAlignV = useDerivedFromVarsSimple<string>(
        json.content_alignment_vertical || 'center',
        variables || new Map()
    );

    const isHeightWrapContent = json.height?.type === 'wrap_content';
    const aspectRatio = json.aspect?.ratio;

    // Fetch natural image dimensions when needed:
    //   - wrap_content without explicit aspect (to set container height)
    //   - no_scale mode (to size Image to natural dims so container alignment works)
    const needsNaturalSize = (isHeightWrapContent && !aspectRatio) || scale === 'no_scale';

    useEffect(() => {
        if (needsNaturalSize && imageUrl) {
            let cancelled = false;
            imageAdapter.getSize(imageUrl)
                .then(({ width, height }) => {
                    if (!cancelled) setNaturalSize({ width, height });
                })
                .catch(() => { /* ignore getSize errors */ });
            return () => { cancelled = true; };
        }
        setNaturalSize(null);
        return undefined;
    }, [imageUrl, needsNaturalSize, imageAdapter]);

    // Report the in-flight load to the host tracker (readiness signal for
    // screenshot tests): counted while the image is loading, released on
    // load end / error / unmount.
    useEffect(() => {
        if (!imageLoadTracker || !imageUrl || !loading) {
            return undefined;
        }
        imageLoadTracker.increment();
        return () => imageLoadTracker.decrement();
    }, [imageLoadTracker, imageUrl, loading]);

    // Effective aspect ratio for container sizing (wrap_content case only)
    const effectiveAspectRatio = aspectRatio ?? (
        (isHeightWrapContent && naturalSize) ? naturalSize.width / naturalSize.height : undefined
    );

    // Container style
    const containerStyle = useMemo((): ViewStyle => {
        const style: ViewStyle = {
            overflow: 'hidden',
            alignItems: alignHToFlex(contentAlignH as string),
            justifyContent: alignVToFlex(contentAlignV as string),
        };

        if (placeholderColor && loading) {
            style.backgroundColor = placeholderColor;
        }

        if (effectiveAspectRatio !== undefined) {
            style.aspectRatio = effectiveAspectRatio;
        }

        return style;
    }, [placeholderColor, loading, effectiveAspectRatio, contentAlignH, contentAlignV]);

    // Image style
    const imageStyle = useMemo((): ImageStyle => {
        // no_scale: size to natural dimensions so container alignment has effect
        if (scale === 'no_scale' && naturalSize) {
            return { width: naturalSize.width, height: naturalSize.height };
        }
        // wrap_content without known size yet: zero height until getSize resolves
        if (isHeightWrapContent && effectiveAspectRatio === undefined) {
            return { width: '100%', height: 0 };
        }
        return { width: '100%', height: '100%' };
    }, [scale, naturalSize, isHeightWrapContent, effectiveAspectRatio]);

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

    // Render loading state (no URL yet)
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
                {imageAdapter.render({
                    uri: imageUrl,
                    scale: scale ?? 'fill',
                    style: imageStyle,
                    onLoadEnd: handleLoadEnd,
                    onError: handleError
                })}
            </View>
        </Outer>
    );
}
