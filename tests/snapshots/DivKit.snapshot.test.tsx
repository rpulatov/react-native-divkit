import { renderDivKit, makeCard } from './helpers';

// Sample JSON fixtures
import widgetJson from './fixtures/widget.json';
import storyJson from './fixtures/story.json';
import tapAnimationsJson from './fixtures/tap-animations.json';

type JsonNode = {
    type?: string;
    props?: Record<string, any>;
    children?: Array<JsonNode | string>;
} | null;

function collectNodes(node: JsonNode): JsonNode[] {
    if (!node || typeof node !== 'object') {
        return [];
    }

    const children = Array.isArray(node.children)
        ? node.children.flatMap(child => collectNodes(child as JsonNode))
        : [];

    return [node, ...children];
}

describe('DivKit Snapshot Tests', () => {
    // =========================================================================
    // Integration tests — full JSON fixtures
    // =========================================================================

    describe('Full JSON fixtures', () => {
        it('widget.json (overlap template) renders correctly', () => {
            const { toJSON } = renderDivKit(widgetJson);
            expect(toJSON()).toMatchSnapshot();
        });

        it('story.json renders correctly', () => {
            const { toJSON } = renderDivKit(storyJson);
            expect(toJSON()).toMatchSnapshot();
        });

        it('tap-animations.json renders correctly', () => {
            const { toJSON } = renderDivKit(tapAnimationsJson);
            expect(toJSON()).toMatchSnapshot();
        });
    });

    // =========================================================================
    // Vertical container + content alignment
    // =========================================================================

    describe('Vertical container alignment', () => {
        it('content_alignment_horizontal: center', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'vertical',
                width: { type: 'match_parent' },
                height: { type: 'fixed', value: 200 },
                content_alignment_horizontal: 'center',
                items: [
                    { type: 'text', text: 'Centered', width: { type: 'wrap_content' } }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });

        it('content_alignment_vertical: bottom', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'vertical',
                width: { type: 'match_parent' },
                height: { type: 'fixed', value: 200 },
                content_alignment_vertical: 'bottom',
                items: [
                    { type: 'text', text: 'Bottom', width: { type: 'wrap_content' } }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });
    });

    // =========================================================================
    // Horizontal container + content_alignment_vertical
    // =========================================================================

    describe('Horizontal container alignment', () => {
        it('content_alignment_vertical: bottom aligns children to bottom', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'horizontal',
                width: { type: 'match_parent' },
                height: { type: 'fixed', value: 100 },
                content_alignment_vertical: 'bottom',
                items: [
                    {
                        type: 'text',
                        text: 'Bottom-aligned',
                        width: { type: 'wrap_content' }
                    }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });

        it('content_alignment_horizontal: center + content_alignment_vertical: bottom', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'horizontal',
                width: { type: 'wrap_content' },
                height: { type: 'fixed', value: 100 },
                content_alignment_horizontal: 'center',
                content_alignment_vertical: 'bottom',
                items: [
                    {
                        type: 'image',
                        image_url: 'https://example.com/img.png',
                        width: { type: 'fixed', value: 30 },
                        height: { type: 'fixed', value: 30 }
                    },
                    {
                        type: 'text',
                        text: 'Label',
                        width: { type: 'wrap_content' }
                    }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });

        it('child without explicit width inside horizontal container uses flexGrow (not alignSelf:stretch)', () => {
            // Regression: before the fix, a child with no width in a horizontal container
            // got alignSelf:stretch which expanded it to full HEIGHT (cross-axis in row layout).
            // After the fix it should get flexGrow:1 to expand along the main axis (WIDTH).
            const data = makeCard({
                type: 'container',
                orientation: 'horizontal',
                width: { type: 'match_parent' },
                height: { type: 'fixed', value: 100 },
                items: [
                    {
                        type: 'container',
                        orientation: 'horizontal',
                        alignment_vertical: 'center',
                        // No width specified — should default to match_parent (flexGrow:1), not stretch height
                        items: [
                            {
                                type: 'image',
                                image_url: 'https://example.com/star.png',
                                width: { type: 'fixed', value: 16 },
                                height: { type: 'fixed', value: 16 }
                            }
                        ]
                    }
                ]
            });
            const { toJSON } = renderDivKit(data);
            const json = toJSON() as any;

            // Find the inner container (child of horizontal root)
            const innerContainer = json?.children?.[0]?.children?.[0];
            const style = innerContainer?.props?.style || {};

            // Must use flexGrow for width (main axis in row), NOT alignSelf:stretch (which would stretch height)
            expect(style.flexGrow).toBe(1);
            expect(style.alignSelf).not.toBe('stretch');
        });

        it('wrap_content horizontal container: children do not expand width with flexGrow', () => {
            // Regression: children without explicit width inside a wrap_content horizontal
            // container must NOT get flexGrow:1 — otherwise the badge expands to full width.
            const data = makeCard({
                type: 'container',
                orientation: 'overlap',
                width: { type: 'match_parent' },
                height: { type: 'fixed', value: 100 },
                items: [
                    {
                        type: 'container',
                        orientation: 'horizontal',
                        width: { type: 'wrap_content' },
                        // No explicit width on children — they must wrap their content
                        items: [
                            {
                                type: 'image',
                                image_url: 'https://example.com/star.png',
                                width: { type: 'fixed', value: 16 },
                                height: { type: 'fixed', value: 16 }
                            },
                            {
                                type: 'text',
                                text: '4.8'
                                // No width — should NOT get flexGrow:1 inside wrap_content parent
                            }
                        ]
                    }
                ]
            });
            const { toJSON } = renderDivKit(data);
            const json = toJSON() as any;

            // Navigate to the text element inside the badge
            // Structure: root View > badge View (wrap_content horizontal) > text View
            const badgeChildren = json?.children?.[0]?.children;
            const textNode = badgeChildren?.find((n: any) => n?.type === 'Text' || n?.props?.style?.fontSize);
            const textStyle = textNode?.props?.style || {};

            // Text must NOT have flexGrow (would expand badge to full width)
            expect(textStyle.flexGrow).toBeUndefined();
        });

        it('content_alignment_horizontal: space-between', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'horizontal',
                width: { type: 'match_parent' },
                content_alignment_horizontal: 'space-between',
                items: [
                    { type: 'text', text: 'Left', width: { type: 'wrap_content' } },
                    { type: 'text', text: 'Right', width: { type: 'wrap_content' } }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });
    });

    // =========================================================================
    // Overlap container
    // =========================================================================

    describe('Overlap container', () => {
        it('match_parent children fill parent', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'overlap',
                width: { type: 'match_parent' },
                height: { type: 'fixed', value: 300 },
                items: [
                    {
                        type: 'image',
                        image_url: 'https://example.com/bg.png',
                        width: { type: 'match_parent' },
                        height: { type: 'match_parent' },
                        scale: 'fill'
                    },
                    {
                        type: 'text',
                        text: 'Overlay text',
                        width: { type: 'wrap_content' },
                        alignment_horizontal: 'center',
                        alignment_vertical: 'bottom'
                    }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });

        it('child alignment_horizontal: right, alignment_vertical: bottom', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'overlap',
                width: { type: 'match_parent' },
                height: { type: 'fixed', value: 200 },
                items: [
                    {
                        type: 'container',
                        width: { type: 'wrap_content' },
                        height: { type: 'wrap_content' },
                        alignment_horizontal: 'right',
                        alignment_vertical: 'bottom',
                        items: [
                            { type: 'text', text: 'Bottom-right' }
                        ]
                    }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });

        it('actions + action_animation keep bottom alignment in overlap', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'overlap',
                width: { type: 'match_parent' },
                height: { type: 'fixed', value: 200 },
                items: [
                    {
                        type: 'text',
                        text: 'Base layer',
                        width: { type: 'match_parent' },
                        height: { type: 'match_parent' }
                    },
                    {
                        type: 'container',
                        width: { type: 'wrap_content' },
                        height: { type: 'wrap_content' },
                        alignment_horizontal: 'right',
                        alignment_vertical: 'bottom',
                        margins: {
                            right: 12,
                            bottom: 10
                        },
                        actions: [
                            {
                                log_id: 'open_url',
                                url: 'https://example.com'
                            }
                        ],
                        action_animation: {
                            name: 'fade',
                            start_value: 1,
                            end_value: 0.5,
                            duration: 250
                        },
                        items: [
                            {
                                type: 'text',
                                text: 'CTA'
                            }
                        ]
                    }
                ]
            });

            const { toJSON } = renderDivKit(data);
            const root = toJSON() as JsonNode;
            const nodes = collectNodes(root);

            const bottomAlignedPressable = nodes.find(node => {
                if (!node || node.type !== 'Pressable') {
                    return false;
                }

                const style = node.props?.style || {};
                return (
                    style.marginTop === 'auto' &&
                    style.marginBottom === 10 &&
                    style.marginRight === 12
                );
            });

            expect(bottomAlignedPressable).toBeDefined();

            const animatedChild = (bottomAlignedPressable as any)?.children?.find(
                (child: any) => child?.type === 'Animated.View'
            );

            expect(animatedChild).toBeDefined();
            expect(animatedChild.props?.style?.flex).toBeUndefined();
        });
    });

    // =========================================================================
    // Animated buttons with margins
    // =========================================================================

    describe('Animated buttons with margins', () => {
        it('buttons with action_animation preserve margins', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'vertical',
                items: [
                    {
                        type: 'text',
                        text: 'Button 1',
                        height: { type: 'fixed', value: 48 },
                        margins: { left: 16, right: 16, bottom: 16 },
                        actions: [{ log_id: 'btn1', url: 'https://example.com' }],
                        action_animation: {
                            name: 'scale',
                            start_value: 1,
                            end_value: 0.9,
                            duration: 150
                        }
                    },
                    {
                        type: 'text',
                        text: 'Button 2',
                        height: { type: 'fixed', value: 48 },
                        margins: { left: 16, right: 16, bottom: 16 },
                        actions: [{ log_id: 'btn2', url: 'https://example.com' }],
                        action_animation: {
                            name: 'fade',
                            start_value: 1,
                            end_value: 0.4,
                            duration: 300
                        }
                    }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });
    });

    // =========================================================================
    // Sizing: fixed, wrap_content, match_parent
    // =========================================================================

    describe('Sizing combinations', () => {
        it('fixed width and height', () => {
            const data = makeCard({
                type: 'text',
                text: 'Fixed',
                width: { type: 'fixed', value: 100 },
                height: { type: 'fixed', value: 50 }
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });

        it('wrap_content with min/max constraints', () => {
            const data = makeCard({
                type: 'text',
                text: 'Constrained',
                width: {
                    type: 'wrap_content',
                    min_size: { value: 50 },
                    max_size: { value: 200 }
                }
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });

        it('match_parent with weight in vertical container', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'vertical',
                width: { type: 'match_parent' },
                height: { type: 'match_parent' },
                items: [
                    {
                        type: 'text',
                        text: 'Top (weight 1)',
                        width: { type: 'match_parent' },
                        height: { type: 'match_parent', weight: 1 }
                    },
                    {
                        type: 'text',
                        text: 'Bottom (weight 2)',
                        width: { type: 'match_parent' },
                        height: { type: 'match_parent', weight: 2 }
                    }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });

        it('match_parent with min/max size', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'vertical',
                width: { type: 'match_parent' },
                height: { type: 'match_parent' },
                items: [
                    {
                        type: 'text',
                        text: 'Constrained match_parent',
                        width: {
                            type: 'match_parent',
                            min_size: { value: 100 },
                            max_size: { value: 300 }
                        },
                        height: {
                            type: 'match_parent',
                            min_size: { value: 50 },
                            max_size: { value: 150 }
                        }
                    }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });
    });

    // =========================================================================
    // Background and borders
    // =========================================================================

    describe('Background and borders', () => {
        it('solid background with corner_radius', () => {
            const data = makeCard({
                type: 'container',
                width: { type: 'match_parent' },
                height: { type: 'fixed', value: 100 },
                background: [{ type: 'solid', color: '#FF0000' }],
                border: { corner_radius: 16 },
                items: [
                    { type: 'text', text: 'Rounded red box' }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });
    });

    // =========================================================================
    // Visibility
    // =========================================================================

    describe('Visibility', () => {
        it('gone hides element completely', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'vertical',
                items: [
                    { type: 'text', text: 'Visible' },
                    { type: 'text', text: 'Gone', visibility: 'gone' },
                    { type: 'text', text: 'Also visible' }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });

        it('invisible takes space but not visible', () => {
            const data = makeCard({
                type: 'container',
                orientation: 'vertical',
                items: [
                    { type: 'text', text: 'Visible' },
                    { type: 'text', text: 'Invisible', visibility: 'invisible' },
                    { type: 'text', text: 'Also visible' }
                ]
            });
            const { toJSON } = renderDivKit(data);
            expect(toJSON()).toMatchSnapshot();
        });
    });
});
