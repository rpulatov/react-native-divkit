/**
 * Variables type definitions
 * Re-export from main Variable class
 */

import type { Variable as VariableClass } from '../src/expressions/variable';

export type Variable = VariableClass;
export type ArrayVariable = VariableClass<unknown[], 'array'>;
export type DictVariable = VariableClass<object, 'dict'>;
