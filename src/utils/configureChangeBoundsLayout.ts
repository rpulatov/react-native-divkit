import { LayoutAnimation, LayoutAnimationConfig, Platform, UIManager } from 'react-native';
import type { MaybeMissing } from '../expressions/json';
import type { TransitionChange } from '../types/base';
import type { Interpolation } from '../../typings/common';
import { flattenChangeTransition } from './flattenTransition';

type LATypeKey = 'linear' | 'easeInEaseOut' | 'easeIn' | 'easeOut' | 'spring';

let layoutAnimationEnabled = false;

function enableLayoutAnimationIfNeeded(): void {
    if (layoutAnimationEnabled) return;
    layoutAnimationEnabled = true;

    if (Platform?.OS === 'android') {
        UIManager.setLayoutAnimationEnabledExperimental?.(true);
    }
}

function interpolatorToLAType(interp: Interpolation | undefined): LATypeKey {
    switch (interp) {
        case 'linear':       return 'linear';
        case 'ease':         return 'easeInEaseOut';
        case 'ease_in':      return 'easeIn';
        case 'ease_out':     return 'easeOut';
        case 'ease_in_out':  return 'easeInEaseOut';
        case 'spring':       return 'spring';
        default:             return 'easeInEaseOut';
    }
}

/**
 * Triggers a smooth layout transition for the next render, based on a DivKit transition_change spec.
 * Uses React Native's LayoutAnimation API (which respects duration and a coarse easing type,
 * but not arbitrary cubic-bezier curves).
 *
 * Returns true if a transition was queued, false if there is no spec or duration is zero.
 */
export function configureChangeBoundsLayout(
    transition: MaybeMissing<TransitionChange> | undefined
): boolean {
    if (!transition) return false;
    const items = flattenChangeTransition(transition);
    if (items.length === 0) return false;

    // Pick the longest duration (parallel composition); use the interpolator of that one.
    let duration = 0;
    let delayMax = 0;
    let chosenInterp: Interpolation | undefined;
    for (const it of items) {
        const d = Math.max(0, (it as any).duration ?? 300);
        const delay = Math.max(0, (it as any).start_delay ?? 0);
        if (d > duration) {
            duration = d;
            chosenInterp = (it as any).interpolator as Interpolation | undefined;
        }
        if (delay > delayMax) delayMax = delay;
    }
    if (duration === 0) return false;

    const typeKey = interpolatorToLAType(chosenInterp);
    const type = LayoutAnimation.Types[typeKey];
    const property = LayoutAnimation.Properties.opacity;

    const config: LayoutAnimationConfig = {
        duration: duration + delayMax,
        create: { type, property },
        update: { type },
        delete: { type, property }
    };
    enableLayoutAnimationIfNeeded();
    LayoutAnimation.configureNext(config);
    return true;
}
