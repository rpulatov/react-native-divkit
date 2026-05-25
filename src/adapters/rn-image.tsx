/**
 * Default image adapter — built on React Native's `Image`.
 *
 * Used automatically by `DivKit` when no `imageAdapter` prop is provided.
 */
import React from 'react';
import { Image, type ImageStyle } from 'react-native';
import type { DivImageAdapter, DivImageAdapterRenderProps } from '../types/imageAdapter';
import type { ImageScale } from '../types/imageScale';

function mapScaleToResizeMode(scale: ImageScale): ImageStyle['resizeMode'] {
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
}

export const rnImageAdapter: DivImageAdapter = {
    render({ uri, scale, style, onLoadEnd, onError }: DivImageAdapterRenderProps) {
        return (
            <Image
                source={{ uri }}
                style={style}
                resizeMode={mapScaleToResizeMode(scale)}
                onLoadEnd={onLoadEnd}
                onError={onError}
            />
        );
    },

    getSize(uri: string) {
        return new Promise((resolve, reject) => {
            Image.getSize(
                uri,
                (width, height) => resolve({ width, height }),
                (error) => reject(error instanceof Error ? error : new Error(String(error)))
            );
        });
    }
};
