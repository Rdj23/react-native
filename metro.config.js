// // metro.config.js
// const { getDefaultConfig } = require('@react-native/metro-config');
// const path = require('path');

// module.exports = (async () => {
//   const {
//     resolver: { assetExts: defaultAssetExts, sourceExts: defaultSourceExts },
//     transformer: defaultTransformer,
//   } = await getDefaultConfig();

//   console.log('→ Metro default assetExts:', defaultAssetExts);
//   console.log('→ Metro default sourceExts:', defaultSourceExts);

//   return {
//     transformer: {
//       babelTransformerPath: require.resolve('react-native-svg-transformer'),
//       ...defaultTransformer,
//     },

//     resolver: {
//       // Remove 'svg' so Metro doesn’t treat SVG files as plain assets
//       assetExts: defaultAssetExts.filter(ext => ext !== 'svg'),

//       // Add 'svg' to sourceExts so the transformer runs on .svg files
//       sourceExts: [...defaultSourceExts, 'svg'],
//     },

//     // Optional: explicitly watch React Navigation’s module folders
//     // so that any nested PNGs there are not ignored by Metro’s default blacklist.
//     watchFolders: [
//       path.resolve(__dirname, 'node_modules/@react-navigation/drawer'),
//       path.resolve(__dirname, 'node_modules/@react-navigation/elements'),
//     ],
//   };
// })();

// metro.config.js
const { getDefaultConfig } = require('@react-native/metro-config');
const path = require('path');

/**
 * Metro configuration
 * Use a synchronous config to ensure the SVG transformer runs correctly.
 */
const defaultConfig = getDefaultConfig(__dirname);

module.exports = {
  transformer: {
    ...defaultConfig.transformer,
    babelTransformerPath: require.resolve('react-native-svg-transformer'),
  },
  resolver: {
    assetExts: defaultConfig.resolver.assetExts.filter(ext => ext !== 'svg'),
    sourceExts: [...defaultConfig.resolver.sourceExts, 'svg'],
  },
//   watchFolders: [
//     path.resolve(__dirname, 'node_modules/@react-navigation/drawer'),
//     path.resolve(__dirname, 'node_modules/@react-navigation/elements'),
//   ],
};