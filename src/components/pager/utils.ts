/**
 * Pure helpers for DivPager. Extracted so they can be unit-tested without
 * having to render the React tree.
 */

export type ScrollAxisAlignment = 'start' | 'center' | 'end';

export interface LayoutModeFixed {
    type: 'fixed';
    neighbour_page_width?: { value?: number };
}
export interface LayoutModePercentage {
    type: 'percentage';
    page_width?: { value?: number };
}
export interface LayoutModeWrap {
    type: 'wrap_content';
}
export type AnyLayoutMode =
    | LayoutModeFixed
    | LayoutModePercentage
    | LayoutModeWrap
    | { type?: string; [k: string]: unknown }
    | null
    | undefined;

export interface ComputePageSizeArgs {
    containerSize: number;
    layoutMode: AnyLayoutMode;
    scrollAxisAlignment: ScrollAxisAlignment;
    itemSpacing: number;
    innerPadStart: number;
    innerPadEnd: number;
}

/**
 * Compute the size of a single page along the main axis. Mirrors the Web
 * Pager.svelte autoSizeVal calculation:
 * - fixed + center: containerSize − 2·neighbour − 2·spacing
 * - fixed + start/end: containerSize − neighbour − spacing
 * - percentage: containerSize · page_width / 100
 * - wrap_content / unknown: usable area (containerSize − paddings)
 */
export function computePageSize(args: ComputePageSizeArgs): number {
    const { containerSize, layoutMode, scrollAxisAlignment, itemSpacing, innerPadStart, innerPadEnd } =
        args;
    if (containerSize <= 0) return 0;
    const usable = containerSize - innerPadStart - innerPadEnd;

    const lm = layoutMode as { type?: string; neighbour_page_width?: { value?: number }; page_width?: { value?: number } } | null | undefined;

    if (lm && lm.type === 'fixed') {
        const neighbourW = lm.neighbour_page_width?.value ?? 0;
        if (scrollAxisAlignment === 'center') {
            return Math.max(0, containerSize - 2 * neighbourW - 2 * itemSpacing);
        }
        return Math.max(0, containerSize - neighbourW - itemSpacing);
    }
    if (lm && lm.type === 'percentage') {
        const pageW = lm.page_width?.value ?? 100;
        return Math.max(0, (containerSize * pageW) / 100);
    }
    return Math.max(0, usable);
}

export interface ComputeContentPadArgs extends ComputePageSizeArgs {
    pageSize: number;
    isInfinite: boolean;
}

/**
 * Compute the contentContainer paddings the inner ScrollView needs so that the
 * first/last items snap to the right visual position (centre/start/end). In
 * infinite mode the duplicates take that role and we use zero padding.
 */
export function computeContentPad(args: ComputeContentPadArgs): { start: number; end: number } {
    const {
        containerSize,
        pageSize,
        innerPadStart,
        innerPadEnd,
        layoutMode,
        scrollAxisAlignment,
        itemSpacing,
        isInfinite
    } = args;

    if (containerSize <= 0 || pageSize <= 0) {
        return { start: innerPadStart, end: innerPadEnd };
    }
    if (isInfinite) {
        return { start: 0, end: 0 };
    }
    const lm = layoutMode as { type?: string; neighbour_page_width?: { value?: number } } | null | undefined;
    if (lm && lm.type === 'fixed') {
        const neighbourW = lm.neighbour_page_width?.value ?? 0;
        if (scrollAxisAlignment === 'center') {
            const pad = neighbourW + itemSpacing;
            return { start: pad, end: pad };
        }
        if (scrollAxisAlignment === 'start') {
            return { start: innerPadStart, end: neighbourW + itemSpacing + innerPadEnd };
        }
        if (scrollAxisAlignment === 'end') {
            return { start: neighbourW + itemSpacing + innerPadStart, end: innerPadEnd };
        }
    }
    return { start: innerPadStart, end: innerPadEnd };
}

export const DUPLICATES_IN_INFINITE = 2;

/**
 * Map a "real" item index (0..size-1) to its rendered position.
 * In infinite mode the real items live in [DUPLICATES, DUPLICATES + size).
 */
export function realToPosition(realIdx: number, isInfinite: boolean, duplicates = DUPLICATES_IN_INFINITE): number {
    return isInfinite ? duplicates + realIdx : realIdx;
}

/**
 * Map a rendered position back to the real index. Wraps modulo `size` when
 * the position lands inside the duplicate region.
 */
export function positionToReal(
    pos: number,
    isInfinite: boolean,
    size: number,
    duplicates = DUPLICATES_IN_INFINITE
): number {
    if (size <= 0) return 0;
    if (!isInfinite) {
        return Math.max(0, Math.min(size - 1, pos));
    }
    const inner = pos - duplicates;
    return ((inner % size) + size) % size;
}

/**
 * True when `pos` corresponds to one of the duplicate entries (only meaningful
 * in infinite mode).
 */
export function isInDuplicateRegion(
    pos: number,
    isInfinite: boolean,
    size: number,
    duplicates = DUPLICATES_IN_INFINITE
): boolean {
    if (!isInfinite) return false;
    return pos < duplicates || pos >= duplicates + size;
}

export interface RenderedItemEntry<T> {
    item: T;
    realIndex: number;
    key: string;
}

/**
 * Build the list of items to render. In infinite mode this prefixes the array
 * with `duplicates` copies of the last items and suffixes it with `duplicates`
 * copies of the first items, so the user can swipe past either edge and land
 * on something visually identical to the wrap-around target.
 */
export function buildRenderedItems<T extends { id?: string }>(
    items: T[],
    isInfinite: boolean,
    duplicates = DUPLICATES_IN_INFINITE
): RenderedItemEntry<T>[] {
    if (!items.length) return [];
    if (!isInfinite) {
        return items.map((item, index) => ({ item, realIndex: index, key: `r-${index}` }));
    }
    const size = items.length;
    const head: RenderedItemEntry<T>[] = [];
    const tail: RenderedItemEntry<T>[] = [];
    for (let i = 0; i < duplicates; i++) {
        const realIdx = (size - duplicates + i + size) % size;
        head.push({ item: items[realIdx], realIndex: realIdx, key: `dup-h-${i}` });
    }
    for (let i = 0; i < duplicates; i++) {
        const realIdx = i % size;
        tail.push({ item: items[realIdx], realIndex: realIdx, key: `dup-t-${i}` });
    }
    const real: RenderedItemEntry<T>[] = items.map((item, index) => ({
        item,
        realIndex: index,
        key: `r-${index}`
    }));
    return [...head, ...real, ...tail];
}

/**
 * Decide whether infinite_scroll should actually be active.
 * Mirrors Web's correctBooleanInt + the `items.length >= DUPLICATES_IN_INFINITE`
 * gate.
 */
export function isInfiniteEnabled(infiniteValue: unknown, itemsLength: number): boolean {
    const truthy =
        infiniteValue === true ||
        infiniteValue === 1 ||
        infiniteValue === '1' ||
        infiniteValue === 'true';
    return truthy && itemsLength >= DUPLICATES_IN_INFINITE;
}

/**
 * Convert a scroll offset (in px) into a snap position (rounded). Returns 0
 * when snapInterval <= 0.
 */
export function offsetToPosition(offset: number, snapInterval: number): number {
    if (snapInterval <= 0) return 0;
    return Math.round(offset / snapInterval);
}
