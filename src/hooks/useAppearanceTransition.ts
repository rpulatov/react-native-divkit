import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, EasingFunction } from 'react-native';
import type { MaybeMissing } from '../expressions/json';
import type {
    AnyTransition,
    AppearanceTransition,
    FadeTransition,
    ScaleTransition,
    SlideTransition,
    Visibility
} from '../types/base';
import type { Interpolation } from '../../typings/common';
import { flattenAppearanceTransition } from '../utils/flattenTransition';

function interpolationToEasing(interpolator: Interpolation | undefined): EasingFunction {
    switch (interpolator) {
        case 'linear': return Easing.linear;
        case 'ease': return Easing.ease;
        case 'ease_in': return Easing.in(Easing.ease);
        case 'ease_out': return Easing.out(Easing.ease);
        case 'ease_in_out': return Easing.inOut(Easing.ease);
        case 'spring': return Easing.inOut(Easing.ease);
        default: return Easing.inOut(Easing.ease);
    }
}

interface NormalizedTransition {
    hasFade: boolean;
    hasScale: boolean;
    hasSlide: boolean;

    fadeAlpha: number;
    scaleValue: number;
    scalePivotX: number;
    scalePivotY: number;
    slideEdge: 'left' | 'top' | 'right' | 'bottom';
    slideDistance: number | null;

    fadeDuration: number;
    fadeDelay: number;
    fadeEasing: EasingFunction;

    scaleDuration: number;
    scaleDelay: number;
    scaleEasing: EasingFunction;

    slideDuration: number;
    slideDelay: number;
    slideEasing: EasingFunction;

    totalDuration: number;
}

function normalize(
    transition: MaybeMissing<AppearanceTransition> | undefined
): NormalizedTransition {
    const res: NormalizedTransition = {
        hasFade: false,
        hasScale: false,
        hasSlide: false,
        fadeAlpha: 0,
        scaleValue: 0,
        scalePivotX: 0.5,
        scalePivotY: 0.5,
        slideEdge: 'bottom',
        slideDistance: null,
        fadeDuration: 0,
        fadeDelay: 0,
        fadeEasing: Easing.inOut(Easing.ease),
        scaleDuration: 0,
        scaleDelay: 0,
        scaleEasing: Easing.inOut(Easing.ease),
        slideDuration: 0,
        slideDelay: 0,
        slideEasing: Easing.inOut(Easing.ease),
        totalDuration: 0
    };

    if (!transition) return res;

    const items = flattenAppearanceTransition(transition);
    for (const itAny of items) {
        const it = itAny as MaybeMissing<AnyTransition>;
        const duration = Math.max(0, (it as any).duration ?? 300);
        const delay = Math.max(0, (it as any).start_delay ?? 0);
        const easing = interpolationToEasing((it as any).interpolator);
        res.totalDuration = Math.max(res.totalDuration, duration + delay);

        if (it.type === 'fade') {
            res.hasFade = true;
            const fade = it as MaybeMissing<FadeTransition>;
            res.fadeAlpha = typeof fade.alpha === 'number' ? fade.alpha : 0;
            res.fadeDuration = duration;
            res.fadeDelay = delay;
            res.fadeEasing = easing;
        } else if (it.type === 'scale') {
            res.hasScale = true;
            const sc = it as MaybeMissing<ScaleTransition>;
            res.scaleValue = typeof sc.scale === 'number' ? sc.scale : 0;
            res.scalePivotX = typeof sc.pivot_x === 'number' ? sc.pivot_x : 0.5;
            res.scalePivotY = typeof sc.pivot_y === 'number' ? sc.pivot_y : 0.5;
            res.scaleDuration = duration;
            res.scaleDelay = delay;
            res.scaleEasing = easing;
        } else if (it.type === 'slide') {
            res.hasSlide = true;
            const sl = it as MaybeMissing<SlideTransition>;
            res.slideEdge = (sl.edge ?? 'bottom') as 'left' | 'top' | 'right' | 'bottom';
            const dim: any = sl.distance;
            const distVal = dim && typeof dim.value === 'number' ? dim.value : null;
            res.slideDistance = distVal;
            res.slideDuration = duration;
            res.slideDelay = delay;
            res.slideEasing = easing;
        }
    }

    return res;
}

function slideOffsetFor(edge: 'left' | 'top' | 'right' | 'bottom', distance: number | null) {
    const win = Dimensions.get('window');
    const dx = distance ?? win.width;
    const dy = distance ?? win.height;
    switch (edge) {
        case 'left':   return { tx: -dx, ty: 0 };
        case 'right':  return { tx:  dx, ty: 0 };
        case 'top':    return { tx: 0, ty: -dy };
        case 'bottom':
        default:       return { tx: 0, ty:  dy };
    }
}

export interface AppearanceTransitionOptions {
    visibility: Visibility;
    transitionIn?: MaybeMissing<AppearanceTransition>;
    transitionOut?: MaybeMissing<AppearanceTransition>;
    /**
     * When false, transitions are skipped (used during initial mount when visibility starts as 'visible'
     * and you don't want a flicker). Default: true.
     */
    enabled?: boolean;
    /**
     * 'visibility' (default) — transitions are driven by the visibility prop changing.
     * 'imperative' — visibility changes do not auto-play; the consumer must call playOut/playIn.
     * 'auto-in' — like 'imperative' but transition_in is played automatically on first mount.
     */
    mode?: 'visibility' | 'imperative' | 'auto-in';
    /**
     * Called once right before the wrapper collapses layout (target visibility 'gone'
     * and out animation just finished). Use to queue LayoutAnimation for parents.
     */
    onBeforeCollapse?: () => void;
    /**
     * Called once right before the wrapper mounts after being collapsed
     * (visibility goes back to 'visible'). Use to queue LayoutAnimation for parents.
     */
    onBeforeExpand?: () => void;
    /**
     * Measured width of the element (from onLayout). Used to emulate off-center pivot for scale
     * via translate-scale-translate. If absent, scale is applied from the view center (pivot 0.5/0.5).
     */
    layoutWidth?: number;
    /** Measured height of the element. */
    layoutHeight?: number;
}

type AnyTransformValue = number | Animated.AnimatedInterpolation<number> | Animated.Value;

export interface AppearanceTransitionResult {
    /**
     * True while the children should be present in the tree.
     * Goes false only AFTER transition_out completed and target visibility is 'gone'/'invisible'.
     */
    rendered: boolean;
    /** True after transition_out completed; the wrapper should collapse layout (return null). */
    collapsed: boolean;
    /** Animated opacity value (or constant). */
    opacity: Animated.Value | number;
    /**
     * Ready-to-use transform array for Animated.View. Combines slide translate, scale, and
     * pivot translate-scale-translate compensation. Empty array if no transition produces transforms.
     */
    transform: Array<{ translateX?: AnyTransformValue; translateY?: AnyTransformValue; scale?: AnyTransformValue }>;
    /**
     * Imperatively play transition_out (without affecting rendered/collapsed state).
     * Resolves when animation finishes (or immediately if no transition_out is specified).
     */
    playOut: () => Promise<void>;
    /**
     * Imperatively reset values to transition_in start, then animate to identity.
     * Resolves when animation finishes (or immediately if no transition_in is specified).
     */
    playIn: () => Promise<void>;
    /** Whether transition_out is specified (helps consumers decide whether to wait for playOut). */
    hasTransitionOut: boolean;
    /** Whether transition_in is specified. */
    hasTransitionIn: boolean;
}

/**
 * Hook that drives transition_in / transition_out for an Outer wrapper.
 *
 * - On first mount: NO transition_in is played (matches Web Outer.svelte behavior with
 *   isVisibilityInited). Use mode='auto-in' if you do want a first-mount play (DivState
 *   uses this for newly-mounted children of a switched state).
 * - On change visible→gone/invisible with a transition_out: animates identity → end values,
 *   then collapses.
 * - On change gone/invisible→visible: re-mounts and plays transition_in.
 *
 * Only fade/scale/slide are supported here (AppearanceTransition).
 */
export function useAppearanceTransition(
    opts: AppearanceTransitionOptions
): AppearanceTransitionResult {
    const {
        visibility,
        transitionIn,
        transitionOut,
        enabled = true,
        mode = 'visibility',
        onBeforeCollapse,
        onBeforeExpand,
        layoutWidth,
        layoutHeight
    } = opts;
    const onBeforeCollapseRef = useRef(onBeforeCollapse);
    const onBeforeExpandRef = useRef(onBeforeExpand);
    onBeforeCollapseRef.current = onBeforeCollapse;
    onBeforeExpandRef.current = onBeforeExpand;

    const inSpec = useMemo(() => normalize(transitionIn), [transitionIn]);
    const outSpec = useMemo(() => normalize(transitionOut), [transitionOut]);

    // Refs to Animated values — created once
    const opacity = useRef(new Animated.Value(visibility === 'visible' ? 1 : 0)).current;
    const scale = useRef(new Animated.Value(1)).current;
    const slideTx = useRef(new Animated.Value(0)).current;
    const slideTy = useRef(new Animated.Value(0)).current;

    const prevVisibilityRef = useRef<Visibility>(visibility);
    const isFirstRunRef = useRef(true);
    const inFlightRef = useRef<Animated.CompositeAnimation | null>(null);

    const [rendered, setRendered] = useState<boolean>(visibility !== 'gone');
    const [collapsed, setCollapsed] = useState<boolean>(visibility === 'gone');

    // Active scale spec for transform composition (pivot + endpoint).
    // Updated when we start an "in" or "out" scale animation; used to build interpolated transform.
    const [activeScale, setActiveScale] = useState<{
        value: number;
        pivotX: number;
        pivotY: number;
    } | null>(() => {
        if (visibility === 'visible' && (inSpec.hasScale)) {
            return { value: inSpec.scaleValue, pivotX: inSpec.scalePivotX, pivotY: inSpec.scalePivotY };
        }
        return null;
    });

    useEffect(() => {
        const prev = prevVisibilityRef.current;
        prevVisibilityRef.current = visibility;

        // Imperative mode: visibility prop is ignored for transitions — consumer drives via playOut/playIn.
        // Only sync rendered/collapsed for static defaults; never auto-play.
        if (mode === 'imperative') {
            if (isFirstRunRef.current) {
                isFirstRunRef.current = false;
                if (visibility === 'visible') {
                    opacity.setValue(1);
                    scale.setValue(1);
                    slideTx.setValue(0);
                    slideTy.setValue(0);
                }
            }
            return;
        }

        // auto-in mode: play transition_in on first mount, then ignore visibility changes
        // (the consumer — e.g. DivState — drives transition_out programmatically).
        if (mode === 'auto-in' && !isFirstRunRef.current) {
            return;
        }

        if (isFirstRunRef.current) {
            isFirstRunRef.current = false;
            // Matches Web Outer.svelte: на первом монтаже не играем transition_in —
            // он запускается только при последующем изменении visibility (см. isVisibilityInited).
            if (visibility === 'visible') {
                opacity.setValue(1);
                scale.setValue(1);
                slideTx.setValue(0);
                slideTy.setValue(0);
            } else {
                opacity.setValue(0);
            }
            return;
        }

        // visible → gone/invisible
        if (prev === 'visible' && visibility !== 'visible') {
            if (enabled && (outSpec.hasFade || outSpec.hasScale || outSpec.hasSlide)) {
                setRendered(true);
                setCollapsed(false);
                if (outSpec.hasScale) {
                    setActiveScale({ value: outSpec.scaleValue, pivotX: outSpec.scalePivotX, pivotY: outSpec.scalePivotY });
                }
                runOut(visibility);
            } else {
                opacity.setValue(visibility === 'invisible' ? 0 : 0);
                if (visibility === 'gone') {
                    onBeforeCollapseRef.current?.();
                    setRendered(false);
                    setCollapsed(true);
                }
            }
            return;
        }

        // gone/invisible → visible
        if (prev !== 'visible' && visibility === 'visible') {
            if (prev === 'gone') {
                onBeforeExpandRef.current?.();
            }
            setRendered(true);
            setCollapsed(false);
            if (enabled && (inSpec.hasFade || inSpec.hasScale || inSpec.hasSlide)) {
                if (inSpec.hasFade) opacity.setValue(inSpec.fadeAlpha);
                else opacity.setValue(1);
                if (inSpec.hasScale) {
                    scale.setValue(inSpec.scaleValue);
                    setActiveScale({ value: inSpec.scaleValue, pivotX: inSpec.scalePivotX, pivotY: inSpec.scalePivotY });
                } else {
                    scale.setValue(1);
                    setActiveScale(null);
                }
                if (inSpec.hasSlide) {
                    const off = slideOffsetFor(inSpec.slideEdge, inSpec.slideDistance);
                    slideTx.setValue(off.tx);
                    slideTy.setValue(off.ty);
                } else {
                    slideTx.setValue(0);
                    slideTy.setValue(0);
                }
                runIn();
            } else {
                opacity.setValue(1);
                scale.setValue(1);
                slideTx.setValue(0);
                slideTy.setValue(0);
                setActiveScale(null);
            }
            return;
        }

        if (prev !== 'visible' && visibility !== 'visible') {
            setRendered(visibility !== 'gone');
            setCollapsed(visibility === 'gone');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [visibility, inSpec, outSpec, enabled, mode]);

    function stopInFlight() {
        if (inFlightRef.current) {
            inFlightRef.current.stop();
            inFlightRef.current = null;
        }
    }

    /** Build the list of timings for a transition_in (target = identity). */
    function buildInAnimations(): Animated.CompositeAnimation[] {
        const anims: Animated.CompositeAnimation[] = [];
        if (inSpec.hasFade) {
            anims.push(Animated.timing(opacity, {
                toValue: 1, duration: inSpec.fadeDuration, delay: inSpec.fadeDelay,
                easing: inSpec.fadeEasing, useNativeDriver: true
            }));
        }
        if (inSpec.hasScale) {
            anims.push(Animated.timing(scale, {
                toValue: 1, duration: inSpec.scaleDuration, delay: inSpec.scaleDelay,
                easing: inSpec.scaleEasing, useNativeDriver: true
            }));
        }
        if (inSpec.hasSlide) {
            anims.push(Animated.timing(slideTx, {
                toValue: 0, duration: inSpec.slideDuration, delay: inSpec.slideDelay,
                easing: inSpec.slideEasing, useNativeDriver: true
            }));
            anims.push(Animated.timing(slideTy, {
                toValue: 0, duration: inSpec.slideDuration, delay: inSpec.slideDelay,
                easing: inSpec.slideEasing, useNativeDriver: true
            }));
        }
        return anims;
    }

    /** Build the list of timings for a transition_out (target = end values). */
    function buildOutAnimations(): Animated.CompositeAnimation[] {
        const anims: Animated.CompositeAnimation[] = [];
        if (outSpec.hasFade) {
            anims.push(Animated.timing(opacity, {
                toValue: outSpec.fadeAlpha, duration: outSpec.fadeDuration, delay: outSpec.fadeDelay,
                easing: outSpec.fadeEasing, useNativeDriver: true
            }));
        }
        if (outSpec.hasScale) {
            anims.push(Animated.timing(scale, {
                toValue: outSpec.scaleValue, duration: outSpec.scaleDuration, delay: outSpec.scaleDelay,
                easing: outSpec.scaleEasing, useNativeDriver: true
            }));
        }
        if (outSpec.hasSlide) {
            const off = slideOffsetFor(outSpec.slideEdge, outSpec.slideDistance);
            anims.push(Animated.timing(slideTx, {
                toValue: off.tx, duration: outSpec.slideDuration, delay: outSpec.slideDelay,
                easing: outSpec.slideEasing, useNativeDriver: true
            }));
            anims.push(Animated.timing(slideTy, {
                toValue: off.ty, duration: outSpec.slideDuration, delay: outSpec.slideDelay,
                easing: outSpec.slideEasing, useNativeDriver: true
            }));
        }
        return anims;
    }

    function runIn(): Promise<void> {
        stopInFlight();
        const anims = buildInAnimations();
        if (anims.length === 0) return Promise.resolve();
        const comp = Animated.parallel(anims);
        inFlightRef.current = comp;
        return new Promise<void>(resolve => {
            comp.start(({ finished }) => {
                if (inFlightRef.current === comp) inFlightRef.current = null;
                if (finished) {
                    if (inSpec.hasFade) opacity.setValue(1);
                    if (inSpec.hasScale) scale.setValue(1);
                    if (inSpec.hasSlide) {
                        slideTx.setValue(0);
                        slideTy.setValue(0);
                    }
                }
                resolve();
            });
        });
    }

    function runOut(target: Visibility): Promise<void> {
        stopInFlight();
        const anims = buildOutAnimations();
        if (anims.length === 0) {
            if (target === 'gone') {
                onBeforeCollapseRef.current?.();
                setRendered(false);
                setCollapsed(true);
            }
            return Promise.resolve();
        }
        const comp = Animated.parallel(anims);
        inFlightRef.current = comp;
        return new Promise<void>(resolve => {
            comp.start(({ finished }) => {
                if (inFlightRef.current === comp) inFlightRef.current = null;
                if (!finished) {
                    resolve();
                    return;
                }
                if (target === 'gone') {
                    onBeforeCollapseRef.current?.();
                    setRendered(false);
                    setCollapsed(true);
                }
                resolve();
            });
        });
    }

    /**
     * Imperative API: play transition_out without touching rendered/collapsed state.
     * Caller decides whether to unmount the element after the promise resolves.
     */
    const playOut = useCallback((): Promise<void> => {
        stopInFlight();
        const anims = buildOutAnimations();
        if (anims.length === 0) return Promise.resolve();
        const comp = Animated.parallel(anims);
        inFlightRef.current = comp;
        if (outSpec.hasScale) {
            setActiveScale({
                value: outSpec.scaleValue,
                pivotX: outSpec.scalePivotX,
                pivotY: outSpec.scalePivotY
            });
        }
        return new Promise<void>(resolve => {
            comp.start(() => {
                if (inFlightRef.current === comp) inFlightRef.current = null;
                resolve();
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [outSpec]);

    /**
     * Imperative API: reset values to transition_in start, then animate to identity.
     */
    const playIn = useCallback((): Promise<void> => {
        stopInFlight();
        // Reset values to start
        if (inSpec.hasFade) opacity.setValue(inSpec.fadeAlpha);
        if (inSpec.hasScale) {
            scale.setValue(inSpec.scaleValue);
            setActiveScale({
                value: inSpec.scaleValue,
                pivotX: inSpec.scalePivotX,
                pivotY: inSpec.scalePivotY
            });
        }
        if (inSpec.hasSlide) {
            const off = slideOffsetFor(inSpec.slideEdge, inSpec.slideDistance);
            slideTx.setValue(off.tx);
            slideTy.setValue(off.ty);
        }
        const anims = buildInAnimations();
        if (anims.length === 0) return Promise.resolve();
        const comp = Animated.parallel(anims);
        inFlightRef.current = comp;
        return new Promise<void>(resolve => {
            comp.start(({ finished }) => {
                if (inFlightRef.current === comp) inFlightRef.current = null;
                if (finished) {
                    if (inSpec.hasFade) opacity.setValue(1);
                    if (inSpec.hasScale) scale.setValue(1);
                    if (inSpec.hasSlide) {
                        slideTx.setValue(0);
                        slideTy.setValue(0);
                    }
                }
                resolve();
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [inSpec]);

    const hasTransitionIn = inSpec.hasFade || inSpec.hasScale || inSpec.hasSlide;
    const hasTransitionOut = outSpec.hasFade || outSpec.hasScale || outSpec.hasSlide;

    useEffect(() => {
        return () => {
            if (inFlightRef.current) {
                inFlightRef.current.stop();
                inFlightRef.current = null;
            }
        };
    }, []);

    // Build the final transform array, combining slide translate + scale + pivot compensation.
    const transform = useMemo(() => {
        const out: Array<{ translateX?: AnyTransformValue; translateY?: AnyTransformValue; scale?: AnyTransformValue }> = [];
        const hasAnySlide = inSpec.hasSlide || outSpec.hasSlide;
        const hasAnyScale = inSpec.hasScale || outSpec.hasScale;
        if (!hasAnySlide && !hasAnyScale) return out;

        // Build translateX/Y from slide + pivot interpolation.
        let txExpr: AnyTransformValue | null = hasAnySlide ? slideTx : null;
        let tyExpr: AnyTransformValue | null = hasAnySlide ? slideTy : null;

        if (
            hasAnyScale &&
            activeScale &&
            (activeScale.pivotX !== 0.5 || activeScale.pivotY !== 0.5) &&
            typeof layoutWidth === 'number' &&
            typeof layoutHeight === 'number' &&
            layoutWidth > 0 &&
            layoutHeight > 0
        ) {
            // pivotTx = (pivotX - 0.5) * width * (1 - scale)
            // Interpolate over [min(value,1), max(value,1)] mapped to corresponding endpoints.
            const a = Math.min(activeScale.value, 1);
            const b = Math.max(activeScale.value, 1);
            if (a !== b && activeScale.pivotX !== 0.5) {
                const offsetA = (activeScale.pivotX - 0.5) * layoutWidth * (1 - a);
                const offsetB = (activeScale.pivotX - 0.5) * layoutWidth * (1 - b);
                const pivotTx = scale.interpolate({
                    inputRange: [a, b],
                    outputRange: [offsetA, offsetB],
                    extrapolate: 'clamp'
                });
                txExpr = txExpr !== null ? Animated.add(txExpr as Animated.Animated, pivotTx) as AnyTransformValue : pivotTx;
            }
            if (a !== b && activeScale.pivotY !== 0.5) {
                const offsetA = (activeScale.pivotY - 0.5) * layoutHeight * (1 - a);
                const offsetB = (activeScale.pivotY - 0.5) * layoutHeight * (1 - b);
                const pivotTy = scale.interpolate({
                    inputRange: [a, b],
                    outputRange: [offsetA, offsetB],
                    extrapolate: 'clamp'
                });
                tyExpr = tyExpr !== null ? Animated.add(tyExpr as Animated.Animated, pivotTy) as AnyTransformValue : pivotTy;
            }
        }

        if (txExpr !== null) out.push({ translateX: txExpr });
        if (tyExpr !== null) out.push({ translateY: tyExpr });
        if (hasAnyScale) out.push({ scale });
        return out;
    }, [inSpec, outSpec, activeScale, layoutWidth, layoutHeight, slideTx, slideTy, scale]);

    return {
        rendered,
        collapsed,
        opacity,
        transform,
        playIn,
        playOut,
        hasTransitionIn,
        hasTransitionOut
    };
}
