const {getDefaultConfig, mergeConfig} = require('@react-native/metro-config');
const {
  wrapWithReanimatedMetroConfig,
} = require('react-native-reanimated/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);
const customConfig = {
  // Vos options de configuration Metro existantes
  resolver: {
    assetExts: ['pdf', 'png', 'jpg', 'jpeg', 'gif'], // Ajoutez 'pdf' à la liste
  },
};

const config = mergeConfig(defaultConfig, customConfig);

module.exports = wrapWithReanimatedMetroConfig(config);
