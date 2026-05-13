import type { DivBaseData } from './base';
import type { FixedSize, PercentageSize } from './sizes';
import type { BooleanInt } from '../../typings/common';

export interface PageSize {
    type: 'percentage';
    page_width: PercentageSize;
}

export interface NeighbourPageSize {
    type: 'fixed';
    neighbour_page_width: FixedSize;
}

export interface PageContentSize {
    type: 'wrap_content';
}

export type PagerLayoutMode = PageSize | NeighbourPageSize | PageContentSize;

export type PagerItemAlignment = 'start' | 'center' | 'end';

export type PagerOrientation = 'vertical' | 'horizontal';

export interface DivPagerData extends DivBaseData {
    type: 'pager';
    scroll_axis_alignment?: PagerItemAlignment;
    cross_axis_alignment?: PagerItemAlignment;
    layout_mode: PagerLayoutMode;
    item_spacing?: FixedSize;
    items?: DivBaseData[];
    orientation?: PagerOrientation;
    restrict_parent_scroll?: BooleanInt;
    default_item?: number;
    infinite_scroll?: BooleanInt;
}
