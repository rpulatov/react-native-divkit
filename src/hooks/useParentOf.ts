/**
 * Patch support: registration of "replaceable children" for applyPatch.
 *
 * Mirrors the parentOf logic of Web Outer.svelte (registration block + replaceWith):
 * a parent component (container / state / pager) lists its children with ids, and
 * DivKit.applyPatch replaces a child in place through the registered replaceWith —
 * only that parent re-renders, so the rest of the tree keeps its identity
 * (state, scroll, focus, animation continuity).
 */

import { useCallback, useEffect, useRef } from 'react';
import type { DivBase } from '../../typings/common';
import { useDivKitContext } from '../context/DivKitContext';

export interface ParentOfItem {
    json: unknown;
    id: string | undefined;
}

export type ReplaceItemsFn = (items: (DivBase | undefined)[]) => void;

export function useParentOf(
    parentOf: ParentOfItem[],
    replaceItems: ReplaceItemsFn,
    isSingleMode = false
): void {
    const { registerParentOf, unregisterParentOf } = useDivKitContext();

    // Live copies: replaceWith must see the latest items and callback even when
    // several changes of one patch hit the same parent synchronously (before React
    // re-renders and the effect below re-registers). Web keeps the same invariant
    // by reassigning the local `parentOf` variable inside Outer.svelte replaceWith.
    const liveItemsRef = useRef(parentOf);
    liveItemsRef.current = parentOf;
    const replaceItemsRef = useRef(replaceItems);
    replaceItemsRef.current = replaceItems;
    const isSingleModeRef = useRef(isSingleMode);
    isSingleModeRef.current = isSingleMode;

    const replaceWith = useCallback((id: string, items?: DivBase[]): void => {
        const current = liveItemsRef.current;
        if (!Array.isArray(current)) {
            return;
        }

        if (isSingleModeRef.current) {
            const newItemsLen = Array.isArray(items) ? items.length : 0;
            if (newItemsLen !== 1) {
                return;
            }
        }

        const index = current.findIndex(item => item?.id === id);
        if (index === -1) {
            return;
        }

        const newItems = current.slice();
        newItems.splice(index, 1, ...(items || []).map(it => ({
            json: it,
            id: it?.id as string | undefined
        })));

        liveItemsRef.current = newItems;
        replaceItemsRef.current(newItems.map(it => it?.json as DivBase | undefined));
    }, []);

    useEffect(() => {
        const ids: string[] = [];
        parentOf.forEach(item => {
            if (item?.id) {
                ids.push(item.id);
                registerParentOf(item.id, {
                    replaceWith,
                    isSingleMode
                });
            }
        });

        return () => {
            ids.forEach(id => {
                unregisterParentOf(id);
            });
        };
    }, [parentOf, isSingleMode, registerParentOf, unregisterParentOf, replaceWith]);
}
