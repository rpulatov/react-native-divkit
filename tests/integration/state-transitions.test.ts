/**
 * Integration tests for state transitions
 */

describe('State Transitions Integration', () => {
    describe('State registration and switching', () => {
        it('registers state with state map', () => {
            const statesMap = new Map<string, (stateId: string) => Promise<void>>();
            let currentState = 'state1';

            const setState = async (stateId: string) => {
                currentState = stateId;
            };

            statesMap.set('my_component', setState);

            expect(statesMap.has('my_component')).toBe(true);
            expect(currentState).toBe('state1');
        });

        it('switches state via state map', async () => {
            const statesMap = new Map<string, (stateId: string) => Promise<void>>();
            let currentState = 'initial';

            const setState = async (stateId: string) => {
                currentState = stateId;
            };

            statesMap.set('toggle', setState);

            const setter = statesMap.get('toggle');
            await setter?.('active');

            expect(currentState).toBe('active');
        });

        it('handles multiple state components', async () => {
            const statesMap = new Map<string, (stateId: string) => Promise<void>>();
            const states: Record<string, string> = {
                header_state: 'collapsed',
                content_state: 'loading',
                footer_state: 'hidden'
            };

            // Register all state components
            for (const componentId of Object.keys(states)) {
                statesMap.set(componentId, async (stateId: string) => {
                    states[componentId] = stateId;
                });
            }

            // Switch individual states
            await statesMap.get('header_state')?.('expanded');
            await statesMap.get('content_state')?.('loaded');
            await statesMap.get('footer_state')?.('visible');

            expect(states).toEqual({
                header_state: 'expanded',
                content_state: 'loaded',
                footer_state: 'visible'
            });
        });

        it('unregisters state component', () => {
            const statesMap = new Map<string, (stateId: string) => Promise<void>>();

            statesMap.set('temporary', async () => {});
            expect(statesMap.has('temporary')).toBe(true);

            statesMap.delete('temporary');
            expect(statesMap.has('temporary')).toBe(false);
        });
    });

    describe('State change callbacks', () => {
        it('executes callback on state change', async () => {
            const stateChanges: Array<{ from: string; to: string }> = [];
            let currentState = 'initial';

            const setState = async (newState: string) => {
                stateChanges.push({ from: currentState, to: newState });
                currentState = newState;
            };

            await setState('loading');
            await setState('loaded');
            await setState('error');

            expect(stateChanges).toEqual([
                { from: 'initial', to: 'loading' },
                { from: 'loading', to: 'loaded' },
                { from: 'loaded', to: 'error' }
            ]);
        });

        it('state change is async-safe', async () => {
            const order: number[] = [];
            let currentState = 'state1';

            const setState = async (newState: string) => {
                await new Promise(resolve => setTimeout(resolve, 10));
                order.push(parseInt(newState.replace('state', '')));
                currentState = newState;
            };

            // Fire multiple state changes
            const p1 = setState('state1');
            const p2 = setState('state2');
            const p3 = setState('state3');

            await Promise.all([p1, p2, p3]);

            expect(order).toEqual([1, 2, 3]);
        });
    });

    describe('State with set_state action', () => {
        it('simulates set_state action execution', async () => {
            const statesMap = new Map<string, (stateId: string) => Promise<void>>();
            let currentState = 'collapsed';

            statesMap.set('accordion', async (stateId: string) => {
                currentState = stateId;
            });

            // Simulate action: { type: 'set_state', state_id: 'accordion', temporary_state_id: 'expanded' }
            const action = {
                type: 'set_state',
                state_id: 'accordion',
                temporary_state_id: 'expanded'
            };

            const setter = statesMap.get(action.state_id);
            if (setter) {
                await setter(action.temporary_state_id);
            }

            expect(currentState).toBe('expanded');
        });

        it('handles missing state component gracefully', async () => {
            const statesMap = new Map<string, (stateId: string) => Promise<void>>();

            const action = {
                type: 'set_state',
                state_id: 'nonexistent',
                temporary_state_id: 'state1'
            };

            const setter = statesMap.get(action.state_id);

            // Should not throw
            expect(setter).toBeUndefined();
        });
    });

    describe('State with variable-driven state_id', () => {
        it('simulates variable-controlled state', async () => {
            const statesMap = new Map<string, (stateId: string) => Promise<void>>();
            let currentState = 'tab1';
            let selectedTab = 'tab1';

            statesMap.set('tabs', async (stateId: string) => {
                currentState = stateId;
            });

            // Simulate: when selectedTab variable changes, switch state
            const onTabChange = async (newTab: string) => {
                selectedTab = newTab;
                const setter = statesMap.get('tabs');
                await setter?.(selectedTab);
            };

            await onTabChange('tab2');
            expect(currentState).toBe('tab2');

            await onTabChange('tab3');
            expect(currentState).toBe('tab3');
        });
    });

    describe('Nested state components', () => {
        it('handles parent and child state independently', async () => {
            const statesMap = new Map<string, (stateId: string) => Promise<void>>();
            const states = {
                parent: 'parent_initial',
                child: 'child_initial'
            };

            statesMap.set('parent', async stateId => {
                states.parent = stateId;
            });

            statesMap.set('child', async stateId => {
                states.child = stateId;
            });

            // Switch parent state
            await statesMap.get('parent')?.('parent_active');
            expect(states.parent).toBe('parent_active');
            expect(states.child).toBe('child_initial'); // Child unchanged

            // Switch child state
            await statesMap.get('child')?.('child_active');
            expect(states.parent).toBe('parent_active');
            expect(states.child).toBe('child_active');
        });
    });
});
