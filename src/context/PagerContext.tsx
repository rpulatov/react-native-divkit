import { createContext, useContext, useCallback, useMemo, useRef, ReactNode, createElement } from 'react';
import type { PagerData, PagerListener, PagerRegisterData } from '../types/componentContext';

/**
 * PagerContext — shared registry for pagers and their indicators.
 *
 * Based on Web Root.svelte: registerPager / listenPager.
 *
 * - Pager registers itself with `registerPager(pagerId)` and gets back an object with
 *   `update(data)` (called whenever current item / size changes) and `destroy()`.
 * - Indicator subscribes to a pager via `listenPager(pagerId, cb)`.
 * - Subscribers receive the current pager state immediately if it's already known
 *   (so indicator works regardless of mount order).
 */
export interface PagerContextValue {
    registerPager(pagerId: string | undefined): PagerRegisterData;
    listenPager(pagerId: string | undefined, listener: PagerListener): () => void;
}

export const PagerContext = createContext<PagerContextValue | null>(null);

export function usePagerContextOptional(): PagerContextValue | null {
    return useContext(PagerContext);
}

export function usePagerContext(): PagerContextValue {
    const context = useContext(PagerContext);
    if (!context) {
        throw new Error('usePagerContext must be used within PagerContext.Provider');
    }
    return context;
}

export interface PagerProviderProps {
    children: ReactNode;
}

/**
 * Provider that holds pager state in stable refs. Mirrors the Web behaviour
 * where registration / listening is keyed by pagerId (with `undefined` allowed
 * so indicators without an explicit pager_id still work).
 */
export function PagerProvider({ children }: PagerProviderProps) {
    const pagersRef = useRef<Map<string | undefined, PagerData | null>>(new Map());
    const listenersRef = useRef<Map<string | undefined, PagerListener[]>>(new Map());

    const notify = useCallback((pagerId: string | undefined, data: PagerData) => {
        const list = listenersRef.current.get(pagerId);
        if (!list) return;
        for (const fn of list) {
            try {
                fn(data);
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error('[DivKit Pager] listener error', err);
            }
        }
    }, []);

    const registerPager = useCallback((pagerId: string | undefined): PagerRegisterData => {
        return {
            update: (data: PagerData) => {
                pagersRef.current.set(pagerId, data);
                notify(pagerId, data);
            },
            destroy: () => {
                pagersRef.current.set(pagerId, null);
            }
        };
    }, [notify]);

    const listenPager = useCallback(
        (pagerId: string | undefined, listener: PagerListener): (() => void) => {
            let list = listenersRef.current.get(pagerId);
            if (!list) {
                list = [];
                listenersRef.current.set(pagerId, list);
            }
            list.push(listener);

            // Replay last known state so indicator gets current pager position immediately
            const current = pagersRef.current.get(pagerId);
            if (current) {
                try {
                    listener(current);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error('[DivKit Pager] listener error', err);
                }
            }

            return () => {
                const arr = listenersRef.current.get(pagerId);
                if (!arr) return;
                const idx = arr.indexOf(listener);
                if (idx >= 0) arr.splice(idx, 1);
            };
        },
        []
    );

    const value = useMemo<PagerContextValue>(
        () => ({ registerPager, listenPager }),
        [registerPager, listenPager]
    );

    return createElement(PagerContext.Provider, { value }, children);
}
