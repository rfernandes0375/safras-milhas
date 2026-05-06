module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Nota: react-native-reanimated v4 não usa mais plugin Babel
  };
};
