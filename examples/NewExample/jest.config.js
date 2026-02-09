module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|react-native-svg|react-native-safe-area-context)/)',
  ],
  moduleNameMapper: {
    'react-native-svg': '<rootDir>/__mocks__/react-native-svg.js',
    '^react-native/(.+)': '<rootDir>/node_modules/react-native/$1',
    '^react-native$': '<rootDir>/node_modules/react-native',
    '^react$': '<rootDir>/node_modules/react',
    '^react-test-renderer$': '<rootDir>/node_modules/react-test-renderer',
  },
};
