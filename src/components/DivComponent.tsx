import React from 'react';
import type { ComponentContext } from '../types/componentContext';
import type { DivBaseData } from '../types/base';
import { DivText } from './text';
import { DivContainer } from './container';
import { DivImage } from './image';
import { DivState } from './state';
import { Unknown } from './utilities/Unknown';

export interface DivComponentProps {
    componentContext: ComponentContext<DivBaseData>;
}

/**
 * DivComponent - Universal component router
 * Routes to the appropriate component based on the `type` field
 *
 * MVP Components:
 * - text: DivText
 * - container: DivContainer
 * - image: DivImage
 * - gif: DivImage (treated as image)
 * - state: DivState
 *
 * Deferred for post-MVP:
 * - gallery, pager, tabs
 * - slider, indicator
 * - input, select, switch
 * - video, custom
 * - separator
 * - grid
 *
 * Based on Web component resolution logic
 */
export function DivComponent({ componentContext }: DivComponentProps) {
    const { json } = componentContext;

    if (!json || !json.type) {
        return <Unknown type={json?.type || 'undefined'} />;
    }

    // Route to appropriate component based on type
    switch (json.type) {
        case 'text':
            return <DivText componentContext={componentContext as any} />;

        case 'container':
            return <DivContainer componentContext={componentContext as any} />;

        case 'image':
        case 'gif':
            return <DivImage componentContext={componentContext as any} />;

        case 'state':
            return <DivState componentContext={componentContext as any} />;

        // Future components (post-MVP)
        case 'gallery':
        case 'pager':
        case 'tabs':
        case 'slider':
        case 'indicator':
        case 'input':
        case 'select':
        case 'switch':
        case 'video':
        case 'custom':
        case 'separator':
        case 'grid':
            return <Unknown type={json.type} />;

        default:
            return <Unknown type={json.type} />;
    }
}
