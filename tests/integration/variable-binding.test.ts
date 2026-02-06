/**
 * Integration tests for variable binding and reactivity
 */

import { createVariable, Variable } from '../../src/expressions/variable';

describe('Variable Binding Integration', () => {
    describe('Variable subscription and updates', () => {
        it('notifies subscribers when value changes', () => {
            const variable = createVariable('counter', 'integer', 0);
            const values: bigint[] = [];

            variable.subscribe(val => values.push(val));

            variable.setValue(1);
            variable.setValue(2);
            variable.setValue(3);

            expect(values).toEqual([BigInt(0), BigInt(1), BigInt(2), BigInt(3)]);
        });

        it('multiple subscribers receive updates', () => {
            const variable = createVariable('shared', 'string', 'initial');
            const subscriber1Values: string[] = [];
            const subscriber2Values: string[] = [];

            variable.subscribe(val => subscriber1Values.push(val));
            variable.subscribe(val => subscriber2Values.push(val));

            variable.setValue('updated');

            expect(subscriber1Values).toEqual(['initial', 'updated']);
            expect(subscriber2Values).toEqual(['initial', 'updated']);
        });

        it('unsubscribed callbacks stop receiving updates', () => {
            const variable = createVariable('test', 'number', 0);
            const values: number[] = [];

            const unsubscribe = variable.subscribe(val => values.push(val));

            variable.setValue(1);
            unsubscribe();
            variable.setValue(2);

            expect(values).toEqual([0, 1]);
        });

        it('handles rapid updates correctly', () => {
            const variable = createVariable('rapid', 'number', 0);
            let lastValue = 0;

            variable.subscribe(val => {
                lastValue = val;
            });

            for (let i = 1; i <= 100; i++) {
                variable.setValue(i);
            }

            expect(lastValue).toBe(100);
        });
    });

    describe('Variable Map for component context', () => {
        it('stores and retrieves multiple variables', () => {
            const variables = new Map<string, Variable>();

            variables.set('name', createVariable('name', 'string', 'John'));
            variables.set('age', createVariable('age', 'integer', 30));
            variables.set('active', createVariable('active', 'boolean', true));

            expect(variables.get('name')?.getValue()).toBe('John');
            expect(variables.get('age')?.getValue()).toBe(BigInt(30));
            expect(variables.get('active')?.getValue()).toBe(true);
        });

        it('updates are isolated to specific variable', () => {
            const variables = new Map<string, Variable>();

            const var1 = createVariable('var1', 'string', 'initial1');
            const var2 = createVariable('var2', 'string', 'initial2');

            variables.set('var1', var1);
            variables.set('var2', var2);

            const var1Updates: string[] = [];
            const var2Updates: string[] = [];

            var1.subscribe(val => var1Updates.push(val));
            var2.subscribe(val => var2Updates.push(val));

            var1.setValue('updated1');

            expect(var1Updates).toEqual(['initial1', 'updated1']);
            expect(var2Updates).toEqual(['initial2']); // var2 unchanged
        });
    });

    describe('Complex variable types', () => {
        it('dict variable updates trigger subscriptions', () => {
            const variable = createVariable('config', 'dict', { theme: 'light' });
            const values: object[] = [];

            variable.subscribe(val => values.push({ ...(val as object) }));

            variable.setValue({ theme: 'dark', fontSize: 14 });

            expect(values).toHaveLength(2);
            expect(values[0]).toEqual({ theme: 'light' });
            expect(values[1]).toEqual({ theme: 'dark', fontSize: 14 });
        });

        it('array variable updates trigger subscriptions', () => {
            const variable = createVariable('items', 'array', [1, 2, 3]);
            const values: unknown[][] = [];

            variable.subscribe(val => values.push([...val]));

            variable.setValue([1, 2, 3, 4]);

            expect(values).toHaveLength(2);
            expect(values[0]).toEqual([1, 2, 3]);
            expect(values[1]).toEqual([1, 2, 3, 4]);
        });
    });

    describe('Expression-like variable usage', () => {
        it('simulates expression evaluation with variable binding', () => {
            const variables = new Map<string, Variable>();
            variables.set('firstName', createVariable('firstName', 'string', 'John'));
            variables.set('lastName', createVariable('lastName', 'string', 'Doe'));

            // Simulate expression: "@{firstName} @{lastName}"
            const evaluateFullName = () => {
                const first = variables.get('firstName')?.getValue() as string;
                const last = variables.get('lastName')?.getValue() as string;
                return `${first} ${last}`;
            };

            expect(evaluateFullName()).toBe('John Doe');

            variables.get('firstName')?.setValue('Jane');
            expect(evaluateFullName()).toBe('Jane Doe');
        });

        it('simulates conditional expression', () => {
            const variables = new Map<string, Variable>();
            variables.set('isLoggedIn', createVariable('isLoggedIn', 'boolean', false));
            variables.set('userName', createVariable('userName', 'string', 'Guest'));

            // Simulate expression: "@{isLoggedIn ? userName : 'Please login'}"
            const evaluateMessage = () => {
                const isLoggedIn = variables.get('isLoggedIn')?.getValue() as boolean;
                const userName = variables.get('userName')?.getValue() as string;
                return isLoggedIn ? userName : 'Please login';
            };

            expect(evaluateMessage()).toBe('Please login');

            variables.get('isLoggedIn')?.setValue(true);
            variables.get('userName')?.setValue('Alice');

            expect(evaluateMessage()).toBe('Alice');
        });

        it('simulates arithmetic expression', () => {
            const variables = new Map<string, Variable>();
            variables.set('price', createVariable('price', 'number', 100));
            variables.set('quantity', createVariable('quantity', 'integer', 2));
            variables.set('discount', createVariable('discount', 'number', 0.1));

            // Simulate expression: "@{price * quantity * (1 - discount)}"
            const evaluateTotal = () => {
                const price = variables.get('price')?.getValue() as number;
                const quantity = Number(variables.get('quantity')?.getValue());
                const discount = variables.get('discount')?.getValue() as number;
                return price * quantity * (1 - discount);
            };

            expect(evaluateTotal()).toBe(180);

            variables.get('quantity')?.setValue(3);
            expect(evaluateTotal()).toBe(270);
        });
    });
});
