/**
 * Integration tests for the applyPatch imperative API.
 *
 * Mirrors the div-patch semantics of Web Root.svelte applyPatchInternal:
 * - changes target children by id through their parent's registered replaceWith;
 * - `transactional` mode rejects the whole patch if any change has no match
 *   (or a single-item slot receives != 1 items) and fires on_failed_actions;
 * - `partial` mode applies whatever matches;
 * - patch templates merge first-wins with card templates;
 * - state slots (states[].div) accept exactly one item per change;
 * - on_applied_actions fire after a successful apply.
 */

import React from 'react';
import { render, act } from '@testing-library/react-native';

import { DivKit, type DivKitHandle } from '../../src/DivKit';
import type { Patch } from '../../typings/common';

function makeCard(div: any, extra?: { templates?: Record<string, unknown>; variables?: any[] }) {
    return {
        ...(extra?.templates ? { templates: extra.templates } : {}),
        card: {
            log_id: 'test',
            ...(extra?.variables ? { variables: extra.variables } : {}),
            states: [
                {
                    state_id: 0,
                    div
                }
            ]
        }
    };
}

function renderCard(div: any, extra?: { templates?: Record<string, unknown>; variables?: any[] }) {
    const ref = React.createRef<DivKitHandle>();
    const onError = jest.fn();
    const utils = render(<DivKit id="t" ref={ref} data={makeCard(div, extra)} onError={onError} />);
    return { ref, onError, ...utils };
}

async function applyPatch(ref: React.RefObject<DivKitHandle>, patch: Patch): Promise<boolean> {
    let result = false;
    await act(async () => {
        result = ref.current!.applyPatch(patch);
    });
    return result;
}

describe('applyPatch', () => {
    it('replaces a container item by id', async () => {
        const { ref, onError, getByText, queryByText } = renderCard({
            type: 'container',
            items: [
                { type: 'text', id: 'first', text: 'First' },
                { type: 'text', id: 'second', text: 'Second' }
            ]
        });

        expect(getByText('First')).toBeTruthy();

        const applied = await applyPatch(ref, {
            patch: {
                changes: [
                    {
                        id: 'first',
                        items: [{ type: 'text', id: 'first', text: 'Patched first' }]
                    }
                ]
            }
        });

        expect(applied).toBe(true);
        expect(onError).not.toHaveBeenCalled();
        expect(queryByText('First')).toBeNull();
        expect(getByText('Patched first')).toBeTruthy();
        expect(getByText('Second')).toBeTruthy();
    });

    it('deletes a container item when a change has no items', async () => {
        const { ref, getByText, queryByText } = renderCard({
            type: 'container',
            items: [
                { type: 'text', id: 'first', text: 'First' },
                { type: 'text', id: 'second', text: 'Second' }
            ]
        });

        const applied = await applyPatch(ref, {
            patch: {
                changes: [{ id: 'second' }]
            }
        });

        expect(applied).toBe(true);
        expect(getByText('First')).toBeTruthy();
        expect(queryByText('Second')).toBeNull();
    });

    it('replaces one item with several', async () => {
        const { ref, getByText, queryByText } = renderCard({
            type: 'container',
            items: [
                { type: 'text', id: 'first', text: 'First' },
                { type: 'text', id: 'second', text: 'Second' }
            ]
        });

        const applied = await applyPatch(ref, {
            patch: {
                changes: [
                    {
                        id: 'first',
                        items: [
                            { type: 'text', id: 'first-a', text: 'A' },
                            { type: 'text', id: 'first-b', text: 'B' },
                            { type: 'text', id: 'first-c', text: 'C' }
                        ]
                    }
                ]
            }
        });

        expect(applied).toBe(true);
        expect(queryByText('First')).toBeNull();
        expect(getByText('A')).toBeTruthy();
        expect(getByText('B')).toBeTruthy();
        expect(getByText('C')).toBeTruthy();
        expect(getByText('Second')).toBeTruthy();
    });

    it('applies several changes of one patch to the same container', async () => {
        const { ref, getByText, queryByText } = renderCard({
            type: 'container',
            items: [
                { type: 'text', id: 'first', text: 'First' },
                { type: 'text', id: 'second', text: 'Second' }
            ]
        });

        const applied = await applyPatch(ref, {
            patch: {
                changes: [
                    { id: 'first', items: [{ type: 'text', id: 'first', text: 'New first' }] },
                    { id: 'second', items: [{ type: 'text', id: 'second', text: 'New second' }] }
                ]
            }
        });

        expect(applied).toBe(true);
        expect(queryByText('First')).toBeNull();
        expect(queryByText('Second')).toBeNull();
        expect(getByText('New first')).toBeTruthy();
        expect(getByText('New second')).toBeTruthy();
    });

    it('patches nested containers', async () => {
        const { ref, getByText, queryByText } = renderCard({
            type: 'container',
            items: [
                {
                    type: 'container',
                    id: 'inner',
                    items: [{ type: 'text', id: 'deep', text: 'Deep' }]
                }
            ]
        });

        const applied = await applyPatch(ref, {
            patch: {
                changes: [
                    { id: 'deep', items: [{ type: 'text', id: 'deep', text: 'Patched deep' }] }
                ]
            }
        });

        expect(applied).toBe(true);
        expect(queryByText('Deep')).toBeNull();
        expect(getByText('Patched deep')).toBeTruthy();
    });

    it('makes patched-in items patchable in a follow-up patch (streaming case)', async () => {
        const { ref, getByText, queryByText } = renderCard({
            type: 'container',
            items: [{ type: 'text', id: 'chunk-0', text: 'Chunk 0' }]
        });

        await applyPatch(ref, {
            patch: {
                changes: [
                    {
                        id: 'chunk-0',
                        items: [
                            { type: 'text', id: 'chunk-0', text: 'Chunk 0' },
                            { type: 'text', id: 'chunk-1', text: 'Chunk 1 partial' }
                        ]
                    }
                ]
            }
        });

        expect(getByText('Chunk 1 partial')).toBeTruthy();

        const applied = await applyPatch(ref, {
            patch: {
                changes: [
                    {
                        id: 'chunk-1',
                        items: [{ type: 'text', id: 'chunk-1', text: 'Chunk 1 full' }]
                    }
                ]
            }
        });

        expect(applied).toBe(true);
        expect(queryByText('Chunk 1 partial')).toBeNull();
        expect(getByText('Chunk 0')).toBeTruthy();
        expect(getByText('Chunk 1 full')).toBeTruthy();
    });

    describe('transactional mode', () => {
        it('rejects the whole patch when an id is missing and fires on_failed_actions', async () => {
            const onCustomAction = jest.fn();
            const ref = React.createRef<DivKitHandle>();
            const { getByText } = render(
                <DivKit
                    id="t"
                    ref={ref}
                    data={makeCard({
                        type: 'container',
                        items: [{ type: 'text', id: 'first', text: 'First' }]
                    })}
                    onCustomAction={onCustomAction}
                />
            );

            const applied = await applyPatch(ref as React.RefObject<DivKitHandle>, {
                patch: {
                    mode: 'transactional',
                    changes: [
                        { id: 'first', items: [{ type: 'text', id: 'first', text: 'Patched' }] },
                        { id: 'missing', items: [{ type: 'text', id: 'missing', text: 'Nope' }] }
                    ],
                    on_failed_actions: [{ log_id: 'failed', url: 'custom://patch-failed' }]
                }
            });

            expect(applied).toBe(false);
            // The matched change must NOT be applied either
            expect(getByText('First')).toBeTruthy();
            expect(onCustomAction).toHaveBeenCalledWith(
                expect.objectContaining({ url: 'custom://patch-failed' })
            );
        });

        it('applies fully when all ids match and fires on_applied_actions', async () => {
            const onCustomAction = jest.fn();
            const ref = React.createRef<DivKitHandle>();
            const { getByText, queryByText } = render(
                <DivKit
                    id="t"
                    ref={ref}
                    data={makeCard({
                        type: 'container',
                        items: [{ type: 'text', id: 'first', text: 'First' }]
                    })}
                    onCustomAction={onCustomAction}
                />
            );

            const applied = await applyPatch(ref as React.RefObject<DivKitHandle>, {
                patch: {
                    mode: 'transactional',
                    changes: [
                        { id: 'first', items: [{ type: 'text', id: 'first', text: 'Patched' }] }
                    ],
                    on_applied_actions: [{ log_id: 'applied', url: 'custom://patch-applied' }]
                }
            });

            expect(applied).toBe(true);
            expect(queryByText('First')).toBeNull();
            expect(getByText('Patched')).toBeTruthy();
            expect(onCustomAction).toHaveBeenCalledWith(
                expect.objectContaining({ url: 'custom://patch-applied' })
            );
        });
    });

    describe('partial mode', () => {
        it('applies matched changes and skips unmatched ones', async () => {
            const { ref, getByText, queryByText } = renderCard({
                type: 'container',
                items: [{ type: 'text', id: 'first', text: 'First' }]
            });

            const applied = await applyPatch(ref, {
                patch: {
                    mode: 'partial',
                    changes: [
                        { id: 'missing', items: [{ type: 'text', id: 'missing', text: 'Nope' }] },
                        { id: 'first', items: [{ type: 'text', id: 'first', text: 'Patched' }] }
                    ]
                }
            });

            expect(applied).toBe(true);
            expect(queryByText('Nope')).toBeNull();
            expect(queryByText('First')).toBeNull();
            expect(getByText('Patched')).toBeTruthy();
        });
    });

    describe('div state', () => {
        it('replaces the div of the active state (single-item slot)', async () => {
            const { ref, getByText, queryByText } = renderCard({
                type: 'state',
                id: 'my-state',
                states: [
                    { state_id: 'a', div: { type: 'text', id: 'state-a-div', text: 'State A' } },
                    { state_id: 'b', div: { type: 'text', id: 'state-b-div', text: 'State B' } }
                ]
            });

            expect(getByText('State A')).toBeTruthy();

            const applied = await applyPatch(ref, {
                patch: {
                    changes: [
                        {
                            id: 'state-a-div',
                            items: [{ type: 'text', id: 'state-a-div', text: 'Patched state A' }]
                        }
                    ]
                }
            });

            expect(applied).toBe(true);
            expect(queryByText('State A')).toBeNull();
            expect(getByText('Patched state A')).toBeTruthy();
        });

        it('transactional patch fails when a state slot receives more than one item', async () => {
            const { ref, getByText } = renderCard({
                type: 'state',
                id: 'my-state',
                states: [
                    { state_id: 'a', div: { type: 'text', id: 'state-a-div', text: 'State A' } }
                ]
            });

            const applied = await applyPatch(ref, {
                patch: {
                    mode: 'transactional',
                    changes: [
                        {
                            id: 'state-a-div',
                            items: [
                                { type: 'text', id: 'x', text: 'X' },
                                { type: 'text', id: 'y', text: 'Y' }
                            ]
                        }
                    ]
                }
            });

            expect(applied).toBe(false);
            expect(getByText('State A')).toBeTruthy();
        });

        it('partial patch silently skips a state slot change with != 1 items', async () => {
            const { ref, getByText, queryByText } = renderCard({
                type: 'state',
                id: 'my-state',
                states: [
                    { state_id: 'a', div: { type: 'text', id: 'state-a-div', text: 'State A' } }
                ]
            });

            const applied = await applyPatch(ref, {
                patch: {
                    changes: [
                        {
                            id: 'state-a-div',
                            items: [
                                { type: 'text', id: 'x', text: 'X' },
                                { type: 'text', id: 'y', text: 'Y' }
                            ]
                        }
                    ]
                }
            });

            // The patch as a whole is applied (non-transactional), the broken change is skipped
            expect(applied).toBe(true);
            expect(getByText('State A')).toBeTruthy();
            expect(queryByText('X')).toBeNull();
        });
    });

    describe('templates', () => {
        it('resolves patch items against card templates', async () => {
            const { ref, getByText, queryByText } = renderCard(
                {
                    type: 'container',
                    items: [{ type: 'greeting', id: 'hello', label: 'Hello' }]
                },
                {
                    templates: {
                        greeting: { type: 'text', $text: 'label' }
                    }
                }
            );

            expect(getByText('Hello')).toBeTruthy();

            const applied = await applyPatch(ref, {
                patch: {
                    changes: [
                        {
                            id: 'hello',
                            items: [{ type: 'greeting', id: 'hello', label: 'From template' }]
                        }
                    ]
                }
            });

            expect(applied).toBe(true);
            expect(queryByText('Hello')).toBeNull();
            expect(getByText('From template')).toBeTruthy();
        });

        it('resolves patch items against card + patch templates (first-wins merge)', async () => {
            const { ref, getByText, queryByText } = renderCard(
                {
                    type: 'container',
                    items: [{ type: 'text', id: 'slot', text: 'Original' }]
                },
                {
                    templates: {
                        greeting: { type: 'text', $text: 'label' }
                    }
                }
            );

            const applied = await applyPatch(ref, {
                templates: {
                    // Must NOT override the card template of the same name (first-wins)
                    greeting: { type: 'text', text: 'HIJACKED' },
                    farewell: { type: 'text', $text: 'label' }
                },
                patch: {
                    changes: [
                        {
                            id: 'slot',
                            items: [
                                { type: 'greeting', id: 'slot', label: 'Hello from card template' },
                                { type: 'farewell', id: 'slot-2', label: 'Bye from patch template' }
                            ]
                        }
                    ]
                }
            });

            expect(applied).toBe(true);
            expect(queryByText('Original')).toBeNull();
            expect(queryByText('HIJACKED')).toBeNull();
            expect(getByText('Hello from card template')).toBeTruthy();
            expect(getByText('Bye from patch template')).toBeTruthy();
        });
    });

    it('preserves sibling DivState identity (selected state) when patching another item', async () => {
        const { ref, getByText, queryByText } = renderCard({
            type: 'container',
            items: [
                {
                    type: 'state',
                    id: 'toggle',
                    states: [
                        { state_id: 'a', div: { type: 'text', text: 'State A' } },
                        { state_id: 'b', div: { type: 'text', text: 'State B' } }
                    ]
                },
                {
                    type: 'text',
                    id: 'switch-btn',
                    text: 'Switch',
                    actions: [{ log_id: 'sw', url: 'div-action://set_state?state_id=0/toggle/b' }]
                },
                { type: 'text', id: 'chunk', text: 'Chunk' }
            ]
        });

        expect(getByText('State A')).toBeTruthy();

        const { fireEvent } = require('@testing-library/react-native');
        await act(async () => {
            fireEvent.press(getByText('Switch'));
        });

        expect(getByText('State B')).toBeTruthy();

        // Patch an unrelated sibling — the DivState must keep its selected state
        // (the whole point of applyPatch vs re-setting the full card)
        const applied = await applyPatch(ref, {
            patch: {
                changes: [
                    { id: 'chunk', items: [{ type: 'text', id: 'chunk', text: 'Patched chunk' }] }
                ]
            }
        });

        expect(applied).toBe(true);
        expect(getByText('Patched chunk')).toBeTruthy();
        expect(getByText('State B')).toBeTruthy();
        expect(queryByText('State A')).toBeNull();
    });

    it('returns false for a patch without changes', async () => {
        const { ref } = renderCard({
            type: 'container',
            items: [{ type: 'text', id: 'first', text: 'First' }]
        });

        const applied = await applyPatch(ref, { patch: {} } as unknown as Patch);

        expect(applied).toBe(false);
    });

    it('resets patched content when the document is replaced (setData semantics)', async () => {
        const ref = React.createRef<DivKitHandle>();
        const cardA = makeCard({
            type: 'container',
            items: [{ type: 'text', id: 'first', text: 'First' }]
        });

        const { getByText, queryByText, rerender } = render(
            <DivKit id="t" ref={ref} data={cardA} />
        );

        await applyPatch(ref as React.RefObject<DivKitHandle>, {
            patch: {
                changes: [
                    { id: 'first', items: [{ type: 'text', id: 'first', text: 'Patched' }] }
                ]
            }
        });

        expect(getByText('Patched')).toBeTruthy();

        const cardB = makeCard({
            type: 'container',
            items: [{ type: 'text', id: 'first', text: 'Fresh document' }]
        });

        await act(async () => {
            rerender(<DivKit id="t" ref={ref} data={cardB} />);
        });

        expect(queryByText('Patched')).toBeNull();
        expect(getByText('Fresh document')).toBeTruthy();
    });
});
