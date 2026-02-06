/**
 * React hook for subscribing to a specific DivKit variable
 * Automatically updates component when variable value changes
 */

import { useEffect, useState } from 'react';
import type { Variable, VariableValue } from '../expressions/variable';
import { useDivKitContext } from '../context/DivKitContext';

/**
 * Subscribe to a variable by name and get its current value
 *
 * @param variableName Name of the variable to subscribe to
 * @returns Current value of the variable, or undefined if not found
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const userName = useVariable('userName');
 *   return <Text>Hello {userName}</Text>;
 * }
 * ```
 */
export function useVariable(variableName: string): VariableValue | undefined {
    const { getVariable } = useDivKitContext();
    const variable = getVariable(variableName);

    const [value, setValue] = useState<VariableValue | undefined>(() =>
        variable ? variable.getValue() : undefined
    );

    useEffect(() => {
        if (!variable) {
            setValue(undefined);
            return;
        }

        // Subscribe to variable changes
        const unsubscribe = variable.subscribe((newValue) => {
            setValue(newValue);
        });

        return unsubscribe;
    }, [variable]);

    return value;
}

/**
 * Subscribe to a Variable instance directly (for advanced use cases)
 *
 * @param variable Variable instance to subscribe to
 * @returns Current value of the variable
 *
 * @example
 * ```tsx
 * function MyComponent({ variable }: { variable: Variable }) {
 *   const value = useVariableInstance(variable);
 *   return <Text>{String(value)}</Text>;
 * }
 * ```
 */
export function useVariableInstance<T extends VariableValue>(
    variable: Variable<T> | undefined
): T | undefined {
    const [value, setValue] = useState<T | undefined>(() =>
        variable ? variable.getValue() : undefined
    );

    useEffect(() => {
        if (!variable) {
            setValue(undefined);
            return;
        }

        // Subscribe to variable changes
        const unsubscribe = variable.subscribe((newValue) => {
            setValue(newValue);
        });

        return unsubscribe;
    }, [variable]);

    return value;
}

/**
 * Get variable setter function
 * Returns a function that updates the variable value
 *
 * @param variableName Name of the variable
 * @returns Setter function, or undefined if variable not found
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const userName = useVariable('userName');
 *   const setUserName = useVariableSetter('userName');
 *
 *   return (
 *     <View>
 *       <Text>Hello {userName}</Text>
 *       <Button
 *         title="Change name"
 *         onPress={() => setUserName?.('Bob')}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function useVariableSetter(
    variableName: string
): ((value: VariableValue) => void) | undefined {
    const { setVariable } = useDivKitContext();

    // Return stable function reference
    return (value: VariableValue) => {
        setVariable(variableName, value);
    };
}

/**
 * Combined hook that returns both value and setter
 *
 * @param variableName Name of the variable
 * @returns Tuple of [value, setter]
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const [userName, setUserName] = useVariableState('userName');
 *
 *   return (
 *     <View>
 *       <Text>Hello {userName}</Text>
 *       <Button
 *         title="Change name"
 *         onPress={() => setUserName('Bob')}
 *       />
 *     </View>
 *   );
 * }
 * ```
 */
export function useVariableState(
    variableName: string
): [VariableValue | undefined, (value: VariableValue) => void] {
    const value = useVariable(variableName);
    const { setVariable } = useDivKitContext();

    const setter = (newValue: VariableValue) => {
        setVariable(variableName, newValue);
    };

    return [value, setter];
}
