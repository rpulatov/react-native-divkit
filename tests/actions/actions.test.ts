/**
 * Tests for Action handlers
 */

import { arrayInsert, arrayRemove, arraySet } from '../../src/actions/array';
import { dictSetValue } from '../../src/actions/dict';
import { copyToClipboard, initClipboard } from '../../src/actions/copyToClipboard';
import { updateStructure } from '../../src/actions/updateStructure';
import { createVariable, ArrayVariable, DictVariable } from '../../src/expressions/variable';
import type { WrappedError } from '../../typings/common';

describe('Action Handlers', () => {
    let logError: jest.Mock<void, [WrappedError]>;
    let variables: Map<string, any>;

    beforeEach(() => {
        logError = jest.fn();
        variables = new Map();
    });

    describe('arrayInsert', () => {
        it('inserts value at the end when no index specified', () => {
            const arr = createVariable('items', 'array', [1, 2, 3]);
            variables.set('items', arr);

            arrayInsert(undefined, variables, logError, {
                type: 'array_insert_value',
                variable_name: 'items',
                value: { type: 'integer', value: 4 }
            });

            expect(arr.getValue()).toEqual([1, 2, 3, 4]);
            expect(logError).not.toHaveBeenCalled();
        });

        it('inserts value at specific index', () => {
            const arr = createVariable('items', 'array', [1, 2, 3]);
            variables.set('items', arr);

            arrayInsert(undefined, variables, logError, {
                type: 'array_insert_value',
                variable_name: 'items',
                index: 1,
                value: { type: 'integer', value: 99 }
            });

            expect(arr.getValue()).toEqual([1, 99, 2, 3]);
        });

        it('logs error for out of bounds index', () => {
            const arr = createVariable('items', 'array', [1, 2]);
            variables.set('items', arr);

            arrayInsert(undefined, variables, logError, {
                type: 'array_insert_value',
                variable_name: 'items',
                index: 10,
                value: { type: 'integer', value: 1 }
            });

            expect(logError).toHaveBeenCalled();
        });

        it('logs error when variable not found', () => {
            arrayInsert(undefined, variables, logError, {
                type: 'array_insert_value',
                variable_name: 'nonexistent',
                value: { type: 'integer', value: 1 }
            });

            expect(logError).toHaveBeenCalled();
        });

        it('logs error for non-array variable', () => {
            const str = createVariable('str', 'string', 'hello');
            variables.set('str', str);

            arrayInsert(undefined, variables, logError, {
                type: 'array_insert_value',
                variable_name: 'str',
                value: { type: 'string', value: 'x' }
            });

            expect(logError).toHaveBeenCalled();
        });
    });

    describe('arrayRemove', () => {
        it('removes value at index', () => {
            const arr = createVariable('items', 'array', [1, 2, 3]);
            variables.set('items', arr);

            arrayRemove(undefined, variables, logError, {
                type: 'array_remove_value',
                variable_name: 'items',
                index: 1
            });

            expect(arr.getValue()).toEqual([1, 3]);
        });

        it('logs error for out of bounds index', () => {
            const arr = createVariable('items', 'array', [1, 2]);
            variables.set('items', arr);

            arrayRemove(undefined, variables, logError, {
                type: 'array_remove_value',
                variable_name: 'items',
                index: 5
            });

            expect(logError).toHaveBeenCalled();
        });

        it('logs error when index is not a number', () => {
            const arr = createVariable('items', 'array', [1, 2]);
            variables.set('items', arr);

            arrayRemove(undefined, variables, logError, {
                type: 'array_remove_value',
                variable_name: 'items',
                index: 'invalid' as any
            });

            expect(logError).toHaveBeenCalled();
        });
    });

    describe('arraySet', () => {
        it('sets value at index', () => {
            const arr = createVariable('items', 'array', [1, 2, 3]);
            variables.set('items', arr);

            arraySet(undefined, variables, logError, {
                type: 'array_set_value',
                variable_name: 'items',
                index: 1,
                value: { type: 'integer', value: 99 }
            });

            expect(arr.getValue()).toEqual([1, 99, 3]);
        });

        it('logs error for out of bounds index', () => {
            const arr = createVariable('items', 'array', [1, 2]);
            variables.set('items', arr);

            arraySet(undefined, variables, logError, {
                type: 'array_set_value',
                variable_name: 'items',
                index: 10,
                value: { type: 'integer', value: 1 }
            });

            expect(logError).toHaveBeenCalled();
        });
    });

    describe('dictSetValue', () => {
        it('sets value in dict', () => {
            const dict = createVariable('data', 'dict', { a: 1 });
            variables.set('data', dict);

            dictSetValue(undefined, variables, logError, {
                type: 'dict_set_value',
                variable_name: 'data',
                key: 'b',
                value: { type: 'integer', value: 2 }
            });

            expect(dict.getValue()).toEqual({ a: 1, b: 2 });
        });

        it('deletes key when value is undefined', () => {
            const dict = createVariable('data', 'dict', { a: 1, b: 2 });
            variables.set('data', dict);

            dictSetValue(undefined, variables, logError, {
                type: 'dict_set_value',
                variable_name: 'data',
                key: 'a',
                value: undefined
            });

            expect(dict.getValue()).toEqual({ b: 2 });
        });

        it('logs error when key is not a string', () => {
            const dict = createVariable('data', 'dict', {});
            variables.set('data', dict);

            dictSetValue(undefined, variables, logError, {
                type: 'dict_set_value',
                variable_name: 'data',
                key: 123 as any,
                value: { type: 'integer', value: 1 }
            });

            expect(logError).toHaveBeenCalled();
        });

        it('logs error for non-dict variable', () => {
            const arr = createVariable('arr', 'array', []);
            variables.set('arr', arr);

            dictSetValue(undefined, variables, logError, {
                type: 'dict_set_value',
                variable_name: 'arr',
                key: 'key',
                value: { type: 'integer', value: 1 }
            });

            expect(logError).toHaveBeenCalled();
        });
    });

    describe('updateStructure', () => {
        it('updates nested dict value', () => {
            const dict = createVariable('data', 'dict', { nested: { key: 'old' } });
            variables.set('data', dict);

            updateStructure(undefined, variables, logError, {
                type: 'update_structure',
                variable_name: 'data',
                path: 'nested/key',
                value: { type: 'string', value: 'new' }
            });

            expect(dict.getValue()).toEqual({ nested: { key: 'new' } });
        });

        it('updates array element by index', () => {
            const arr = createVariable('items', 'array', [{ name: 'a' }, { name: 'b' }]);
            variables.set('items', arr);

            updateStructure(undefined, variables, logError, {
                type: 'update_structure',
                variable_name: 'items',
                path: '0/name',
                value: { type: 'string', value: 'updated' }
            });

            expect(arr.getValue()).toEqual([{ name: 'updated' }, { name: 'b' }]);
        });

        it('logs error for invalid path', () => {
            const dict = createVariable('data', 'dict', {});
            variables.set('data', dict);

            updateStructure(undefined, variables, logError, {
                type: 'update_structure',
                variable_name: 'data',
                path: '/invalid/',
                value: { type: 'string', value: 'test' }
            });

            expect(logError).toHaveBeenCalled();
        });

        it('logs error when path element not found', () => {
            const dict = createVariable('data', 'dict', {});
            variables.set('data', dict);

            updateStructure(undefined, variables, logError, {
                type: 'update_structure',
                variable_name: 'data',
                path: 'a/b/c',
                value: { type: 'string', value: 'test' }
            });

            expect(logError).toHaveBeenCalled();
        });
    });

    describe('copyToClipboard', () => {
        const mockClipboard = {
            setString: jest.fn()
        };

        beforeEach(() => {
            mockClipboard.setString.mockClear();
            initClipboard(mockClipboard);
        });

        it('copies text to clipboard', () => {
            copyToClipboard(logError, {
                type: 'copy_to_clipboard',
                content: { type: 'text', value: 'Hello, World!' }
            });

            expect(mockClipboard.setString).toHaveBeenCalledWith('Hello, World!');
            expect(logError).not.toHaveBeenCalled();
        });

        it('copies url to clipboard', () => {
            copyToClipboard(logError, {
                type: 'copy_to_clipboard',
                content: { type: 'url', value: 'https://example.com' }
            });

            expect(mockClipboard.setString).toHaveBeenCalledWith('https://example.com');
        });

        it('logs error for invalid content type', () => {
            copyToClipboard(logError, {
                type: 'copy_to_clipboard',
                content: { type: 'invalid' as any, value: 'test' }
            });

            expect(logError).toHaveBeenCalled();
            expect(mockClipboard.setString).not.toHaveBeenCalled();
        });

        it('logs error when content value is not a string', () => {
            copyToClipboard(logError, {
                type: 'copy_to_clipboard',
                content: { type: 'text', value: 123 as any }
            });

            expect(logError).toHaveBeenCalled();
        });
    });
});
