const CopyPlugin = require('copy-webpack-plugin');

/**
 * @param {string} content
 * @return {*}
 */
function transformManifest(content) {
  const manifest = JSON.parse(content.toString());

  delete manifest.content_security_policy;

  manifest.background.scripts = manifest.background.scripts
      .filter((s) => s !== 'hot-reload.js');

  return Buffer.from(JSON.stringify(manifest, undefined, 2));
}

module.exports = {
  mode: 'production',
  watch: false,
  entry: {
    'background': './src/background.js',
    'getfives': './src/getfives.js',
    'ifirma': './src/ifirma.js',
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
          from: 'src/manifest.json',
          to: 'manifest.json',
          transform: transformManifest,
        },
        {
          from: '**/*',
          context: 'src/',
          globOptions: {
            ignore: ['**/hot-reload.js', '**/templates/*'],
          },
        },
      ],
    }),
  ],
};
