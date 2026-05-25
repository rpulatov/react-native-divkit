/**
 * Image adapter contract.
 *
 * Allows the host app to swap the underlying image library (`react-native` Image,
 * `expo-image`, `react-native-fast-image`, custom CDN wrappers, ...) without
 * forking `react-native-divkit`. `DivImage` talks only to this interface; the
 * adapter handles the actual rendering and natural-size lookup.
 *
 * Shipped presets:
 *   - `react-native-divkit/adapters/rn-image`     — default, RN `Image`
 *   - `react-native-divkit/adapters/expo-image`   — `expo-image` (peer dep)
 *   - `react-native-divkit/adapters/fast-image`   — `react-native-fast-image` (peer dep)
 */
import type { ReactElement } from 'react';
import type { ImageStyle } from 'react-native';
import type { ImageScale } from './imageScale';

export interface DivImageAdapterRenderProps {
    /** Remote URL of the image. */
    uri: string;
    /**
     * DivKit-side scale value. The adapter is responsible for mapping it to its
     * library-specific prop (`resizeMode`, `contentFit`, ...).
     */
    scale: ImageScale;
    /** Style already prepared by `DivImage` (width / height / aspectRatio). */
    style: ImageStyle;
    /** Fired when loading finishes (success or failure). */
    onLoadEnd: () => void;
    /** Fired on a network/decode error. */
    onError: () => void;
}

export interface DivImageAdapter {
    /**
     * Render an image. Stays a pure render — no internal layout magic; sizing
     * is fully controlled by `DivImage` via `style`.
     */
    render(props: DivImageAdapterRenderProps): ReactElement;

    /**
     * Natural image dimensions. Used by `DivImage` for:
     *   - `height: wrap_content` without an explicit `aspect`;
     *   - `scale: no_scale` (to size the image to its natural dims so that
     *     container alignment has effect).
     *
     * Implementations that don't have a native `getSize` (e.g. FastImage) should
     * fall back to RN's `Image.getSize` against the same URL.
     */
    getSize(uri: string): Promise<{ width: number; height: number }>;
}
