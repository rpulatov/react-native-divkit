import { applySetStateAction } from '../../src/actions/setState';

describe('applySetStateAction', () => {
    it('switches state via temporary_state_id format', async () => {
        const statesMap = new Map<string, (stateId: string) => Promise<void>>();
        let currentState = 'collapsed';

        statesMap.set('details_state', async stateId => {
            currentState = stateId;
        });

        await applySetStateAction(
            {
                type: 'set_state',
                state_id: 'details_state',
                temporary_state_id: 'expanded'
            },
            statesMap
        );

        expect(currentState).toBe('expanded');
    });

    it('switches state via web-compatible path with root prefix', async () => {
        const statesMap = new Map<string, (stateId: string) => Promise<void>>();
        let currentState = 'collapsed';

        statesMap.set('details_state', async stateId => {
            currentState = stateId;
        });

        await applySetStateAction(
            {
                type: 'set_state',
                state_id: '0/details_state/expanded'
            },
            statesMap
        );

        expect(currentState).toBe('expanded');
    });

    it('applies nested web path segments in order', async () => {
        const statesMap = new Map<string, (stateId: string) => Promise<void>>();
        const calls: string[] = [];

        statesMap.set('parent_state', async stateId => {
            calls.push(`parent_state:${stateId}`);
        });
        statesMap.set('child_state', async stateId => {
            calls.push(`child_state:${stateId}`);
        });

        await applySetStateAction(
            {
                type: 'set_state',
                state_id: '0/parent_state/expanded/child_state/opened'
            },
            statesMap
        );

        expect(calls).toEqual(['parent_state:expanded', 'child_state:opened']);
    });

    it('stops processing when a setter in path is missing', async () => {
        const statesMap = new Map<string, (stateId: string) => Promise<void>>();
        const calls: string[] = [];

        statesMap.set('parent_state', async stateId => {
            calls.push(`parent_state:${stateId}`);
        });

        await applySetStateAction(
            {
                type: 'set_state',
                state_id: '0/parent_state/expanded/missing_state/opened'
            },
            statesMap
        );

        expect(calls).toEqual(['parent_state:expanded']);
    });

    it('ignores invalid short path without temporary_state_id', async () => {
        const statesMap = new Map<string, (stateId: string) => Promise<void>>();
        const setter = jest.fn(async (_stateId: string) => {});

        statesMap.set('details_state', setter);

        await applySetStateAction(
            {
                type: 'set_state',
                state_id: 'details_state'
            },
            statesMap
        );

        expect(setter).not.toHaveBeenCalled();
    });

    it('throws for missing state_id', async () => {
        const statesMap = new Map<string, (stateId: string) => Promise<void>>();

        await expect(
            applySetStateAction(
                {
                    type: 'set_state',
                    state_id: ''
                },
                statesMap
            )
        ).rejects.toThrow('Missing state id');
    });
});
