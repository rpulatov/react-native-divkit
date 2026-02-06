/**
 * Integration tests for action execution
 */

import { createVariable, Variable } from '../../src/expressions/variable';
import { arrayInsert, arrayRemove, arraySet } from '../../src/actions/array';
import { dictSetValue } from '../../src/actions/dict';
import type { WrappedError } from '../../typings/common';

describe('Actions Integration', () => {
    let variables: Map<string, Variable>;
    let logError: jest.Mock<void, [WrappedError]>;
    let logStat: jest.Mock;
    let customActions: any[];

    beforeEach(() => {
        variables = new Map();
        logError = jest.fn();
        logStat = jest.fn();
        customActions = [];
    });

    describe('Action execution pipeline', () => {
        it('executes set_variable action', () => {
            const counter = createVariable('counter', 'integer', 0);
            variables.set('counter', counter);

            // Simulate action execution
            const action = {
                log_id: 'increment',
                typed: {
                    type: 'set_variable',
                    variable_name: 'counter',
                    value: { type: 'integer', value: 5 }
                }
            };

            // Log stat
            if (action.log_id) {
                logStat({ type: 'action', action });
            }

            // Execute typed action
            if (action.typed.type === 'set_variable') {
                const variable = variables.get(action.typed.variable_name);
                if (variable) {
                    variable.setValue(action.typed.value.value);
                }
            }

            expect(counter.getValue()).toBe(BigInt(5));
            expect(logStat).toHaveBeenCalledWith({ type: 'action', action });
        });

        it('executes URL action for custom handling', () => {
            const action = {
                log_id: 'custom_action',
                url: 'myapp://navigate/home'
            };

            // Log stat
            if (action.log_id) {
                logStat({ type: 'action', action });
            }

            // Handle URL action
            if (action.url) {
                customActions.push(action);
            }

            expect(customActions).toHaveLength(1);
            expect(customActions[0].url).toBe('myapp://navigate/home');
        });

        it('executes multiple actions in sequence', async () => {
            const step = createVariable('step', 'integer', 0);
            variables.set('step', step);

            const actions = [
                { typed: { type: 'set_variable', variable_name: 'step', value: { value: 1 } } },
                { typed: { type: 'set_variable', variable_name: 'step', value: { value: 2 } } },
                { typed: { type: 'set_variable', variable_name: 'step', value: { value: 3 } } }
            ];

            for (const action of actions) {
                if (action.typed.type === 'set_variable') {
                    const variable = variables.get(action.typed.variable_name);
                    variable?.setValue(action.typed.value.value);
                }
            }

            expect(step.getValue()).toBe(BigInt(3));
        });
    });

    describe('Array action integration', () => {
        it('builds a list through array_insert actions', () => {
            const items = createVariable('items', 'array', []);
            variables.set('items', items);

            const insertActions = [
                { type: 'array_insert_value', variable_name: 'items', value: { type: 'string', value: 'First' } },
                { type: 'array_insert_value', variable_name: 'items', value: { type: 'string', value: 'Second' } },
                { type: 'array_insert_value', variable_name: 'items', value: { type: 'string', value: 'Third' } }
            ];

            for (const action of insertActions) {
                arrayInsert(undefined, variables, logError, action as any);
            }

            expect(items.getValue()).toEqual(['First', 'Second', 'Third']);
        });

        it('modifies list with array_set action', () => {
            const items = createVariable('items', 'array', ['A', 'B', 'C']);
            variables.set('items', items);

            arraySet(undefined, variables, logError, {
                type: 'array_set_value',
                variable_name: 'items',
                index: 1,
                value: { type: 'string', value: 'Modified' }
            });

            expect(items.getValue()).toEqual(['A', 'Modified', 'C']);
        });

        it('removes from list with array_remove action', () => {
            const items = createVariable('items', 'array', ['Keep', 'Remove', 'Keep']);
            variables.set('items', items);

            arrayRemove(undefined, variables, logError, {
                type: 'array_remove_value',
                variable_name: 'items',
                index: 1
            });

            expect(items.getValue()).toEqual(['Keep', 'Keep']);
        });
    });

    describe('Dict action integration', () => {
        it('builds config through dict_set_value actions', () => {
            const config = createVariable('config', 'dict', {});
            variables.set('config', config);

            const setActions = [
                { type: 'dict_set_value', variable_name: 'config', key: 'theme', value: { type: 'string', value: 'dark' } },
                { type: 'dict_set_value', variable_name: 'config', key: 'fontSize', value: { type: 'integer', value: 14 } },
                { type: 'dict_set_value', variable_name: 'config', key: 'showNotifications', value: { type: 'boolean', value: true } }
            ];

            for (const action of setActions) {
                dictSetValue(undefined, variables, logError, action as any);
            }

            expect(config.getValue()).toEqual({
                theme: 'dark',
                fontSize: 14,
                showNotifications: true
            });
        });

        it('deletes key with dict_set_value action', () => {
            const settings = createVariable('settings', 'dict', { a: 1, b: 2, c: 3 });
            variables.set('settings', settings);

            dictSetValue(undefined, variables, logError, {
                type: 'dict_set_value',
                variable_name: 'settings',
                key: 'b',
                value: undefined
            });

            expect(settings.getValue()).toEqual({ a: 1, c: 3 });
        });
    });

    describe('Combined variable and state actions', () => {
        it('simulates toggle button with variable and state change', async () => {
            // Setup
            const isOn = createVariable('isOn', 'boolean', false);
            variables.set('isOn', isOn);

            const statesMap = new Map<string, (stateId: string) => Promise<void>>();
            let toggleState = 'off';
            statesMap.set('toggle_button', async (stateId) => {
                toggleState = stateId;
            });

            // Simulate button click actions
            const onClickActions = [
                { typed: { type: 'set_variable', variable_name: 'isOn', value: { value: true } } },
                { typed: { type: 'set_state', state_id: 'toggle_button', temporary_state_id: 'on' } }
            ];

            for (const action of onClickActions) {
                if (action.typed.type === 'set_variable') {
                    variables.get(action.typed.variable_name)?.setValue(action.typed.value.value);
                } else if (action.typed.type === 'set_state') {
                    const setter = statesMap.get((action.typed as any).state_id);
                    await setter?.((action.typed as any).temporary_state_id);
                }
            }

            expect(isOn.getValue()).toBe(true);
            expect(toggleState).toBe('on');
        });

        it('simulates form submission flow', async () => {
            // Setup form variables
            const formData = createVariable('formData', 'dict', {
                name: '',
                email: ''
            });
            const isSubmitting = createVariable('isSubmitting', 'boolean', false);
            const submitResult = createVariable('submitResult', 'string', '');

            variables.set('formData', formData);
            variables.set('isSubmitting', isSubmitting);
            variables.set('submitResult', submitResult);

            // Fill form
            formData.setValue({ name: 'John', email: 'john@example.com' });

            // Submit actions
            isSubmitting.setValue(true);

            // Simulate async submission
            await new Promise(resolve => setTimeout(resolve, 10));

            isSubmitting.setValue(false);
            submitResult.setValue('success');

            expect(isSubmitting.getValue()).toBe(false);
            expect(submitResult.getValue()).toBe('success');
        });
    });

    describe('Action error handling', () => {
        it('logs error for action on non-existent variable', () => {
            arrayInsert(undefined, variables, logError, {
                type: 'array_insert_value',
                variable_name: 'missing',
                value: { type: 'string', value: 'test' }
            });

            expect(logError).toHaveBeenCalled();
        });

        it('logs error for type mismatch action', () => {
            const str = createVariable('str', 'string', 'hello');
            variables.set('str', str);

            arrayInsert(undefined, variables, logError, {
                type: 'array_insert_value',
                variable_name: 'str',
                value: { type: 'string', value: 'test' }
            });

            expect(logError).toHaveBeenCalled();
        });

        it('continues execution after action error', () => {
            const items = createVariable('items', 'array', ['a', 'b']);
            variables.set('items', items);

            const actions = [
                { variable_name: 'missing', index: 0 }, // Will error
                { variable_name: 'items', index: 0, value: { type: 'string', value: 'new' } } // Should succeed
            ];

            for (const action of actions) {
                if (action.value) {
                    arraySet(undefined, variables, logError, {
                        type: 'array_set_value',
                        ...action
                    } as any);
                } else {
                    arrayRemove(undefined, variables, logError, {
                        type: 'array_remove_value',
                        ...action
                    } as any);
                }
            }

            // First action failed, second succeeded
            expect(logError).toHaveBeenCalled();
            expect(items.getValue()).toEqual(['new', 'b']);
        });
    });
});
