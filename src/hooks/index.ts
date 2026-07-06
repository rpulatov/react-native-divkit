/**
 * DivKit React Hooks
 * Export all custom hooks for use in React Native components
 */

// Main reactivity hook - variable substitution in JSON
export { useDerivedFromVars, useDerivedFromVarsSimple, type UseDerivedFromVarsOptions } from './useDerivedFromVars';

// Variable subscription hooks
export { useVariable, useVariableInstance, useVariableSetter, useVariableState } from './useVariable';

// Action execution hooks
export { useAction, useActions, useActionHandler, useHasActions, type UseActionOptions } from './useAction';

// Local variables scope for inner nodes / templates
export { useLocalVariables } from './useLocalVariables';

// applyPatch support: parents register replaceable children
export { useParentOf, type ParentOfItem, type ReplaceItemsFn } from './useParentOf';
