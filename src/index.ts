/**
 * react-native-divkit
 *
 * React Native implementation of DivKit
 * Based on Web (TypeScript + Svelte) implementation
 *
 * MVP Scope:
 * - 4 basic components: Text, Container, Image, State
 * - Expression engine with variable system
 * - Action execution
 * - Template resolution
 *
 * @see https://github.com/divkit/divkit
 */

// Main component
export { DivKit } from './DivKit';
export type {
    DivKitProps,
    StatCallback,
    CustomActionCallback,
    ErrorCallback
} from './DivKit';

// Types
export type {
    Action,
    DivJson,
    DivBase,
    DivVariable,
    Direction,
    TemplateContext,
    BooleanInt
} from '../typings/common';

export type {
    DivBaseData
} from './types/base';

export type {
    ComponentContext
} from './types/componentContext';

// Variables
export {
    createVariable,
    Variable,
    StringVariable,
    IntegerVariable,
    NumberVariable,
    BooleanVariable,
    ColorVariable,
    UrlVariable,
    DictVariable,
    ArrayVariable
} from './expressions/variable';

export type {
    VariableType,
    VariableValue
} from './expressions/variable';

// Context hooks (for advanced usage)
export {
    useDivKitContext,
    DivKitContext
} from './context/DivKitContext';

export type {
    DivKitContextValue
} from './context/DivKitContext';

// Hooks (for custom components)
export {
    useDerivedFromVars,
    useDerivedFromVarsSimple
} from './hooks/useDerivedFromVars';

export {
    useVariable,
    useVariableInstance,
    useVariableSetter,
    useVariableState
} from './hooks/useVariable';

export {
    useAction,
    useActions,
    useActionHandler,
    useHasActions
} from './hooks/useAction';

// Utils (for advanced usage)
export { wrapError } from './utils/wrapError';
export type { WrappedError } from './utils/wrapError';

export { correctColor } from './utils/correctColor';
