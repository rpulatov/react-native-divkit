import React, { useMemo, useState, useEffect } from 'react';
import { Image, View, ViewStyle, ImageStyle, UIManager, NativeModules } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivImageData } from '../../types/image';
import type { ImageScale } from '../../types/imageScale';
import { Outer } from '../utilities/Outer';
import { useDerivedFromVarsSimple } from '../../hooks/useDerivedFromVars';
import { wrapError } from '../../utils/wrapError';
import { alignHToFlex, alignVToFlex } from '../../utils/correctImageAlignment';

// Optional dependency: react-native-fast-image. If installed AND the native side is
// actually linked into the host app, it gives us a real disk cache + concurrent decode
// pool — dramatically faster than RN's default <Image> on pages with many remote
// images. Otherwise we fall back to <Image>.
//
// Important: a successful `require()` only proves the JS package is on disk. The
// native ViewManager `FastImageView` is registered by the host app's autolinking —
// if the app wasn't rebuilt after installing the package, JS resolves but renders
// blow up with "View config not found for component `FastImageView`". So we also
// probe the native registration before deciding to use it.
type ImageImpl = {
    Component: React.ComponentType<any>;
    isFastImage: boolean;
};

function isFastImageNativelyAvailable(): boolean {
    // UIManager.getViewManagerConfig is the canonical probe on the old architecture.
    // Returns null/undefined when the view manager isn't registered.
    const probe = UIManager as unknown as {
        getViewManagerConfig?: (name: string) => unknown;
    };
    if (typeof probe.getViewManagerConfig === 'function') {
        try {
            if (probe.getViewManagerConfig('FastImageView')) return true;
        } catch {
            /* fall through */
        }
    }
    // Fabric / new arch: native module is exposed via NativeModules. If neither
    // probe succeeds we treat it as unavailable — the cost of guessing wrong is a
    // hard crash, the cost of being conservative is using <Image>.
    const modules = NativeModules as unknown as Record<string, unknown>;
    if (modules.FastImageView) return true;
    return false;
}

const imageImpl: ImageImpl = (() => {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const mod = require('react-native-fast-image');
        const FastImage = mod?.default ?? mod;
        if (FastImage && isFastImageNativelyAvailable()) {
            return { Component: FastImage, isFastImage: true };
        }
    } catch {
        /* not installed — fall through */
    }
    return { Component: Image, isFastImage: false };
})();


export interface DivImageProps {
    componentContext: ComponentContext<DivImageData>;
}

/**
 * DivImage component - renders images from network URLs
 *
 * Implemented:
 * - Network image loading
 * - Scaling modes (fill, fit, stretch, no_scale)
 * - Placeholder color while loading
 * - content_alignment_horizontal / content_alignment_vertical
 *   - no_scale: exact positioning via getSize + container flex
 *   - fit/fill: best-effort via container flex (resizeMode always centers internally)
 * - aspect: { ratio } — explicit aspect ratio
 * - height: wrap_content — natural size via getSize
 *
 * Deferred for post-MVP:
 * - GIF animation support (requires native module or library)
 * - Image preview / blur-up (preview field)
 * - Tint color and tint modes
 * - Image filters (blur, etc.)
 * - Appearance animations (appearance_animation)
 * - High priority preview (high_priority_preview_show)
 * - Preload required (preload_required)
 * - react-native-fast-image integration
 *
 * Based on Web Image.svelte
 */
export function DivImage({ componentContext }: DivImageProps) {
    const { json, variables } = componentContext;
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
            Image.getSize(
                imageUrl,
                (w, h) => setNaturalSize({ width: w, height: h }),
                (_error: unknown) => { /* ignore getSize errors */ }
            );
        } else {
            setNaturalSize(null);
        }
    }, [imageUrl, needsNaturalSize]);

    // Effective aspect ratio for container sizing (wrap_content case only)
    const effectiveAspectRatio = aspectRatio ?? (
        (isHeightWrapContent && naturalSize) ? naturalSize.width / naturalSize.height : undefined
    );

    // Map DivKit scale to React Native resizeMode
    const resizeMode = useMemo((): ImageStyle['resizeMode'] => {
        switch (scale) {
            case 'fill':
                return 'cover';
            case 'fit':
                return 'contain';
            case 'stretch':
                return 'stretch';
            case 'no_scale':
                return 'center';
            default:
                return 'cover';
        }
    }, [scale]);

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

    // Render loading state
    if (!imageUrl) {
        return (
            <Outer componentContext={componentContext}>
                <View style={[containerStyle, { backgroundColor: placeholderColor || '#EEEEEE' }]} />
            </Outer>
        );
    }

    const ImageComponent = imageImpl.Component;

    return (
        <Outer componentContext={componentContext}>
            <View style={containerStyle}>
                <ImageComponent
                    source={imageImpl.isFastImage
                        // FastImage caches by URL on disk by default. 'immutable' is
                        // correct for the prize/product CDN URLs that never change.
                        ? { uri: imageUrl, cache: 'immutable' }
                        : { uri: imageUrl }}
                    style={imageStyle}
                    resizeMode={resizeMode}
                    onLoadEnd={handleLoadEnd}
                    onError={handleError}
                />
            </View>
        </Outer>
    );
}
