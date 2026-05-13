import { configureChangeBoundsLayout } from '../../src/utils/configureChangeBoundsLayout';
import { LayoutAnimation } from 'react-native';

jest.mock('react-native', () => ({
    LayoutAnimation: {
        configureNext: jest.fn(),
        Types: {
            linear: 'linear',
            easeIn: 'easeIn',
            easeOut: 'easeOut',
            easeInEaseOut: 'easeInEaseOut',
            spring: 'spring'
        },
        Properties: { opacity: 'opacity' }
    }
}));

describe('configureChangeBoundsLayout', () => {
    beforeEach(() => {
        (LayoutAnimation.configureNext as jest.Mock).mockClear();
    });

    test('returns false and does nothing when transition is undefined', () => {
        expect(configureChangeBoundsLayout(undefined)).toBe(false);
        expect(LayoutAnimation.configureNext).not.toHaveBeenCalled();
    });

    test('queues a LayoutAnimation for a change_bounds transition', () => {
        const ok = configureChangeBoundsLayout({ type: 'change_bounds', duration: 250 });
        expect(ok).toBe(true);
        expect(LayoutAnimation.configureNext).toHaveBeenCalledTimes(1);
        const cfg = (LayoutAnimation.configureNext as jest.Mock).mock.calls[0][0];
        expect(cfg.duration).toBe(250);
    });

    test('uses the longest duration across a set', () => {
        configureChangeBoundsLayout({
            type: 'set',
            items: [
                { type: 'change_bounds', duration: 150 },
                { type: 'change_bounds', duration: 400 }
            ]
        });
        const cfg = (LayoutAnimation.configureNext as jest.Mock).mock.calls[0][0];
        expect(cfg.duration).toBe(400);
    });

    test('returns false when duration is zero (no animation worth queueing)', () => {
        const ok = configureChangeBoundsLayout({ type: 'change_bounds', duration: 0 });
        expect(ok).toBe(false);
        expect(LayoutAnimation.configureNext).not.toHaveBeenCalled();
    });

    test('maps interpolator to LayoutAnimation type', () => {
        const cases: Array<[any, string]> = [
            ['linear', 'linear'],
            ['ease_in', 'easeIn'],
            ['ease_out', 'easeOut'],
            ['ease_in_out', 'easeInEaseOut'],
            ['spring', 'spring'],
            [undefined, 'easeInEaseOut']
        ];
        for (const [interp, expectedType] of cases) {
            (LayoutAnimation.configureNext as jest.Mock).mockClear();
            configureChangeBoundsLayout({ type: 'change_bounds', duration: 200, interpolator: interp });
            const cfg = (LayoutAnimation.configureNext as jest.Mock).mock.calls[0][0];
            expect(cfg.update.type).toBe(expectedType);
        }
    });

    test('uses interpolator of the LONGEST item in a set', () => {
        configureChangeBoundsLayout({
            type: 'set',
            items: [
                { type: 'change_bounds', duration: 100, interpolator: 'linear' },
                { type: 'change_bounds', duration: 400, interpolator: 'ease_in' }
            ]
        });
        const cfg = (LayoutAnimation.configureNext as jest.Mock).mock.calls[0][0];
        expect(cfg.duration).toBe(400);
        expect(cfg.update.type).toBe('easeIn');
    });
});
