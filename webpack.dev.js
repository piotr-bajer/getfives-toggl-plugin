const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: 'development',
  watch: true,
  entry: {
    'background': './src/background.js',
    'getfives': './src/getfives.js',
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
        {
          from: '**/*',
          context: 'src/',
          globOptions: {
            ignore: ['**/templates/*'],
          },
        },
      ],
    }),
  ],
};
