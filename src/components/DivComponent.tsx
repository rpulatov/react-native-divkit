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
function DivComponentImpl({ componentContext }: DivComponentProps) {
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

/**
 * Memoization gate. produceChildContext allocates a fresh context wrapper on every
 * parent render, so the default React.memo (referential equality) wouldn't help.
 * We compare what actually drives rendering:
 *   - json identity: the source JSON node — only changes when the document is reloaded
 *     (or when a parent rewrites items, e.g. item_builder), so it's a stable signal
 *     of "this subtree changed".
 *   - variables identity: the Variables Map. useLocalVariables returns a NEW Map only
 *     when the node declares its own `variables`. Root-level variables stay identical
 *     across renders, so non-template nodes get to skip work.
 *
 * Other context fields (path, parent, callbacks) are derived and don't drive what
 * renders. If they change without json/variables changing, downstream rendering is
 * identical anyway.
 */
function arePropsEqual(prev: DivComponentProps, next: DivComponentProps): boolean {
    const a = prev.componentContext;
    const b = next.componentContext;
    return a.json === b.json && a.variables === b.variables;
}

export const DivComponent = React.memo(DivComponentImpl, arePropsEqual);
