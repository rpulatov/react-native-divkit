import type { MaybeMissing } from '../expressions/json';
import type { AnyTransition, AppearanceTransition, ChangeBoundsTransition, TransitionChange } from '../types/base';

export function flattenAppearanceTransition(
    transition: MaybeMissing<AppearanceTransition>
): MaybeMissing<AnyTransition>[] {
    const res: MaybeMissing<AnyTransition>[] = [];

    if ((transition as any).type === 'set') {
        const items = (transition as any).items as MaybeMissing<AppearanceTransition>[] | undefined;
        (items || []).forEach(item => {
            res.push(...flattenAppearanceTransition(item));
        });
    } else {
        res.push(transition as MaybeMissing<AnyTransition>);
    }

    return res;
}

export function flattenChangeTransition(
    transition: MaybeMissing<TransitionChange>
): MaybeMissing<ChangeBoundsTransition>[] {
    const res: MaybeMissing<ChangeBoundsTransition>[] = [];

    if ((transition as any).type === 'set') {
        const items = (transition as any).items as MaybeMissing<TransitionChange>[] | undefined;
        (items || []).forEach(item => {
            res.push(...flattenChangeTransition(item));
        });
    } else {
        res.push(transition as MaybeMissing<ChangeBoundsTransition>);
    }

    return res;
}
