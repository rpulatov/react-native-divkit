/**
 * Jest config for integration tests that need a real React + RN-shaped runtime
 * (no stubbed hooks). Uses the same RN shim as snapshot tests so it's
 * compatible with @testing-library/react-native.
 */
module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests/integration-rn', '<rootDir>/src'],
    testMatch: ['**/tests/integration-rn/**/*.test.tsx'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transform: {
        '^.+\\.(ts|tsx)$': [
            'ts-jest',
            {
                tsconfig: 'tsconfig.test.json',
                diagnostics: false
            }
        ]
    },
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^react-native-svg$': '<rootDir>/tests/__mocks__/react-native-svg.ts',
        '^react-native$': '<rootDir>/tests/integration-rn/__mocks__/react-native.ts'
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    modulePathIgnorePatterns: ['<rootDir>/dist/']
};
