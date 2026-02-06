const path = require('path');

module.exports = {
  preset: 'react-native',
  moduleNameMapper: {
    '^react$': path.resolve(__dirname, 'node_modules/react'),
    '^react/(.*)$': path.resolve(__dirname, 'node_modules/react/$1'),
    '^react-native$': path.resolve(__dirname, 'node_modules/react-native'),
    '^react-native/(.*)$': path.resolve(__dirname, 'node_modules/react-native/$1'),
    '^react-native-svg$': path.resolve(__dirname, 'node_modules/react-native-svg'),
    '^@babel/runtime/(.*)': path.resolve(__dirname, 'node_modules/@babel/runtime/$1'),
  },
};
