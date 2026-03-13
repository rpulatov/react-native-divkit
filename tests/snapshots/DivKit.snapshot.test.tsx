import { renderDivKit, makeCard } from './helpers';

// Sample JSON fixtures
import testJson from '../../examples/NewExample/sample-divs/test.json';
import storyJson from '../../examples/NewExample/sample-divs/story.json';
import tapAnimationsJson from '../../examples/NewExample/sample-divs/tap-animations.json';

describe('DivKit Snapshot Tests', () => {
    // =========================================================================
    // Integration tests — full JSON fixtures
    // =========================================================================

    describe('Full JSON fixtures', () => {
        it('test.json (overlap template) renders correctly', () => {
            const { toJSON } = renderDivKit(testJson);
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
