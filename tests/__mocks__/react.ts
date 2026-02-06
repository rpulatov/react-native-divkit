/**
 * Mock for React
 */

const React = {
    createElement: jest.fn((type, props, ...children) => ({
        type,
        props: { ...props, children }
    })),
    createContext: jest.fn((defaultValue) => ({
        Provider: ({ value, children }: any) => children,
        Consumer: ({ children }: any) => children(defaultValue),
        _currentValue: defaultValue
    })),
    useContext: jest.fn((context) => context._currentValue),
    useState: jest.fn((initial) => [initial, jest.fn()]),
    useEffect: jest.fn(),
    useCallback: jest.fn((fn) => fn),
    useMemo: jest.fn((fn) => fn()),
    useRef: jest.fn((initial) => ({ current: initial })),
    memo: jest.fn((component) => component),
    Fragment: 'Fragment'
};

export default React;
export const {
    createElement,
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useMemo,
    useRef,
    memo,
    Fragment
} = React;
