const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'production',
  watch: false,
  entry: {
    'background': './src/background.js',
    'content-script': './src/content-script.js',
    'hot-reload': './src/hot-reload.js',
  },
  module: {
    rules: [
      {
        test: /\.html$/i,
        loader: 'html-loader',
      },
    ],
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {from: 'src'},
      ],
    }),
  ],
};
