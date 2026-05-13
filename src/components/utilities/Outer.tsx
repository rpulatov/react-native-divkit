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
        case 'top':
        case 'start':
            return 'flex-start';
        case 'bottom':
        case 'end':
            return 'flex-end';
        default:
            return undefined;
    }
}

/**
 * Convert Align ('start'|'center'|'end') from layoutParams to flex value
 */
function generalAlignToFlex(
    align: string | undefined
): 'flex-start' | 'center' | 'flex-end' | undefined {
    switch (align) {
        case 'start': return 'flex-start';
        case 'center': return 'center';
        case 'end': return 'flex-end';
        default: return undefined;
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
    const testID = (json as any).id as string | undefined;

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

        // Resolve effective alignment (explicit > parent fallback > 'start')
        const effectiveHAlign = resolveAlignSelf(alignmentHorizontal as string | undefined, direction)
            || generalAlignToFlex(layoutParams.parentHAlign)
            || 'flex-start';
        const effectiveVAlign = resolveAlignSelf(alignmentVertical as string | undefined, direction)
            || generalAlignToFlex(layoutParams.parentVAlign as string | undefined)
            || 'flex-start';

        const isOverlap = layoutParams.overlapParent;

        // Width
        const parentOrientation = layoutParams.parentContainerOrientation;

        // In RN flexbox, alignSelf always controls cross-axis:
        //   - column (vertical) container: cross-axis = horizontal → alignSelf from hAlign
        //   - row (horizontal) container: cross-axis = vertical → alignSelf from vAlign
        const crossAxisAlign = parentOrientation === 'horizontal' ? effectiveVAlign : effectiveHAlign;

        if (width) {
            const widthVal = width as MaybeMissing<any>;
            if (widthVal.type === 'fixed') {
                styles.width = (widthVal as FixedSize).value;
                if (!isOverlap) {
                    styles.alignSelf = crossAxisAlign;
                }
            } else if (widthVal.type === 'match_parent') {
                if (parentOrientation === 'horizontal') {
                    // Width is main axis in row layout — use flexGrow, not alignSelf stretch
                    styles.flexGrow = (widthVal as MatchParentSize).weight || 1;
                    styles.flexShrink = 1;
                    styles.flexBasis = 0;
                } else {
                    // Width is cross axis in column layout — stretch
                    styles.alignSelf = 'stretch';
                }
                const mp = widthVal as MatchParentSize;
                if (mp.min_size && mp.min_size.value >= 0) {
                    styles.minWidth = mp.min_size.value;
                }
                if (mp.max_size && mp.max_size.value >= 0) {
                    styles.maxWidth = mp.max_size.value;
                }
            } else if (widthVal.type === 'wrap_content') {
                if (!isOverlap) {
                    styles.alignSelf = crossAxisAlign;
                }
                const wc = widthVal as WrapContentSize;
                if (wc.min_size && wc.min_size.value >= 0) {
                    styles.minWidth = wc.min_size.value;
                }
                if (wc.max_size && wc.max_size.value >= 0) {
                    styles.maxWidth = wc.max_size.value;
                }
            }
        } else {
            // Default width = match_parent — same logic as explicit match_parent
            if (parentOrientation === 'horizontal') {
                if (layoutParams.parentHorizontalWrapContent) {
                    // match_parent inside wrap_content horizontal container = wrap content
                    // (can't grow into a parent that has no fixed width itself)
                } else {
                    // Width is main axis in row layout — use flexGrow, not alignSelf stretch
                    styles.flexGrow = 1;
                    styles.flexShrink = 1;
                    styles.flexBasis = 0;
                }
            } else {
                // Width is cross axis in column layout (or unknown) — stretch
                styles.alignSelf = 'stretch';
            }
        }

        // Height
        if (height) {
            const heightVal = height as MaybeMissing<any>;
            if (heightVal.type === 'fixed') {
                styles.height = (heightVal as FixedSize).value;
            } else if (heightVal.type === 'match_parent') {
                if (parentOrientation !== 'horizontal') {
                    // Vertical container or root (default RN flex direction is column)
                    styles.flexGrow = (heightVal as MatchParentSize).weight || 1;
                    styles.flexShrink = 1;
                    styles.flexBasis = 0;
                } else {
                    // Height is cross axis in row layout — stretch
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

        // Overlap positioning: wrapper is absolute + flexDirection: column
        if (isOverlap) {
            // undefined width means match_parent (default per DivKit spec)
            const widthType = width ? (width as any).type : 'match_parent';
            const heightType = height ? (height as any).type : undefined;

            // Horizontal: alignSelf controls cross-axis (horizontal) in column wrapper
            if (widthType === 'match_parent') {
                styles.alignSelf = 'stretch';
            } else {
                styles.alignSelf = effectiveHAlign;
            }

            // Vertical: main axis in column wrapper
            // justifyContent on the wrapper handles positioning; only match_parent needs flexGrow
            if (heightType === 'match_parent') {
                styles.flexGrow = 1;
                styles.flexBasis = 0;
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
            // Split finalStyle into outer (layout) and inner (visual) styles
            // Margins must be on Pressable to affect parent layout
            const {
                alignSelf, flexGrow, flexShrink, flexBasis,
                width: w, height: h, minWidth, maxWidth, minHeight, maxHeight,
                marginTop, marginBottom, marginLeft, marginRight,
                ...innerStyle
            } = (finalStyle || {}) as any;

            const outerStyle: ViewStyle = {};
            if (alignSelf !== undefined) outerStyle.alignSelf = alignSelf;
            if (flexGrow !== undefined) outerStyle.flexGrow = flexGrow;
            if (flexShrink !== undefined) outerStyle.flexShrink = flexShrink;
            if (flexBasis !== undefined) outerStyle.flexBasis = flexBasis;
            if (w !== undefined) outerStyle.width = w;
            if (h !== undefined) outerStyle.height = h;
            if (minWidth !== undefined) outerStyle.minWidth = minWidth;
            if (maxWidth !== undefined) outerStyle.maxWidth = maxWidth;
            if (minHeight !== undefined) outerStyle.minHeight = minHeight;
            if (maxHeight !== undefined) outerStyle.maxHeight = maxHeight;
            if (marginTop !== undefined) outerStyle.marginTop = marginTop;
            if (marginBottom !== undefined) outerStyle.marginBottom = marginBottom;
            if (marginLeft !== undefined) outerStyle.marginLeft = marginLeft;
            if (marginRight !== undefined) outerStyle.marginRight = marginRight;

            // Build animated style from inner (visual) properties
            const shouldFillInner =
                w !== undefined ||
                h !== undefined ||
                minWidth !== undefined ||
                maxWidth !== undefined ||
                minHeight !== undefined ||
                maxHeight !== undefined ||
                flexGrow !== undefined ||
                flexShrink !== undefined ||
                flexBasis !== undefined;

            const animatedStyle: any = shouldFillInner
                ? { ...innerStyle, flex: 1 }
                : { ...innerStyle };

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
                    style={outerStyle}
                    testID={testID}
                >
                    <Animated.View style={animatedStyle}>
                        <Background layers={background as any} style={borderStyle} />
                        {children}
                    </Animated.View>
                </Pressable>
            );
        }

        return (
            <Pressable onPress={handlePress} style={finalStyle} testID={testID}>
                <Background layers={background as any} style={borderStyle} />
                {children}
            </Pressable>
        );
    }

    return (
        <View style={finalStyle} testID={testID}>
            <Background layers={background as any} style={borderStyle} />
            {children}
        </View>
    );
}
