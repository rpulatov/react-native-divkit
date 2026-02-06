/**
 * Mock for React Native modules
 */

export const View = 'View';
export const Text = 'Text';
export const Image = 'Image';
export const Pressable = 'Pressable';
export const ActivityIndicator = 'ActivityIndicator';

export const StyleSheet = {
    create: <T extends Record<string, any>>(styles: T): T => styles,
    flatten: (style: any): any => style
};

export const LayoutAnimation = {
    configureNext: jest.fn(),
    Presets: {
        easeInEaseOut: {}
    }
};

export const Platform = {
    OS: 'ios' as const,
    select: <T>(obj: { ios?: T; android?: T; default?: T }): T | undefined => obj.ios ?? obj.default
};

export default {
    View,
    Text,
    Image,
    Pressable,
    ActivityIndicator,
    StyleSheet,
    LayoutAnimation,
    Platform
};
