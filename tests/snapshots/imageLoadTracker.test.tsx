/**
 * DivImage × imageLoadTracker integration tests.
 *
 * The tracker is the readiness signal for screenshot tests: DivImage must
 * increment it while an image load is in flight and decrement it on
 * load end / error / unmount.
 */
import React from 'react';
import { act, render } from '@testing-library/react-native';
import { DivKit } from '../../src';
import type { DivImageLoadTracker } from '../../src';
import { makeCard } from './helpers';
import type { DivImageAdapter, DivImageAdapterRenderProps } from '../../src/types/imageAdapter';

const BASE_IMAGE = {
    type: 'image' as const,
    image_url: 'https://example.com/photo.jpg',
    width: { type: 'match_parent' as const },
    height: { type: 'fixed' as const, value: 200 }
};

function makeTracker() {
    const tracker = {
        pending: 0,
        increment: jest.fn(() => {
            tracker.pending++;
        }),
        decrement: jest.fn(() => {
            tracker.pending--;
        })
    };
    return tracker as DivImageLoadTracker & { pending: number };
}

function makeAdapter() {
    let lastProps: DivImageAdapterRenderProps | null = null;
    const adapter: DivImageAdapter = {
        render: props => {
            lastProps = props;
            return React.createElement('CustomImage', null);
        },
        getSize: jest.fn().mockResolvedValue({ width: 100, height: 100 })
    };
    return { adapter, getLastProps: () => lastProps };
}

describe('DivImage × imageLoadTracker', () => {
    test('increments while loading and decrements on load end', () => {
        const tracker = makeTracker();
        const { adapter, getLastProps } = makeAdapter();

        render(
            React.createElement(DivKit, {
                id: 'test',
                data: makeCard(BASE_IMAGE),
                imageAdapter: adapter,
                imageLoadTracker: tracker
            })
        );

        expect(tracker.increment).toHaveBeenCalledTimes(1);
        expect(tracker.pending).toBe(1);

        act(() => {
            getLastProps()?.onLoadEnd?.();
        });

        expect(tracker.decrement).toHaveBeenCalledTimes(1);
        expect(tracker.pending).toBe(0);
    });

    test('decrements on load error', () => {
        const tracker = makeTracker();
        const { adapter, getLastProps } = makeAdapter();

        render(
            React.createElement(DivKit, {
                id: 'test',
                data: makeCard(BASE_IMAGE),
                imageAdapter: adapter,
                imageLoadTracker: tracker,
                onError: jest.fn()
            })
        );

        expect(tracker.pending).toBe(1);

        act(() => {
            getLastProps()?.onError?.();
        });

        expect(tracker.pending).toBe(0);
    });

    test('decrements on unmount while still loading', () => {
        const tracker = makeTracker();
        const { adapter } = makeAdapter();

        const { unmount } = render(
            React.createElement(DivKit, {
                id: 'test',
                data: makeCard(BASE_IMAGE),
                imageAdapter: adapter,
                imageLoadTracker: tracker
            })
        );

        expect(tracker.pending).toBe(1);

        unmount();

        expect(tracker.pending).toBe(0);
    });

    test('does not touch the tracker when the image has no URL', () => {
        const tracker = makeTracker();
        const { adapter } = makeAdapter();

        render(
            React.createElement(DivKit, {
                id: 'test',
                data: makeCard({ ...BASE_IMAGE, image_url: undefined }),
                imageAdapter: adapter,
                imageLoadTracker: tracker,
                onError: jest.fn()
            })
        );

        expect(tracker.increment).not.toHaveBeenCalled();
        expect(tracker.decrement).not.toHaveBeenCalled();
    });
});
