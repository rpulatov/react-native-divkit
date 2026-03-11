import type { ActionSetState } from '../../typings/common';
import type { StateSetter } from '../context/StateContext';

export interface ActionSetStateCompat extends ActionSetState {
    temporary_state_id?: unknown;
}

export async function applySetStateAction(
    actionTyped: ActionSetStateCompat,
    statesMap: Map<string, StateSetter>
): Promise<void> {
    const statePath = typeof actionTyped.state_id === 'string' ? actionTyped.state_id : undefined;

    if (!statePath) {
        throw new Error('Missing state id');
    }

    const temporaryStateId = actionTyped.temporary_state_id;

    // MVP-compatible format used in current RN tests/examples:
    // { state_id: 'component_id', temporary_state_id: 'target_state_id' }
    if (temporaryStateId !== undefined && temporaryStateId !== null) {
        const setter = statesMap.get(statePath);
        if (setter) {
            await setter(String(temporaryStateId));
        }
        return;
    }

    // Web-compatible path format:
    // state_id: "rootState/divId/selectedState[/divId/selectedState...]"
    const parts = statePath.split('/').filter(Boolean);

    if (parts.length < 2) {
        return;
    }

    // If path length is odd, first segment is root card state id (unsupported in RN MVP)
    // and should be skipped for local state resolution.
    const startIndex = parts.length % 2 === 1 ? 1 : 0;

    for (let index = startIndex; index + 1 < parts.length; index += 2) {
        const componentId = parts[index];
        const nextStateId = parts[index + 1];

        const setter = statesMap.get(componentId);
        if (!setter) {
            return;
        }

        await setter(nextStateId);
    }
}
