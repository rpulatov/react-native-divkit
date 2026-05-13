/**
 * Pure helpers for DivIndicator. Extracted for unit testing.
 */
import { correctColor } from '../../utils/correctColor';

export interface DotStyle {
    width: number;
    height: number;
    borderRadius: number;
    background: string;
}

export const DEFAULT_ACTIVE: DotStyle = {
    width: 13,
    height: 13,
    borderRadius: 6.5,
    background: '#ffdc60'
};

export const DEFAULT_INACTIVE: DotStyle = {
    width: 10,
    height: 10,
    borderRadius: 5,
    background: '#33919cb5'
};

interface ShapeLike {
    type?: string;
    item_width?: { value?: number };
    item_height?: { value?: number };
    corner_radius?: { value?: number };
    radius?: { value?: number };
    background_color?: string;
}

/**
 * Convert a Shape (rounded_rectangle | circle) into a DotStyle.
 * Falls back to `base` when the shape is missing or unsupported.
 */
export function shapeToDot(shape: unknown, fallbackColor: string, base: DotStyle): DotStyle {
    if (!shape) return base;
    const s = shape as ShapeLike;
    if (s.type === 'rounded_rectangle') {
        const w = s.item_width?.value ?? base.width;
        const h = s.item_height?.value ?? base.height;
        const r = s.corner_radius?.value ?? Math.min(w, h) / 2;
        return {
            width: w,
            height: h,
            borderRadius: r,
            background: correctColor(s.background_color, 1, fallbackColor)
        };
    }
    if (s.type === 'circle') {
        const r = s.radius?.value ?? base.width / 2;
        return {
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            background: correctColor(s.background_color, 1, fallbackColor)
        };
    }
    return base;
}

export interface BuildDotStylesArgs {
    activeShape?: unknown;
    inactiveShape?: unknown;
    legacyShape?: unknown;
    activeColor?: string;
    inactiveColor?: string;
    activeItemSize?: number;
}

/**
 * Compute final active/inactive dot styles. Mirrors Indicator.svelte:
 *   - explicit active_shape/inactive_shape take precedence
 *   - else legacy `shape` + `active_item_size` + colors generates both
 *   - else defaults
 */
export function buildDotStyles(args: BuildDotStylesArgs): { active: DotStyle; inactive: DotStyle } {
    const { activeShape, inactiveShape, legacyShape, activeColor, inactiveColor, activeItemSize } = args;
    let inactive: DotStyle = { ...DEFAULT_INACTIVE };
    let active: DotStyle = { ...DEFAULT_ACTIVE };

    if (activeShape) {
        active = shapeToDot(activeShape, active.background, active);
    }
    if (inactiveShape) {
        inactive = shapeToDot(inactiveShape, inactive.background, inactive);
    }
    if (!activeShape && !inactiveShape && legacyShape) {
        const sizeMul = typeof activeItemSize === 'number' && activeItemSize > 0 ? activeItemSize : 1.3;
        inactive = shapeToDot(legacyShape, inactive.background, inactive);
        inactive.background = correctColor(inactiveColor, 1, inactive.background);
        const activeBg = correctColor(activeColor, 1, active.background);
        active = {
            width: inactive.width * sizeMul,
            height: inactive.height * sizeMul,
            borderRadius: inactive.borderRadius * sizeMul,
            background: activeBg
        };
    }
    return { active, inactive };
}

export type IndicatorPlacement = 'default' | 'stretch';

export interface ResolvePlacementArgs {
    itemsPlacement?: { type?: string; space_between_centers?: { value?: number }; item_spacing?: { value?: number }; max_visible_items?: number };
    spaceBetweenCenters?: { value?: number };
    inactiveWidth: number;
}

export interface ResolvedPlacement {
    placement: IndicatorPlacement;
    gap: number;
    stretchSpacing: number;
    maxVisible: number;
}

/**
 * Resolve which placement mode to use and the spacing parameters.
 * - stretch: equal spacing across the full width, item_spacing px between dots.
 * - default: gap = space_between_centers - inactiveWidth.
 */
export function resolvePlacement(args: ResolvePlacementArgs): ResolvedPlacement {
    const { itemsPlacement, spaceBetweenCenters, inactiveWidth } = args;

    if (itemsPlacement && itemsPlacement.type === 'stretch') {
        return {
            placement: 'stretch',
            gap: 0,
            stretchSpacing: itemsPlacement.item_spacing?.value ?? 5,
            maxVisible: itemsPlacement.max_visible_items ?? 10
        };
    }
    let center = spaceBetweenCenters?.value;
    if (itemsPlacement && itemsPlacement.type === 'default') {
        center = itemsPlacement.space_between_centers?.value ?? center;
    }
    const c = typeof center === 'number' && center >= 0 ? center : 15;
    return {
        placement: 'default',
        gap: Math.max(0, c - inactiveWidth),
        stretchSpacing: 0,
        maxVisible: 10
    };
}
