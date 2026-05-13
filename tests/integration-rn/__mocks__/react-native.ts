/**
 * React Native mock for integration tests. Extends the snapshot RN shim with
 * an imperative `scrollTo` (and similar) on `ScrollView` so DivPager's
 * scrollRef.scrollTo() calls work without throwing.
 */
import React from 'react';

function createMockComponent(name: string) {
    const component = React.forwardRef(({ children, ...props }: any, ref: any) =>
        React.createElement(name, { ...props, ref }, children)
    );
    component.displayName = name;
    return component;
}

export const View = createMockComponent('View');
export const Text = createMockComponent('Text');
export const Image = Object.assign(createMockComponent('Image'), {
    getSize: jest.fn(
        (
            _uri: string,
            success: (w: number, h: number) => void,
            _failure?: (error: any) => void
        ) => {
            success(200, 100);
        }
    )
});
export const TextInput = createMockComponent('TextInput');

// ScrollView with a working imperative `scrollTo`. The same ref instance
// is exposed through forwardRef so DivPager's scrollRef.current can call it.
type ScrollOpts = { x?: number; y?: number; animated?: boolean };
export const ScrollView = React.forwardRef(({ children, ...props }: any, ref: any) => {
    React.useImperativeHandle(
        ref,
        () => ({
            scrollTo: jest.fn((_opts?: ScrollOpts) => {
                /* noop */
            }),
            scrollToEnd: jest.fn(),
            getScrollResponder: jest.fn()
        }),
        []
    );
    return React.createElement('ScrollView', props, children);
});
(ScrollView as any).displayName = 'ScrollView';

export const Switch = createMockComponent('Switch');
export const Modal = createMockComponent('Modal');
export const Pressable = createMockComponent('Pressable');
export const ActivityIndicator = createMockComponent('ActivityIndicator');

export const Animated = {
    View: createMockComponent('Animated.View'),
    Text: createMockComponent('Animated.Text'),
    Image: createMockComponent('Animated.Image'),
    Value: jest.fn().mockImplementation((val: number) => ({
        _value: val,
        setValue: jest.fn(),
        interpolate: jest.fn().mockReturnValue({ _value: val })
    })),
    timing: jest.fn().mockReturnValue({ start: jest.fn((cb?: Function) => cb?.()) }),
    spring: jest.fn().mockReturnValue({ start: jest.fn((cb?: Function) => cb?.()) }),
    parallel: jest.fn().mockReturnValue({ start: jest.fn((cb?: Function) => cb?.()) }),
    event: jest.fn(),
    multiply: jest.fn((a: any, _b: any) => a)
};

export const StyleSheet = {
    create: <T extends Record<string, any>>(styles: T): T => styles,
    flatten: (style: any): any => {
        if (Array.isArray(style)) {
            return Object.assign({}, ...style.filter(Boolean));
        }
        return style || {};
    }
};

export const LayoutAnimation = {
    configureNext: jest.fn(),
    Presets: { easeInEaseOut: {} }
};

const easingFn = (t: number) => t;
export const Easing = {
    linear: easingFn,
    ease: easingFn,
    quad: easingFn,
    cubic: easingFn,
    sin: easingFn,
    circle: easingFn,
    exp: easingFn,
    bounce: easingFn,
    in: (_easing: (t: number) => number) => easingFn,
    out: (_easing: (t: number) => number) => easingFn,
    inOut: (_easing: (t: number) => number) => easingFn,
    bezier: () => easingFn
};

export const Platform = {
    OS: 'ios' as const,
    select: <T>(obj: { ios?: T; android?: T; default?: T }): T | undefined => obj.ios ?? obj.default
};

export default {
    View,
    Text,
    Image,
    TextInput,
    ScrollView,
    Switch,
    Modal,
    Pressable,
    ActivityIndicator,
    Animated,
    Easing,
    StyleSheet,
    LayoutAnimation,
    Platform
};
