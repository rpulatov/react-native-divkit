const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');
const path = require('path');
const { default: exclusionList } = require('metro-config/private/defaults/exclusionList');

const root = path.resolve(__dirname, '../..');
const rootNodeModules = path.resolve(root, 'node_modules');
const exampleNodeModules = path.resolve(__dirname, 'node_modules');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const config = {
  watchFolders: [root],
  resolver: {
    nodeModulesPaths: [exampleNodeModules],
    blockList: exclusionList([
      new RegExp(`${rootNodeModules.replace(/[/\\]/g, '[/\\\\]')}[/\\\\]react[/\\\\].*`),
      new RegExp(`${rootNodeModules.replace(/[/\\]/g, '[/\\\\]')}[/\\\\]react-native[/\\\\].*`),
    ]),
    extraNodeModules: {
      react: path.resolve(exampleNodeModules, 'react'),
      'react-native': path.resolve(exampleNodeModules, 'react-native'),
    },
  },
};

module.exports = mergeConfig(getDefaultConfig(__dirname), config);
