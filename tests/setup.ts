/**
 * Jest setup file for DivKit React Native tests
 */

// Mock optional dependencies
jest.mock(
    '@react-native-clipboard/clipboard',
    () => ({
        default: {
            setString: jest.fn()
        }
    }),
    { virtual: true }
);

// Suppress console.error in tests unless needed
const originalConsoleError = console.error;
beforeAll(() => {
    console.error = (...args: any[]) => {
        // Only show errors that aren't React Native warnings
        if (!args[0]?.includes?.('Warning:')) {
            originalConsoleError(...args);
        }
    };
});

afterAll(() => {
    console.error = originalConsoleError;
});
