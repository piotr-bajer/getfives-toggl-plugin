const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  watch: true,
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
