import { writable } from '../stores/createObservable';
import type { Observable } from '../stores/createObservable';
import type { Variable } from './variable';

export class GlobalVariablesController {
    private _vars: Map<string, Variable> = new Map();
    private _lastAddedVariable: Observable<string> = writable('');

    setVariable(variable: Variable): void {
        const name = variable.getName();

        if (this._vars.has(name)) {
            throw new Error('Variable with the same name already exist');
        } else {
            this._vars.set(name, variable);
            this._lastAddedVariable.set(name);
        }
    }

    getVariable(variableName: string): Variable | undefined {
        return this._vars.get(variableName);
    }

    list(): IterableIterator<Variable> {
        return this._vars.values();
    }

    getVariables(): Map<string, Variable> {
        return this._vars;
    }

    getLastAddedVariableStore(): Observable<string> {
        return this._lastAddedVariable;
    }
}

export function createGlobalVariablesController(): GlobalVariablesController {
    return new GlobalVariablesController();
}
