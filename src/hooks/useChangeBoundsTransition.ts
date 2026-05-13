import { useCallback, useMemo, useRef } from 'react';
import { Animated, Easing, EasingFunction, LayoutChangeEvent } from 'react-native';
import type { MaybeMissing } from '../expressions/json';
import type { ChangeBoundsTransition, TransitionChange } from '../types/base';
import type { Interpolation } from '../../typings/common';
import { flattenChangeTransition } from '../utils/flattenTransition';

function interpolationToEasing(interpolator: Interpolation | undefined): EasingFunction {
    switch (interpolator) {
        case 'linear': return Easing.linear;
        case 'ease': return Easing.ease;
        case 'ease_in': return Easing.in(Easing.ease);
        case 'ease_out': return Easing.out(Easing.ease);
        case 'ease_in_out': return Easing.inOut(Easing.ease);
        case 'spring': return Easing.elastic(1);
        default: return Easing.inOut(Easing.ease);
    }
}

interface NormalizedChange {
    duration: number;
    delay: number;
    easing: EasingFunction;
}

function normalize(transition: MaybeMissing<TransitionChange> | undefined): NormalizedChange | null {
    if (!transition) return null;
    const items = flattenChangeTransition(transition);
    let longest: MaybeMissing<ChangeBoundsTransition> | null = null;
    let longestTotal = 0;
    for (const it of items) {
        const dur = Math.max(0, (it as any).duration ?? 300);
        const delay = Math.max(0, (it as any).start_delay ?? 0);
        if (dur + delay > longestTotal) {
            longestTotal = dur + delay;
            longest = it;
        }
    }
    if (!longest || longestTotal === 0) return null;
    return {
        duration: Math.max(0, (longest as any).duration ?? 300),
        delay: Math.max(0, (longest as any).start_delay ?? 0),
        easing: interpolationToEasing((longest as any).interpolator)
    };
}

export interface ChangeBoundsTransitionOptions {
    transitionChange?: MaybeMissing<TransitionChange>;
    /**
     * When true, the element is being unmounted/collapsed and we should NOT play a FLIP transition
     * from previous bounds (the element is going away — that's handled by transition_out).
     */
    suspended?: boolean;
}

export interface ChangeBoundsTransitionResult {
    /** Plug onto Animated.View. Computes delta vs prev layout and starts FLIP timing. */
    onLayout: (e: LayoutChangeEvent) => void;
    /**
     * Transform array to merge into Animated.View style. Empty if no change_bounds spec.
     * Returns translateX/translateY/scaleX/scaleY animated values that ride to identity.
     */
    transform: Array<{ translateX?: any; translateY?: any; scaleX?: any; scaleY?: any }>;
    /** Width measured by onLayout (handy for pivot calc in appearance hook). */
    layoutWidth: number | undefined;
    layoutHeight: number | undefined;
}

/**
 * FLIP (First-Last-Invert-Play) hook for transition_change with custom cubic easing.
 *
 * On each layout change:
 *  1. Capture previous (First) and new (Last) bounds via onLayout.
 *  2. Set transform to translate(-dx, -dy) * scale(prevW/newW, prevH/newH) so the element
 *     visually stays at its old position/size (Invert).
 *  3. Animate transform to identity over the spec duration (Play).
 *
 * Limitations:
 *  - onLayout reports coords relative to the parent. If the parent itself moves, we will
 *    see a position change but interpret it as our own movement — usually fine for items
 *    inside a stable container.
 *  - useNativeDriver is enabled (transform-only props), so the animation runs on the UI thread.
 *  - First layout is treated as the baseline and is not animated.
 */
export function useChangeBoundsTransition(
    opts: ChangeBoundsTransitionOptions
): ChangeBoundsTransitionResult {
    const { transitionChange, suspended } = opts;

    const spec = useMemo(() => normalize(transitionChange), [transitionChange]);

    const translateX = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(0)).current;
    const scaleX = useRef(new Animated.Value(1)).current;
    const scaleY = useRef(new Animated.Value(1)).current;

    const prevLayoutRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
    const sizeRef = useRef<{ width: number; height: number } | undefined>(undefined);
    const inFlightRef = useRef<Animated.CompositeAnimation | null>(null);

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const { x, y, width, height } = e.nativeEvent.layout;
        const prev = prevLayoutRef.current;
        prevLayoutRef.current = { x, y, width, height };
        sizeRef.current = { width, height };

        if (!spec || suspended) return;
        if (!prev) return; // baseline — nothing to invert from
        if (prev.x === x && prev.y === y && prev.width === width && prev.height === height) {
            return; // identical layout
        }
        if (width === 0 || height === 0) return;

        const sx = width > 0 ? prev.width / width : 1;
        const sy = height > 0 ? prev.height / height : 1;
        const prevCenterX = prev.x + prev.width / 2;
        const prevCenterY = prev.y + prev.height / 2;
        const nextCenterX = x + width / 2;
        const nextCenterY = y + height / 2;
        const dx = prevCenterX - nextCenterX;
        const dy = prevCenterY - nextCenterY;

        // Skip imperceptible movements
        const SIGNIFICANT = 0.5;
        const SCALE_EPS = 0.01;
        if (
            Math.abs(dx) < SIGNIFICANT &&
            Math.abs(dy) < SIGNIFICANT &&
            Math.abs(sx - 1) < SCALE_EPS &&
            Math.abs(sy - 1) < SCALE_EPS
        ) {
            return;
        }

        if (inFlightRef.current) {
            inFlightRef.current.stop();
            inFlightRef.current = null;
        }

        // Invert: snap to old position/size in transform space
        translateX.setValue(dx);
        translateY.setValue(dy);
        scaleX.setValue(sx);
        scaleY.setValue(sy);

        // Play to identity
        const comp = Animated.parallel([
            Animated.timing(translateX, {
                toValue: 0, duration: spec.duration, delay: spec.delay,
                easing: spec.easing, useNativeDriver: true
            }),
            Animated.timing(translateY, {
                toValue: 0, duration: spec.duration, delay: spec.delay,
                easing: spec.easing, useNativeDriver: true
            }),
            Animated.timing(scaleX, {
                toValue: 1, duration: spec.duration, delay: spec.delay,
                easing: spec.easing, useNativeDriver: true
            }),
            Animated.timing(scaleY, {
                toValue: 1, duration: spec.duration, delay: spec.delay,
                easing: spec.easing, useNativeDriver: true
            })
        ]);
        inFlightRef.current = comp;
        comp.start(({ finished }) => {
            if (inFlightRef.current === comp) inFlightRef.current = null;
            if (finished) {
                translateX.setValue(0);
                translateY.setValue(0);
                scaleX.setValue(1);
                scaleY.setValue(1);
            }
        });
    }, [spec, suspended, translateX, translateY, scaleX, scaleY]);

    const transform = useMemo(() => {
        if (!spec) return [];
        return [
            { translateX },
            { translateY },
            { scaleX },
            { scaleY }
        ];
    }, [spec, translateX, translateY, scaleX, scaleY]);

    return {
        onLayout,
        transform,
        layoutWidth: sizeRef.current?.width,
        layoutHeight: sizeRef.current?.height
    };
}
