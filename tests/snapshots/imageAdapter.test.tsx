/**
 * DivImage × DivImageAdapter integration tests.
 *
 * Uses the snapshot jest config because adapters need real rendering through
 * @testing-library/react-native (the unit-test config's `react-native` mock
 * returns plain objects, not React elements).
 */
import React from 'react';
import { renderDivKit, makeCard } from './helpers';
import { render } from '@testing-library/react-native';
import { DivKit } from '../../src';
import type { DivImageAdapter, DivImageAdapterRenderProps } from '../../src/types/imageAdapter';

type TreeNode = {
    type: string;
    props: Record<string, any>;
    children?: Array<TreeNode | string> | null;
} | null;

function findNode(tree: TreeNode, type: string): TreeNode | null {
    if (!tree || typeof tree !== 'object') return null;
    if (tree.type === type) return tree;
    if (Array.isArray(tree.children)) {
        for (const child of tree.children) {
            const found = findNode(child as TreeNode, type);
            if (found) return found;
        }
    }
    return null;
}

const BASE_IMAGE = {
    type: 'image' as const,
    image_url: 'https://example.com/photo.jpg',
    width: { type: 'match_parent' as const },
    height: { type: 'fixed' as const, value: 200 }
};

describe('DivImage × imageAdapter', () => {
    test('falls back to rn-image adapter when no `imageAdapter` prop is provided', () => {
        // Default adapter renders an <Image> from react-native.
        const { toJSON } = renderDivKit(makeCard(BASE_IMAGE));
        const image = findNode(toJSON() as TreeNode, 'Image');
        expect(image).not.toBeNull();
        expect(image?.props?.source).toEqual({ uri: BASE_IMAGE.image_url });
    });

    test('uses the supplied adapter and forwards uri/scale/style', () => {
        const renderSpy = jest.fn<React.ReactElement, [DivImageAdapterRenderProps]>(
            ({ uri, style }) =>
                React.createElement('CustomImage', { 'data-uri': uri, style })
        );
        const adapter: DivImageAdapter = {
            render: renderSpy,
            getSize: jest.fn().mockResolvedValue({ width: 100, height: 100 })
        };

        const { toJSON } = render(
            React.createElement(DivKit, {
                id: 'test',
                data: makeCard({ ...BASE_IMAGE, scale: 'fit' }),
                imageAdapter: adapter
            })
        );

        expect(renderSpy).toHaveBeenCalledTimes(1);
        const call = renderSpy.mock.calls[0][0];
        expect(call.uri).toBe(BASE_IMAGE.image_url);
        expect(call.scale).toBe('fit');
        expect(call.style.width).toBe('100%');
        expect(call.style.height).toBe('100%');
        expect(typeof call.onLoadEnd).toBe('function');
        expect(typeof call.onError).toBe('function');

        // Custom adapter actually rendered (not RN Image)
        expect(findNode(toJSON() as TreeNode, 'CustomImage')).not.toBeNull();
        expect(findNode(toJSON() as TreeNode, 'Image')).toBeNull();
    });

    test('uses adapter.getSize for height: wrap_content without explicit aspect', () => {
        const getSizeSpy = jest.fn().mockResolvedValue({ width: 400, height: 200 });
        const adapter: DivImageAdapter = {
            render: () => React.createElement('CustomImage', null),
            getSize: getSizeSpy
        };

        render(
            React.createElement(DivKit, {
                id: 'test',
                data: makeCard({
                    type: 'image' as const,
                    image_url: 'https://cdn.example/wrap.jpg',
                    width: { type: 'match_parent' as const },
                    height: { type: 'wrap_content' as const }
                }),
                imageAdapter: adapter
            })
        );

        expect(getSizeSpy).toHaveBeenCalledWith('https://cdn.example/wrap.jpg');
    });

    test('uses adapter.getSize for scale: no_scale', () => {
        const getSizeSpy = jest.fn().mockResolvedValue({ width: 320, height: 160 });
        const adapter: DivImageAdapter = {
            render: () => React.createElement('CustomImage', null),
            getSize: getSizeSpy
        };

        render(
            React.createElement(DivKit, {
                id: 'test',
                data: makeCard({ ...BASE_IMAGE, scale: 'no_scale' }),
                imageAdapter: adapter
            })
        );

        expect(getSizeSpy).toHaveBeenCalledWith(BASE_IMAGE.image_url);
    });

    test('skips adapter.getSize when neither wrap_content nor no_scale applies', () => {
        const getSizeSpy = jest.fn().mockResolvedValue({ width: 100, height: 100 });
        const adapter: DivImageAdapter = {
            render: () => React.createElement('CustomImage', null),
            getSize: getSizeSpy
        };

        render(
            React.createElement(DivKit, {
                id: 'test',
                data: makeCard({ ...BASE_IMAGE, scale: 'fill' }),
                imageAdapter: adapter
            })
        );

        expect(getSizeSpy).not.toHaveBeenCalled();
    });
});
