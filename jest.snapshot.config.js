module.exports = {
    testEnvironment: 'node',
    roots: ['<rootDir>/tests/snapshots', '<rootDir>/src'],
    testMatch: ['**/tests/snapshots/**/*.test.tsx'],
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
        '^react-native$': '<rootDir>/tests/snapshots/__mocks__/react-native.ts'
    },
    setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
    modulePathIgnorePatterns: ['<rootDir>/dist/']
};
