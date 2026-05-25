/**
 * `react-native-fast-image` adapter preset.
 *
 * Requires `react-native-fast-image` in the host app AND a rebuilt native
 * binary — `FastImage` is a native view, so installing the JS package alone is
 * not enough. If the native module isn't linked, the adapter throws at first
 * render with an actionable message instead of crashing inside RN with the
 * less-useful "View config not found for component `FastImageView`".
 *
 * `FastImage` has no `getSize` API, so we fall back to RN `Image.getSize`
 * against the same URL (the URL points at the same bytes regardless of which
 * loader is rendering them).
 *
 * Usage:
 * ```tsx
 * import { fastImageAdapter } from 'react-native-divkit/adapters/fast-image';
 * <DivKit data={json} imageAdapter={fastImageAdapter} />
 * ```
 */
import React from 'react';
import { Image as RNImage, UIManager, NativeModules } from 'react-native';
import type { ImageStyle } from 'react-native';
import type { DivImageAdapter, DivImageAdapterRenderProps } from '../types/imageAdapter';
import type { ImageScale } from '../types/imageScale';

type FastImageResizeMode = 'cover' | 'contain' | 'stretch' | 'center';

type FastImageComponent = React.ComponentType<{
    source: { uri: string; cache?: 'immutable' | 'web' | 'cacheOnly' };
    style?: ImageStyle;
    resizeMode?: FastImageResizeMode;
    onLoadEnd?: () => void;
    onError?: () => void;
}> & {
    resizeMode: Record<FastImageResizeMode, FastImageResizeMode>;
};

function isFastImageNativelyAvailable(): boolean {
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
    const modules = NativeModules as unknown as Record<string, unknown>;
    return Boolean(modules.FastImageView);
}

let cachedFastImage: FastImageComponent | null = null;
function loadFastImage(): FastImageComponent {
    if (cachedFastImage) return cachedFastImage;
    let mod: unknown;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        mod = require('react-native-fast-image');
    } catch {
        throw new Error(
            '[react-native-divkit] fastImageAdapter requires the `react-native-fast-image` package. ' +
            'Install it with `npm install react-native-fast-image`, then rebuild the native app.',
        );
    }
    const FastImage = (mod as { default?: unknown })?.default ?? mod;
    if (!FastImage || !isFastImageNativelyAvailable()) {
        throw new Error(
            '[react-native-divkit] react-native-fast-image is installed but its native module is not linked. ' +
            'Rebuild the native iOS/Android app (the JS package alone is not enough).',
        );
    }
    cachedFastImage = FastImage as FastImageComponent;
    return cachedFastImage;
}

function mapScale(scale: ImageScale, FastImage: FastImageComponent): FastImageResizeMode {
    switch (scale) {
        case 'fill':
            return FastImage.resizeMode.cover;
        case 'fit':
            return FastImage.resizeMode.contain;
        case 'stretch':
            return FastImage.resizeMode.stretch;
        case 'no_scale':
            return FastImage.resizeMode.center;
        default:
            return FastImage.resizeMode.cover;
    }
}

export const fastImageAdapter: DivImageAdapter = {
    render({ uri, scale, style, onLoadEnd, onError }: DivImageAdapterRenderProps) {
        const FastImage = loadFastImage();
        return (
            <FastImage
                // `immutable` matches DivKit-style CDN URLs that never change at
                // a given URL — gives FastImage permission to skip revalidation.
                source={{ uri, cache: 'immutable' }}
                style={style}
                resizeMode={mapScale(scale, FastImage)}
                onLoadEnd={onLoadEnd}
                onError={onError}
            />
        );
    },

    getSize(uri: string) {
        // FastImage doesn't expose `getSize`; the URL refers to the same bytes
        // either way, so RN's built-in works fine here.
        return new Promise((resolve, reject) => {
            RNImage.getSize(
                uri,
                (width, height) => resolve({ width, height }),
                (error) => reject(error instanceof Error ? error : new Error(String(error)))
            );
        });
    }
};
