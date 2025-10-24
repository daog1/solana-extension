const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    background: './src/background.ts',
    content: './src/content.ts',
    popup: './src/popup.ts'
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].js',
    clean: true
  },
  mode: 'production',
  resolve: {
    extensions: ['.ts', '.js', '.json']
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/
      }
    ]
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { from: 'manifest.json', to: 'manifest.json' },
        { from: 'popup.html', to: 'popup.html' },
        { from: 'content.css', to: 'content.css' },
        { from: 'icons', to: 'icons' },
        { from: '_locales', to: '_locales' },
        { from: 'README.md', to: 'README.md' },
        { from: 'test.html', to: 'test.html' }
      ]
    })
  ],
  optimization: {
    minimize: true,
    splitChunks: false,
    usedExports: true,
    sideEffects: true
  },
  performance: {
    hints: 'warning',
    maxAssetSize: 300000, // 300 KiB
    maxEntrypointSize: 300000 // 300 KiB
  }
};
