import { renderDivKit, makeCard } from './helpers';

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

function findAllNodes(tree: TreeNode, type: string): TreeNode[] {
    if (!tree || typeof tree !== 'object') return [];
    const results: TreeNode[] = [];
    if (tree.type === type) results.push(tree);
    if (Array.isArray(tree.children)) {
        for (const child of tree.children) {
            results.push(...findAllNodes(child as TreeNode, type));
        }
    }
    return results;
}

const BASE_IMAGE = {
    type: 'image' as const,
    image_url: 'https://example.com/photo.jpg',
    width: { type: 'match_parent' as const },
    height: { type: 'fixed' as const, value: 200 }
};

describe('DivImage snapshots', () => {
    // =========================================================================
    // scale → resizeMode mapping
    // =========================================================================

    describe('scale mapping', () => {
        test('scale: fill → resizeMode cover', () => {
            const { toJSON } = renderDivKit(makeCard({ ...BASE_IMAGE, scale: 'fill' }));
            const image = findNode(toJSON() as TreeNode, 'Image');
            expect(image?.props?.resizeMode).toBe('cover');
        });

        test('scale: fit → resizeMode contain', () => {
            const { toJSON } = renderDivKit(makeCard({ ...BASE_IMAGE, scale: 'fit' }));
            const image = findNode(toJSON() as TreeNode, 'Image');
            expect(image?.props?.resizeMode).toBe('contain');
        });

        test('scale: stretch → resizeMode stretch', () => {
            const { toJSON } = renderDivKit(makeCard({ ...BASE_IMAGE, scale: 'stretch' }));
            const image = findNode(toJSON() as TreeNode, 'Image');
            expect(image?.props?.resizeMode).toBe('stretch');
        });

        test('scale: no_scale → resizeMode center', () => {
            const { toJSON } = renderDivKit(makeCard({ ...BASE_IMAGE, scale: 'no_scale' }));
            const image = findNode(toJSON() as TreeNode, 'Image');
            expect(image?.props?.resizeMode).toBe('center');
        });

        test('default scale (no field) → resizeMode cover', () => {
            const { toJSON } = renderDivKit(makeCard({ ...BASE_IMAGE }));
            const image = findNode(toJSON() as TreeNode, 'Image');
            expect(image?.props?.resizeMode).toBe('cover');
        });
    });

    // =========================================================================
    // content_alignment → container flex
    // =========================================================================

    describe('content_alignment_horizontal', () => {
        function containerStyle(data: object) {
            const { toJSON } = renderDivKit(makeCard(data));
            // The innermost View before Image is the DivImage container
            const views = findAllNodes(toJSON() as TreeNode, 'View');
            // Last View wrapping the Image is the container with alignItems/justifyContent
            const imageNode = findNode(toJSON() as TreeNode, 'Image');
            // Find the View whose children include the Image
            function findParentOfImage(tree: TreeNode): TreeNode | null {
                if (!tree || typeof tree !== 'object') return null;
                if (Array.isArray(tree.children)) {
                    for (const child of tree.children) {
                        if (child && typeof child === 'object' && (child as TreeNode).type === 'Image') {
                            return tree;
                        }
                        const found = findParentOfImage(child as TreeNode);
                        if (found) return found;
                    }
                }
                return null;
            }
            return findParentOfImage(toJSON() as TreeNode)?.props?.style;
        }

        test('left → alignItems flex-start', () => {
            const style = containerStyle({ ...BASE_IMAGE, content_alignment_horizontal: 'left' });
            expect(style?.alignItems).toBe('flex-start');
        });

        test('center → alignItems center', () => {
            const style = containerStyle({ ...BASE_IMAGE, content_alignment_horizontal: 'center' });
            expect(style?.alignItems).toBe('center');
        });

        test('right → alignItems flex-end', () => {
            const style = containerStyle({ ...BASE_IMAGE, content_alignment_horizontal: 'right' });
            expect(style?.alignItems).toBe('flex-end');
        });

        test('start → alignItems flex-start', () => {
            const style = containerStyle({ ...BASE_IMAGE, content_alignment_horizontal: 'start' });
            expect(style?.alignItems).toBe('flex-start');
        });

        test('end → alignItems flex-end', () => {
            const style = containerStyle({ ...BASE_IMAGE, content_alignment_horizontal: 'end' });
            expect(style?.alignItems).toBe('flex-end');
        });

        test('default (no field) → alignItems center', () => {
            const style = containerStyle({ ...BASE_IMAGE });
            expect(style?.alignItems).toBe('center');
        });
    });

    describe('content_alignment_vertical', () => {
        function containerStyle(data: object) {
            function findParentOfImage(tree: TreeNode): TreeNode | null {
                if (!tree || typeof tree !== 'object') return null;
                if (Array.isArray(tree.children)) {
                    for (const child of tree.children) {
                        if (child && typeof child === 'object' && (child as TreeNode).type === 'Image') {
                            return tree;
                        }
                        const found = findParentOfImage(child as TreeNode);
                        if (found) return found;
                    }
                }
                return null;
            }
            const { toJSON } = renderDivKit(makeCard(data));
            return findParentOfImage(toJSON() as TreeNode)?.props?.style;
        }

        test('top → justifyContent flex-start', () => {
            const style = containerStyle({ ...BASE_IMAGE, content_alignment_vertical: 'top' });
            expect(style?.justifyContent).toBe('flex-start');
        });

        test('center → justifyContent center', () => {
            const style = containerStyle({ ...BASE_IMAGE, content_alignment_vertical: 'center' });
            expect(style?.justifyContent).toBe('center');
        });

        test('bottom → justifyContent flex-end', () => {
            const style = containerStyle({ ...BASE_IMAGE, content_alignment_vertical: 'bottom' });
            expect(style?.justifyContent).toBe('flex-end');
        });

        test('default (no field) → justifyContent center', () => {
            const style = containerStyle({ ...BASE_IMAGE });
            expect(style?.justifyContent).toBe('center');
        });
    });

    // =========================================================================
    // aspect: { ratio } → container aspectRatio
    // =========================================================================

    describe('aspect ratio', () => {
        function containerStyle(data: object) {
            function findParentOfImage(tree: TreeNode): TreeNode | null {
                if (!tree || typeof tree !== 'object') return null;
                if (Array.isArray(tree.children)) {
                    for (const child of tree.children) {
                        if (child && typeof child === 'object' && (child as TreeNode).type === 'Image') {
                            return tree;
                        }
                        const found = findParentOfImage(child as TreeNode);
                        if (found) return found;
                    }
                }
                return null;
            }
            const { toJSON } = renderDivKit(makeCard(data));
            return findParentOfImage(toJSON() as TreeNode)?.props?.style;
        }

        test('aspect: { ratio: 1.5 } → container aspectRatio 1.5', () => {
            const style = containerStyle({
                ...BASE_IMAGE,
                aspect: { ratio: 1.5 }
            });
            expect(style?.aspectRatio).toBe(1.5);
        });

        test('no aspect → no container aspectRatio', () => {
            const style = containerStyle({ ...BASE_IMAGE });
            expect(style?.aspectRatio).toBeUndefined();
        });
    });

    // =========================================================================
    // height: wrap_content — natural size via Image.getSize
    // =========================================================================

    describe('height: wrap_content', () => {
        const WRAP_IMAGE = {
            type: 'image' as const,
            image_url: 'https://example.com/photo.jpg',
            width: { type: 'match_parent' as const },
            height: { type: 'wrap_content' as const }
        };

        test('with aspect: { ratio } — uses explicit ratio, no getSize call', () => {
            const { Image: RNImage } = require('react-native');
            RNImage.getSize.mockClear();

            function findParentOfImage(tree: TreeNode): TreeNode | null {
                if (!tree || typeof tree !== 'object') return null;
                if (Array.isArray(tree.children)) {
                    for (const child of tree.children) {
                        if (child && typeof child === 'object' && (child as TreeNode).type === 'Image') {
                            return tree;
                        }
                        const found = findParentOfImage(child as TreeNode);
                        if (found) return found;
                    }
                }
                return null;
            }

            const { toJSON } = renderDivKit(makeCard({ ...WRAP_IMAGE, aspect: { ratio: 1.9 } }));
            const style = findParentOfImage(toJSON() as TreeNode)?.props?.style;
            expect(style?.aspectRatio).toBe(1.9);
            expect(RNImage.getSize).not.toHaveBeenCalled();
        });

        test('without aspect — calls getSize and uses natural ratio', () => {
            const { Image: RNImage } = require('react-native');
            RNImage.getSize.mockClear();

            const result = renderDivKit(makeCard(WRAP_IMAGE));

            expect(RNImage.getSize).toHaveBeenCalledWith(
                'https://example.com/photo.jpg',
                expect.any(Function),
                expect.any(Function)
            );

            function findParentOfImage(tree: TreeNode): TreeNode | null {
                if (!tree || typeof tree !== 'object') return null;
                if (Array.isArray(tree.children)) {
                    for (const child of tree.children) {
                        if (child && typeof child === 'object' && (child as TreeNode).type === 'Image') {
                            return tree;
                        }
                        const found = findParentOfImage(child as TreeNode);
                        if (found) return found;
                    }
                }
                return null;
            }

            // Mock returns 200x100 → ratio = 2.0
            const style = findParentOfImage(result.toJSON() as TreeNode)?.props?.style;
            expect(style?.aspectRatio).toBe(2);
        });
    });

    // =========================================================================
    // no_scale + natural dimensions
    // =========================================================================

    describe('no_scale with natural dimensions', () => {
        test('image sized to natural dimensions from getSize', () => {
            const { Image: RNImage } = require('react-native');
            // Mock returns 300x150
            RNImage.getSize.mockImplementationOnce(
                (_uri: string, success: (w: number, h: number) => void) => success(300, 150)
            );

            const result = renderDivKit(makeCard({
                ...BASE_IMAGE,
                scale: 'no_scale'
            }));

            const image = findNode(result.toJSON() as TreeNode, 'Image');
            expect(image?.props?.style?.width).toBe(300);
            expect(image?.props?.style?.height).toBe(150);
        });
    });

    // =========================================================================
    // placeholder_color
    // =========================================================================

    describe('placeholder_color', () => {
        test('shown while loading', () => {
            function findParentOfImage(tree: TreeNode): TreeNode | null {
                if (!tree || typeof tree !== 'object') return null;
                if (Array.isArray(tree.children)) {
                    for (const child of tree.children) {
                        if (child && typeof child === 'object' && (child as TreeNode).type === 'Image') {
                            return tree;
                        }
                        const found = findParentOfImage(child as TreeNode);
                        if (found) return found;
                    }
                }
                return null;
            }
            const { toJSON } = renderDivKit(makeCard({
                ...BASE_IMAGE,
                placeholder_color: '#FF0000'
            }));
            const style = findParentOfImage(toJSON() as TreeNode)?.props?.style;
            expect(style?.backgroundColor).toBe('#FF0000');
        });
    });

    // =========================================================================
    // Full render snapshots
    // =========================================================================

    describe('full render snapshots', () => {
        test('basic image with fixed size', () => {
            const { toJSON } = renderDivKit(makeCard(BASE_IMAGE));
            expect(toJSON()).toMatchSnapshot();
        });

        test('image with aspect ratio and fit scale', () => {
            const { toJSON } = renderDivKit(makeCard({
                ...BASE_IMAGE,
                scale: 'fit',
                aspect: { ratio: 1.78 },
                height: { type: 'wrap_content' as const }
            }));
            expect(toJSON()).toMatchSnapshot();
        });

        test('image with alignment', () => {
            const { toJSON } = renderDivKit(makeCard({
                ...BASE_IMAGE,
                content_alignment_horizontal: 'left',
                content_alignment_vertical: 'top'
            }));
            expect(toJSON()).toMatchSnapshot();
        });
    });
});
