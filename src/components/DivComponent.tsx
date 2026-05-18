import React from 'react';
import type { ComponentContext } from '../types/componentContext';
import type { DivBaseData } from '../types/base';
import { DivText } from './text';
import { DivContainer } from './container';
import { DivImage } from './image';
import { DivState } from './state';
import { DivPager } from './pager';
import { DivIndicator } from './indicator';
import { Unknown } from './utilities/Unknown';
import { useLocalVariables } from '../hooks/useLocalVariables';

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
    // Apply local variables declared on the node (mirrors Web Root.svelte
    // childProcessedJson.variables): they merge with the parent scope and are
    // visible to all descendants of this node, including `@{...}` expressions.
    const effectiveContext = useLocalVariables(componentContext);
    const { json } = effectiveContext;

    if (!json || !json.type) {
        return <Unknown type={json?.type || 'undefined'} />;
    }

    // Route to appropriate component based on type
    switch (json.type) {
        case 'text':
            return <DivText componentContext={effectiveContext as any} />;

        case 'container':
            return <DivContainer componentContext={effectiveContext as any} />;

        case 'image':
        case 'gif':
            return <DivImage componentContext={effectiveContext as any} />;

        case 'state':
            return <DivState componentContext={effectiveContext as any} />;

        case 'pager':
            return <DivPager componentContext={effectiveContext as any} />;

        case 'indicator':
            return <DivIndicator componentContext={effectiveContext as any} />;

        // Future components (post-MVP)
        case 'gallery':
        case 'tabs':
        case 'slider':
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
