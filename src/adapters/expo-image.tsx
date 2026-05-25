/**
 * `expo-image` adapter preset.
 *
 * Requires `expo-image` to be installed in the host app (declared as an optional
 * peer dependency of `react-native-divkit`). Gives real disk caching, GIF/WebP/
 * AVIF support, blurhash, smooth transitions out of the box.
 *
 * Usage:
 * ```tsx
 * import { expoImageAdapter } from 'react-native-divkit/adapters/expo-image';
 * <DivKit data={json} imageAdapter={expoImageAdapter} />
 * ```
 */
import React from 'react';
import type { ImageStyle } from 'react-native';
import type { DivImageAdapter, DivImageAdapterRenderProps } from '../types/imageAdapter';
import type { ImageScale } from '../types/imageScale';

// Resolved lazily so the import doesn't blow up at module-load time when
// `expo-image` isn't installed — the failure is friendlier (and only happens
// if the user actually opts in to this adapter).
type ExpoImageModule = {
    Image: React.ComponentType<{
        source: { uri: string } | string;
        style?: ImageStyle;
        contentFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
        onLoad?: (event: unknown) => void;
        onError?: (event: unknown) => void;
    }> & {
        getSize?: (uri: string) => Promise<{ width: number; height: number }>;
    };
};

let cachedModule: ExpoImageModule | null = null;
function loadExpoImage(): ExpoImageModule {
    if (cachedModule) return cachedModule;
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        cachedModule = require('expo-image') as ExpoImageModule;
        return cachedModule;
    } catch (err) {
        throw new Error(
            '[react-native-divkit] expoImageAdapter requires the `expo-image` package. ' +
            'Install it with `npm install expo-image` (or `expo install expo-image`).',
        );
    }
}

function mapScaleToContentFit(scale: ImageScale): 'cover' | 'contain' | 'fill' | 'none' {
    switch (scale) {
        case 'fill':
            return 'cover';
        case 'fit':
            return 'contain';
        case 'stretch':
            return 'fill';
        case 'no_scale':
            return 'none';
        default:
            return 'cover';
    }
}

export const expoImageAdapter: DivImageAdapter = {
    render({ uri, scale, style, onLoadEnd, onError }: DivImageAdapterRenderProps) {
        const { Image: ExpoImage } = loadExpoImage();
        return (
            <ExpoImage
                source={{ uri }}
                style={style}
                contentFit={mapScaleToContentFit(scale)}
                // expo-image fires `onLoad` on success and `onError` on failure but has
                // no single `onLoadEnd` — map both terminal events to `onLoadEnd`. The
                // adapter also fires `onError` separately for the error branch.
                onLoad={() => onLoadEnd()}
                onError={() => {
                    onLoadEnd();
                    onError();
                }}
            />
        );
    },

    async getSize(uri: string) {
        const mod = loadExpoImage();
        if (typeof mod.Image.getSize === 'function') {
            return mod.Image.getSize(uri);
        }
        // Older expo-image versions without `getSize` — fall back to RN.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { Image: RNImage } = require('react-native');
        return new Promise((resolve, reject) => {
            RNImage.getSize(
                uri,
                (width: number, height: number) => resolve({ width, height }),
                (error: unknown) => reject(error instanceof Error ? error : new Error(String(error)))
            );
        });
    }
};
