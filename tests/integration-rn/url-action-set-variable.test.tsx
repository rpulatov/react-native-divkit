/**
 * Regression test for div-action://set_variable URL form.
 *
 * Bug: URLSearchParams.get() returns a string, so for boolean/integer/number
 * variables the URL handler must parse via Variable.set() (fromString), NOT
 * via setValue() (which goes through convertValue and expects a typed value).
 *
 * Previously setting a boolean variable from a URL action threw
 * "Incorrect variable value" because "true" !== true.
 */

import React from 'react';
import { render, fireEvent, act } from '@testing-library/react-native';

import { DivKit } from '../../src/DivKit';

function makeButtonCard(actionUrl: string, variableType: 'boolean' | 'integer' | 'number' | 'string', initial: unknown) {
    return {
        card: {
            log_id: 'test',
            variables: [
                { name: 'flag', type: variableType, value: initial }
            ],
            states: [
                {
                    state_id: 0,
                    div: {
                        type: 'container',
                        orientation: 'vertical',
                        items: [
                            {
                                type: 'text',
                                id: 'value-text',
                                text: 'value=@{flag}'
                            },
                            {
                                type: 'text',
                                id: 'btn',
                                text: 'Test Button',
                                actions: [
                                    {
                                        log_id: 'press',
                                        url: actionUrl
                                    }
                                ]
                            }
                        ]
                    }
                }
            ]
        }
    };
}

describe('div-action://set_variable URL form', () => {
    it('parses "true" into boolean variable without error', async () => {
        const onError = jest.fn();
        const json = makeButtonCard(
            'div-action://set_variable?name=flag&value=true',
            'boolean',
            false
        );

        const { getByText } = render(<DivKit id="t" data={json} onError={onError} />);

        expect(getByText('value=false')).toBeTruthy();

        await act(async () => {
            fireEvent.press(getByText('Test Button'));
        });

        expect(onError).not.toHaveBeenCalled();
        expect(getByText('value=true')).toBeTruthy();
    });

    it('parses "false" into boolean variable without error', async () => {
        const onError = jest.fn();
        const json = makeButtonCard(
            'div-action://set_variable?name=flag&value=false',
            'boolean',
            true
        );

        const { getByText } = render(<DivKit id="t" data={json} onError={onError} />);

        expect(getByText('value=true')).toBeTruthy();

        await act(async () => {
            fireEvent.press(getByText('Test Button'));
        });

        expect(onError).not.toHaveBeenCalled();
        expect(getByText('value=false')).toBeTruthy();
    });

    it('parses "42" into integer variable without error', async () => {
        const onError = jest.fn();
        const json = makeButtonCard(
            'div-action://set_variable?name=flag&value=42',
            'integer',
            0
        );

        const { getByText } = render(<DivKit id="t" data={json} onError={onError} />);

        expect(getByText('value=0')).toBeTruthy();

        await act(async () => {
            fireEvent.press(getByText('Test Button'));
        });

        expect(onError).not.toHaveBeenCalled();
        expect(getByText('value=42')).toBeTruthy();
    });

    it('parses "3.14" into number variable without error', async () => {
        const onError = jest.fn();
        const json = makeButtonCard(
            'div-action://set_variable?name=flag&value=3.14',
            'number',
            0
        );

        const { getByText } = render(<DivKit id="t" data={json} onError={onError} />);

        await act(async () => {
            fireEvent.press(getByText('Test Button'));
        });

        expect(onError).not.toHaveBeenCalled();
        expect(getByText('value=3.14')).toBeTruthy();
    });

    it('logs Cannot find variable error when name is unknown', async () => {
        const onError = jest.fn();
        const json = makeButtonCard(
            'div-action://set_variable?name=unknown&value=true',
            'boolean',
            false
        );

        const { getByText } = render(<DivKit id="t" data={json} onError={onError} />);

        await act(async () => {
            fireEvent.press(getByText('Test Button'));
        });

        expect(onError).toHaveBeenCalled();
        const errArg = onError.mock.calls[0][0];
        const message: string = errArg?.error?.message ?? errArg?.message ?? '';
        expect(message).toMatch(/Cannot find variable/);
    });
});
