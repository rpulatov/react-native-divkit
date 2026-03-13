import React, { ReactNode, useMemo, useRef, useCallback } from 'react';
import { View, Pressable, Animated, ViewStyle, StyleSheet, Easing, EasingFunction } from 'react-native';
import type { ComponentContext } from '../../types/componentContext';
import type { DivBaseData } from '../../types/base';
import type { Visibility } from '../../types/base';
import type { FixedSize, MatchParentSize, WrapContentSize } from '../../types/sizes';
import type { MaybeMissing } from '../../expressions/json';
import type { Animation } from '../../types/animation';
import type { Interpolation } from '../../../typings/common';
import { useDerivedFromVarsSimple } from '../../hooks/useDerivedFromVars';
import { useActionHandler, useHasActions } from '../../hooks/useAction';
import { useDivKitContext } from '../../context/DivKitContext';
import { useLayoutParams } from '../../context/LayoutParamsContext';
import { Background } from './Background';
import { flattenAnimation } from '../../utils/flattenAnimation';

function resolveAlignSelf(
    alignment: string | undefined,
    dir: string
): 'flex-start' | 'center' | 'flex-end' | undefined {
    if (!alignment) return undefined;
    switch (alignment) {
        case 'center':
            return 'center';
        case 'left':
            return dir === 'rtl' ? 'flex-end' : 'flex-start';
        case 'right':
            return dir === 'rtl' ? 'flex-start' : 'flex-end';
        case 'start':
            return 'flex-start';
        case 'end':
            return 'flex-end';
        default:
            return undefined;
    }
}

function interpolationToEasing(interpolator: Interpolation | undefined): EasingFunction {
    switch (interpolator) {
        case 'linear':
            return Easing.linear;
        case 'ease':
            return Easing.ease;
        case 'ease_in':
            return Easing.in(Easing.ease);
        case 'ease_out':
            return Easing.out(Easing.ease);
        case 'ease_in_out':
            return Easing.inOut(Easing.ease);
        case 'spring':
            return Easing.inOut(Easing.ease);
        default:
            return Easing.inOut(Easing.ease);
    }
}

interface ParsedActionAnimation {
    type: 'fade' | 'scale';
    startValue: number;
    endValue: number;
    duration: number;
    startDelay: number;
    easing: EasingFunction;
}

function parseActionAnimations(animation: MaybeMissing<Animation> | undefined): ParsedActionAnimation[] {
    if (!animation) return [];

    const list = flattenAnimation(animation);
    const result: ParsedActionAnimation[] = [];

    for (const anim of list) {
        if (anim.name === 'fade' || anim.name === 'scale') {
            result.push({
                type: anim.name,
                startValue: anim.start_value ?? 1,
                endValue: anim.end_value ?? 1,
                duration: Math.max(0, anim.duration ?? 300),
                startDelay: Math.max(0, anim.start_delay ?? 0),
                easing: interpolationToEasing(anim.interpolator),
            });
        }
        // 'native' and 'no_animation' are ignored
    }

    return result;
}

export interface OuterProps<T extends DivBaseData = DivBaseData> {
    componentContext: ComponentContext<T>;
    children: ReactNode;
    style?: ViewStyle;
}

/**
 * Outer component - base wrapper for all DivKit components
 * Handles visibility, sizing, padding, margins, background, borders, actions and action_animation
 *
 * Based on Web Outer.svelte
 */
export function Outer<T extends DivBaseData = DivBaseData>({
    componentContext,
    children,
    style: customStyle
}: OuterProps<T>) {
    const { direction } = useDivKitContext();
    const layoutParams = useLayoutParams();
    const { json, variables } = componentContext;

    // Only use reactive hooks for truly dynamic properties (visibility, alpha)
    const visibility = useDerivedFromVarsSimple<Visibility>(json.visibility || 'visible', variables || new Map());
    const alpha = useDerivedFromVarsSimple<number>(json.alpha !== undefined ? json.alpha : 1, variables || new Map());

    // Paddings and margins need expression evaluation (e.g. @{safeAreaTop})
    const paddings = useDerivedFromVarsSimple(json.paddings, variables || new Map());
    const margins = useDerivedFromVarsSimple(json.margins, variables || new Map());
    const background = json.background;
    const border = useDerivedFromVarsSimple(json.border, variables || new Map());
    const width = useDerivedFromVarsSimple(json.width, variables || new Map());
    const height = useDerivedFromVarsSimple(json.height, variables || new Map());
    const alignmentHorizontal = useDerivedFromVarsSimple(json.alignment_horizontal, variables || new Map());
    const alignmentVertical = useDerivedFromVarsSimple(json.alignment_vertical, variables || new Map());

    // Actions
    const jsonAny = json as any;
    const actions = jsonAny.actions || (jsonAny.action ? [jsonAny.action] : []);
    const hasActions = useHasActions(actions);
    const handlePress = useActionHandler(actions, { componentContext });

    // Action animation
    const actionAnimation = jsonAny.action_animation as MaybeMissing<Animation> | undefined;
    const parsedAnimations = useMemo(() => parseActionAnimations(actionAnimation), [actionAnimation]);

    const hasFadeAnimation = parsedAnimations.some(a => a.type === 'fade');
    const hasScaleAnimation = parsedAnimations.some(a => a.type === 'scale');

    // Animated values (created once, stable refs)
    const animOpacity = useRef(new Animated.Value(1)).current;
    const animScale = useRef(new Animated.Value(1)).current;

    const onPressIn = useCallback(() => {
        if (parsedAnimations.length === 0) return;

        const anims: Animated.CompositeAnimation[] = [];
        for (const anim of parsedAnimations) {
            const target = anim.type === 'fade' ? animOpacity : animScale;
            anims.push(
                Animated.timing(target, {
                    toValue: anim.endValue,
                    duration: anim.duration,
                    delay: anim.startDelay,
                    easing: anim.easing,
                    useNativeDriver: true,
                })
            );
        }

        Animated.parallel(anims).start();
    }, [parsedAnimations, animOpacity, animScale]);

    const onPressOut = useCallback(() => {
        if (parsedAnimations.length === 0) return;

        const anims: Animated.CompositeAnimation[] = [];
        for (const anim of parsedAnimations) {
            const target = anim.type === 'fade' ? animOpacity : animScale;
            anims.push(
                Animated.timing(target, {
                    toValue: anim.startValue,
                    duration: anim.duration,
                    delay: anim.startDelay,
                    easing: anim.easing,
                    useNativeDriver: true,
                })
            );
        }

        Animated.parallel(anims).start();
    }, [parsedAnimations, animOpacity, animScale]);

    // Early return for gone visibility
    if (visibility === 'gone') {
        return null;
    }

    // Build styles
    const containerStyle = useMemo(() => {
        const styles: ViewStyle = {};

        // Visibility (invisible = opacity 0, but still takes space)
        if (visibility === 'invisible') {
            styles.opacity = 0;
        } else if (typeof alpha === 'number' && alpha !== 1) {
            styles.opacity = Math.max(0, Math.min(1, alpha));
        }

        // Width
        const parentOrientation = layoutParams.parentContainerOrientation;

        if (width) {
            const widthVal = width as MaybeMissing<any>;
            if (widthVal.type === 'fixed') {
                styles.width = (widthVal as FixedSize).value;
            } else if (widthVal.type === 'match_parent') {
                styles.alignSelf = 'stretch';
                if (parentOrientation === 'horizontal') {
                    styles.flexGrow = (widthVal as MatchParentSize).weight || 1;
                    styles.flexShrink = 1;
                }
                const mp = widthVal as MatchParentSize;
                if (mp.min_size && mp.min_size.value >= 0) {
                    styles.minWidth = mp.min_size.value;
                }
                if (mp.max_size && mp.max_size.value >= 0) {
                    styles.maxWidth = mp.max_size.value;
                }
            } else if (widthVal.type === 'wrap_content') {
                const hAlign = resolveAlignSelf(alignmentHorizontal as string | undefined, direction);
                styles.alignSelf = hAlign || 'flex-start';
                const wc = widthVal as WrapContentSize;
                if (wc.min_size && wc.min_size.value >= 0) {
                    styles.minWidth = wc.min_size.value;
                }
                if (wc.max_size && wc.max_size.value >= 0) {
                    styles.maxWidth = wc.max_size.value;
                }
            }
        } else {
            styles.alignSelf = 'stretch';
            if (!parentOrientation || parentOrientation === 'horizontal') {
                styles.flexGrow = 1;
                styles.flexShrink = 1;
            }
        }

        // Height
        if (height) {
            const heightVal = height as MaybeMissing<any>;
            if (heightVal.type === 'fixed') {
                styles.height = (heightVal as FixedSize).value;
            } else if (heightVal.type === 'match_parent') {
                if (parentOrientation === 'vertical') {
                    styles.flexGrow = (heightVal as MatchParentSize).weight || 1;
                } else {
                    styles.alignSelf = 'stretch';
                }
                const mp = heightVal as MatchParentSize;
                if (mp.min_size && mp.min_size.value >= 0) {
                    styles.minHeight = mp.min_size.value;
                }
                if (mp.max_size && mp.max_size.value >= 0) {
                    styles.maxHeight = mp.max_size.value;
                }
            } else if (heightVal.type === 'wrap_content') {
                const wc = heightVal as WrapContentSize;
                if (wc.min_size && wc.min_size.value >= 0) {
                    styles.minHeight = wc.min_size.value;
                }
                if (wc.max_size && wc.max_size.value >= 0) {
                    styles.maxHeight = wc.max_size.value;
                }
            }
        }

        // Paddings
        if (paddings) {
            const p = paddings as any;
            if (p.top !== undefined) styles.paddingTop = p.top;
            if (p.bottom !== undefined) styles.paddingBottom = p.bottom;

            if (direction === 'rtl') {
                if (p.start !== undefined) styles.paddingRight = p.start;
                if (p.end !== undefined) styles.paddingLeft = p.end;
            } else {
                if (p.start !== undefined) styles.paddingLeft = p.start;
                if (p.end !== undefined) styles.paddingRight = p.end;
            }

            if (p.left !== undefined && p.start === undefined) {
                styles.paddingLeft = p.left;
            }
            if (p.right !== undefined && p.end === undefined) {
                styles.paddingRight = p.right;
            }
        }

        // Margins
        if (margins) {
            const m = margins as any;
            if (m.top !== undefined) styles.marginTop = m.top;
            if (m.bottom !== undefined) styles.marginBottom = m.bottom;

            if (direction === 'rtl') {
                if (m.start !== undefined) styles.marginRight = m.start;
                if (m.end !== undefined) styles.marginLeft = m.end;
            } else {
                if (m.start !== undefined) styles.marginLeft = m.start;
                if (m.end !== undefined) styles.marginRight = m.end;
            }

            if (m.left !== undefined && m.start === undefined) {
                styles.marginLeft = m.left;
            }
            if (m.right !== undefined && m.end === undefined) {
                styles.marginRight = m.right;
            }
        }

        // Border
        if (border) {
            const b = border as any;
            if (b.stroke) {
                const strokeWidth = b.stroke.width || 1;
                const strokeColor = b.stroke.color || '#000000';
                styles.borderWidth = strokeWidth;
                styles.borderColor = strokeColor;
                styles.borderStyle = b.stroke.style?.type === 'dashed' ? 'dashed' : 'solid';
            }

            if (b.corner_radius !== undefined) {
                styles.borderRadius = b.corner_radius;
            } else if (b.corners_radius) {
                const corners = b.corners_radius;
                if (corners['top-left'] !== undefined) {
                    styles.borderTopLeftRadius = corners['top-left'];
                }
                if (corners['top-right'] !== undefined) {
                    styles.borderTopRightRadius = corners['top-right'];
                }
                if (corners['bottom-left'] !== undefined) {
                    styles.borderBottomLeftRadius = corners['bottom-left'];
                }
                if (corners['bottom-right'] !== undefined) {
                    styles.borderBottomRightRadius = corners['bottom-right'];
                }
            }

            if (b.corner_radius !== undefined || b.corners_radius) {
                styles.overflow = 'hidden';
            }

            if (b.has_shadow) {
                const shadow = b.shadow;
                if (shadow) {
                    styles.shadowColor = shadow.color || '#000000';
                    styles.shadowOffset = {
                        width: shadow.offset?.x?.value || 0,
                        height: shadow.offset?.y?.value || 2
                    };
                    styles.shadowOpacity = shadow.alpha !== undefined ? shadow.alpha : 0.18;
                    styles.shadowRadius = shadow.blur || 2;
                    styles.elevation = 3;
                } else {
                    styles.shadowColor = '#000000';
                    styles.shadowOffset = { width: 0, height: 1 };
                    styles.shadowOpacity = 0.18;
                    styles.shadowRadius = 2;
                    styles.elevation = 2;
                }
            }
        }

        return styles;
    }, [visibility, alpha, width, height, paddings, margins, background, border, direction, layoutParams, alignmentHorizontal, alignmentVertical]);

    const finalStyle = useMemo(() => {
        return StyleSheet.flatten([containerStyle, customStyle]);
    }, [containerStyle, customStyle]);

    const borderStyle = useMemo(() => {
        const s = finalStyle || {};
        const res: ViewStyle = {};
        if (s.borderRadius) res.borderRadius = s.borderRadius;
        if (s.borderTopLeftRadius) res.borderTopLeftRadius = s.borderTopLeftRadius;
        if (s.borderTopRightRadius) res.borderTopRightRadius = s.borderTopRightRadius;
        if (s.borderBottomLeftRadius) res.borderBottomLeftRadius = s.borderBottomLeftRadius;
        if (s.borderBottomRightRadius) res.borderBottomRightRadius = s.borderBottomRightRadius;
        return res;
    }, [finalStyle]);

    // Render with actions and animation
    if (hasActions) {
        const hasAnimation = parsedAnimations.length > 0;

        if (hasAnimation) {
            // Build animated style with opacity/scale overrides
            const animatedStyle: any = { ...finalStyle };

            if (hasFadeAnimation) {
                const staticOpacity = animatedStyle.opacity;
                if (staticOpacity !== undefined && staticOpacity !== 1) {
                    animatedStyle.opacity = Animated.multiply(animOpacity, staticOpacity);
                } else {
                    animatedStyle.opacity = animOpacity;
                }
            }

            if (hasScaleAnimation) {
                const existingTransform = animatedStyle.transform || [];
                animatedStyle.transform = [...existingTransform, { scale: animScale }];
            }

            return (
                <Pressable
                    onPress={handlePress}
                    onPressIn={onPressIn}
                    onPressOut={onPressOut}
                    style={{
                        alignSelf: finalStyle?.alignSelf,
                        flexGrow: finalStyle?.flexGrow,
                        flexShrink: finalStyle?.flexShrink,
                        minWidth: finalStyle?.minWidth,
                        maxWidth: finalStyle?.maxWidth,
                        minHeight: finalStyle?.minHeight,
                        maxHeight: finalStyle?.maxHeight,
                        width: finalStyle?.width,
                        height: finalStyle?.height,
                    }}
                >
                    <Animated.View style={animatedStyle}>
                        <Background layers={background as any} style={borderStyle} />
                        {children}
                    </Animated.View>
                </Pressable>
            );
        }

        return (
            <Pressable onPress={handlePress} style={finalStyle}>
                <Background layers={background as any} style={borderStyle} />
                {children}
            </Pressable>
        );
    }

    return (
        <View style={finalStyle}>
            <Background layers={background as any} style={borderStyle} />
            {children}
        </View>
    );
}
