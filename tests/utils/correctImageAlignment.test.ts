import { alignHToFlex, alignVToFlex } from '../../src/utils/correctImageAlignment';

describe('alignHToFlex', () => {
    test('explicit values', () => {
        expect(alignHToFlex('left')).toBe('flex-start');
        expect(alignHToFlex('center')).toBe('center');
        expect(alignHToFlex('right')).toBe('flex-end');
    });

    test('start/end aliases', () => {
        expect(alignHToFlex('start')).toBe('flex-start');
        expect(alignHToFlex('end')).toBe('flex-end');
    });

    test('unknown value falls back to center', () => {
        expect(alignHToFlex('')).toBe('center');
        expect(alignHToFlex('middle')).toBe('center');
        expect(alignHToFlex('top')).toBe('center');
    });
});

describe('alignVToFlex', () => {
    test('explicit values', () => {
        expect(alignVToFlex('top')).toBe('flex-start');
        expect(alignVToFlex('center')).toBe('center');
        expect(alignVToFlex('bottom')).toBe('flex-end');
    });

    test('unknown value falls back to center', () => {
        expect(alignVToFlex('')).toBe('center');
        expect(alignVToFlex('left')).toBe('center');
        expect(alignVToFlex('middle')).toBe('center');
    });
});
