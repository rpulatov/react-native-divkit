import { parse } from '../../src/expressions/expressions';
import { evalExpression } from '../../src/expressions/eval';
import { createVariable } from '../../src/expressions/variable';

describe('Expression evaluation logic for set_variable', () => {
    it('parses and evaluates integer expression in string', () => {
        const value = '@{counter + 1}';
        const variables = new Map();
        variables.set('counter', createVariable('counter', 'integer', 5));

        const ast = parse(value, { startRule: 'JsonStringContents' });
        const { result } = evalExpression(variables, undefined, undefined, ast);
        
        expect(result.type).toBe('integer');
        if (result.type === 'integer') {
            expect(result.value).toBe(BigInt(6)); 
        }
    });

    it('parses and evaluates mixed string expression', () => {
        const value = 'Value: @{counter}';
        const variables = new Map();
        variables.set('counter', createVariable('counter', 'integer', 5));

        const ast = parse(value, { startRule: 'JsonStringContents' });
        const { result } = evalExpression(variables, undefined, undefined, ast);

        expect(result.type).toBe('string');
         if (result.type === 'string') {
            expect(result.value).toBe('Value: 5');
        }
    });
});

