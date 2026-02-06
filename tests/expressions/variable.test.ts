/**
 * Tests for Variable system
 */

import {
    createVariable,
    createConstVariable,
    StringVariable,
    NumberVariable,
    IntegerVariable,
    BooleanVariable,
    ColorVariable,
    UrlVariable,
    DictVariable,
    ArrayVariable,
    defaultValueByType,
    variableToValue,
    variableValueFromString
} from '../../src/expressions/variable';

describe('Variable System', () => {
    describe('createVariable', () => {
        it('creates string variable', () => {
            const variable = createVariable('test', 'string', 'hello');
            expect(variable.getName()).toBe('test');
            expect(variable.getValue()).toBe('hello');
            expect(variable.getType()).toBe('string');
        });

        it('creates number variable', () => {
            const variable = createVariable('num', 'number', 42.5);
            expect(variable.getValue()).toBe(42.5);
            expect(variable.getType()).toBe('number');
        });

        it('creates integer variable', () => {
            const variable = createVariable('int', 'integer', 100);
            expect(variable.getValue()).toBe(BigInt(100));
            expect(variable.getType()).toBe('integer');
        });

        it('creates boolean variable', () => {
            const variable = createVariable('bool', 'boolean', true);
            expect(variable.getValue()).toBe(true);
            expect(variable.getType()).toBe('boolean');
        });

        it('creates color variable', () => {
            const variable = createVariable('color', 'color', '#FF0000');
            expect(variable.getValue()).toBe('#FFFF0000');
            expect(variable.getType()).toBe('color');
        });

        it('creates url variable', () => {
            const variable = createVariable('url', 'url', 'https://example.com');
            expect(variable.getValue()).toBe('https://example.com');
            expect(variable.getType()).toBe('url');
        });

        it('creates dict variable', () => {
            const dict = { key: 'value' };
            const variable = createVariable('dict', 'dict', dict);
            expect(variable.getValue()).toEqual(dict);
            expect(variable.getType()).toBe('dict');
        });

        it('creates array variable', () => {
            const arr = [1, 2, 3];
            const variable = createVariable('arr', 'array', arr);
            expect(variable.getValue()).toEqual(arr);
            expect(variable.getType()).toBe('array');
        });

        it('throws on unsupported type', () => {
            expect(() => createVariable('test', 'unknown' as any, 'value')).toThrow('Unsupported variable type');
        });
    });

    describe('StringVariable', () => {
        it('stores and retrieves string value', () => {
            const variable = new StringVariable('str', 'hello');
            expect(variable.getValue()).toBe('hello');
        });

        it('updates value with setValue', () => {
            const variable = new StringVariable('str', 'hello');
            variable.setValue('world');
            expect(variable.getValue()).toBe('world');
        });

        it('updates value with set (string)', () => {
            const variable = new StringVariable('str', 'hello');
            variable.set('world');
            expect(variable.getValue()).toBe('world');
        });

        it('throws on non-string value', () => {
            expect(() => new StringVariable('str', 123 as any)).toThrow('Incorrect variable value');
        });

        it('supports subscription', () => {
            const variable = new StringVariable('str', 'initial');
            const values: string[] = [];

            const unsubscribe = variable.subscribe(val => values.push(val));
            variable.setValue('updated');
            unsubscribe();
            variable.setValue('after unsubscribe');

            expect(values).toEqual(['initial', 'updated']);
        });
    });

    describe('NumberVariable', () => {
        it('stores and retrieves number value', () => {
            const variable = new NumberVariable('num', 3.14);
            expect(variable.getValue()).toBe(3.14);
        });

        it('throws on NaN', () => {
            expect(() => new NumberVariable('num', NaN)).toThrow('Incorrect variable value');
        });

        it('throws on Infinity', () => {
            expect(() => new NumberVariable('num', Infinity)).toThrow('Incorrect variable value');
        });

        it('parses from string', () => {
            const variable = new NumberVariable('num', 0);
            variable.set('42.5');
            expect(variable.getValue()).toBe(42.5);
        });
    });

    describe('IntegerVariable', () => {
        it('stores and retrieves bigint value', () => {
            const variable = new IntegerVariable('int', 100);
            expect(variable.getValue()).toBe(BigInt(100));
        });

        it('converts number to bigint', () => {
            const variable = new IntegerVariable('int', 42);
            expect(variable.getValue()).toBe(BigInt(42));
        });

        it('accepts bigint directly', () => {
            const variable = new IntegerVariable('int', BigInt(999));
            expect(variable.getValue()).toBe(BigInt(999));
        });

        it('parses from string', () => {
            const variable = new IntegerVariable('int', 0);
            variable.set('12345');
            expect(variable.getValue()).toBe(BigInt(12345));
        });
    });

    describe('BooleanVariable', () => {
        it('stores true', () => {
            const variable = new BooleanVariable('bool', true);
            expect(variable.getValue()).toBe(true);
        });

        it('stores false', () => {
            const variable = new BooleanVariable('bool', false);
            expect(variable.getValue()).toBe(false);
        });

        it('converts 1 to true', () => {
            const variable = new BooleanVariable('bool', 1 as any);
            expect(variable.getValue()).toBe(true);
        });

        it('converts 0 to false', () => {
            const variable = new BooleanVariable('bool', 0 as any);
            expect(variable.getValue()).toBe(false);
        });

        it('parses "true" from string', () => {
            const variable = new BooleanVariable('bool', false);
            variable.set('true');
            expect(variable.getValue()).toBe(true);
        });

        it('parses "false" from string', () => {
            const variable = new BooleanVariable('bool', true);
            variable.set('false');
            expect(variable.getValue()).toBe(false);
        });

        it('parses "1" from string', () => {
            const variable = new BooleanVariable('bool', false);
            variable.set('1');
            expect(variable.getValue()).toBe(true);
        });

        it('parses "0" from string', () => {
            const variable = new BooleanVariable('bool', true);
            variable.set('0');
            expect(variable.getValue()).toBe(false);
        });

        it('throws on invalid string', () => {
            const variable = new BooleanVariable('bool', true);
            expect(() => variable.set('invalid')).toThrow('Incorrect variable value');
        });
    });

    describe('ColorVariable', () => {
        it('stores valid hex color', () => {
            const variable = new ColorVariable('color', '#FF0000');
            expect(variable.getValue()).toBe('#FFFF0000');
        });

        it('throws on invalid color', () => {
            expect(() => new ColorVariable('color', 'not-a-color')).toThrow('Incorrect variable value');
        });
    });

    describe('UrlVariable', () => {
        it('stores valid URL', () => {
            const variable = new UrlVariable('url', 'https://example.com/path');
            expect(variable.getValue()).toBe('https://example.com/path');
        });
    });

    describe('DictVariable', () => {
        it('stores dict object', () => {
            const dict = { a: 1, b: 'two' };
            const variable = new DictVariable('dict', dict);
            expect(variable.getValue()).toEqual(dict);
        });

        it('parses from JSON string', () => {
            const variable = new DictVariable('dict', {});
            variable.set('{"key": "value"}');
            expect(variable.getValue()).toEqual({ key: 'value' });
        });

        it('throws on invalid JSON', () => {
            const variable = new DictVariable('dict', {});
            expect(() => variable.set('not-json')).toThrow('Incorrect dict value');
        });

        it('throws on null', () => {
            expect(() => new DictVariable('dict', null as any)).toThrow('Incorrect variable value');
        });
    });

    describe('ArrayVariable', () => {
        it('stores array', () => {
            const arr = [1, 'two', true];
            const variable = new ArrayVariable('arr', arr);
            expect(variable.getValue()).toEqual(arr);
        });

        it('parses from JSON string', () => {
            const variable = new ArrayVariable('arr', []);
            variable.set('[1, 2, 3]');
            expect(variable.getValue()).toEqual([1, 2, 3]);
        });

        it('throws on non-array', () => {
            expect(() => new ArrayVariable('arr', 'not-array' as any)).toThrow('Incorrect variable value');
        });
    });

    describe('createConstVariable', () => {
        it('creates const variable that cannot be changed', () => {
            const variable = createConstVariable('const', 'string', 'immutable');
            expect(variable.getValue()).toBe('immutable');
            expect(() => variable.setValue('changed')).toThrow('Cannot change the value of this type of variable');
        });

        it('supports subscribe without store', () => {
            const variable = createConstVariable('const', 'number', 42);
            const values: number[] = [];

            const unsubscribe = variable.subscribe(val => values.push(val));
            unsubscribe(); // Should not throw

            expect(values).toEqual([42]);
        });
    });

    describe('defaultValueByType', () => {
        it('returns empty string for string type', () => {
            expect(defaultValueByType('string')).toBe('');
        });

        it('returns 0 for number type', () => {
            expect(defaultValueByType('number')).toBe(0);
        });

        it('returns BigInt(0) for integer type', () => {
            expect(defaultValueByType('integer')).toBe(BigInt(0));
        });

        it('returns 0 for boolean type', () => {
            expect(defaultValueByType('boolean')).toBe(0);
        });

        it('returns empty object for dict type', () => {
            expect(defaultValueByType('dict')).toEqual({});
        });

        it('returns empty array for array type', () => {
            expect(defaultValueByType('array')).toEqual([]);
        });

        it('returns empty string for color type', () => {
            expect(defaultValueByType('color')).toBe('');
        });

        it('returns empty string for url type', () => {
            expect(defaultValueByType('url')).toBe('');
        });
    });

    describe('variableToValue', () => {
        it('converts string variable', () => {
            const variable = new StringVariable('str', 'test');
            const result = variableToValue(variable);
            expect(result).toEqual({ type: 'string', value: 'test' });
        });

        it('converts number variable', () => {
            const variable = new NumberVariable('num', 42);
            const result = variableToValue(variable);
            expect(result).toEqual({ type: 'number', value: 42 });
        });

        it('converts boolean variable (true) to 1', () => {
            const variable = new BooleanVariable('bool', true);
            const result = variableToValue(variable);
            expect(result).toEqual({ type: 'boolean', value: 1 });
        });

        it('converts boolean variable (false) to 0', () => {
            const variable = new BooleanVariable('bool', false);
            const result = variableToValue(variable);
            expect(result).toEqual({ type: 'boolean', value: 0 });
        });
    });

    describe('variableValueFromString', () => {
        it('parses string type', () => {
            expect(variableValueFromString('hello', 'string')).toBe('hello');
        });

        it('parses number type', () => {
            expect(variableValueFromString('42.5', 'number')).toBe(42.5);
        });

        it('parses integer type', () => {
            expect(variableValueFromString('100', 'integer')).toBe(BigInt(100));
        });

        it('parses boolean true', () => {
            expect(variableValueFromString('true', 'boolean')).toBe(true);
        });

        it('parses boolean false', () => {
            expect(variableValueFromString('false', 'boolean')).toBe(false);
        });

        it('parses dict type', () => {
            expect(variableValueFromString('{"a": 1}', 'dict')).toEqual({ a: 1 });
        });

        it('parses array type', () => {
            expect(variableValueFromString('[1, 2]', 'array')).toEqual([1, 2]);
        });

        it('throws on invalid number', () => {
            expect(() => variableValueFromString('not-a-number', 'number')).toThrow('Incorrect variable value');
        });

        it('throws on invalid boolean', () => {
            expect(() => variableValueFromString('maybe', 'boolean')).toThrow('Incorrect variable value');
        });
    });
});
