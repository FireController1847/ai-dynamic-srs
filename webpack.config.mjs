import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';

const root = fileURLToPath(new URL('.', import.meta.url));

function basePathFrom(value = '') {
  if (value && (!value.startsWith('/') || value.startsWith('//')
    || /[?#\\\s%]/.test(value)
    || value.split('/').some(part => part === '.' || part === '..'))) {
    throw new Error('PAGES_BASE_PATH must be an absolute URL path, such as /ai-dynamic-srs.');
  }
  return `${value.replace(/\/+$/, '')}/`;
}

export default (_env, argv) => {
  const production = argv.mode === 'production';
  const basePath = basePathFrom(process.env.PAGES_BASE_PATH);
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be an integer between 0 and 65535.');
  }

  return {
    context: root,
    entry: { app: './src/app/app.js' },
    target: ['web', 'es2022'],
    output: {
      path: fileURLToPath(new URL('dist/', import.meta.url)),
      filename: 'assets/[name].[contenthash:8].js',
      assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
      publicPath: basePath,
      clean: true
    },
    devtool: production ? false : 'source-map',
    // Existing Vue components and the HTML shell compile templates at runtime.
    resolve: { alias: { vue$: 'vue/dist/vue.esm-bundler.js' } },
    module: {
      rules: [
        { test: /\.css$/i, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
        { test: /\.(png|jpe?g|gif|svg|webp|ico|woff2?)$/i, type: 'asset/resource' }
      ]
    },
    plugins: [
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false,
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false
      }),
      new MiniCssExtractPlugin({ filename: 'assets/[name].[contenthash:8].css' }),
      new HtmlWebpackPlugin({
        template: './src/html/index.html',
        basePath,
        scriptLoading: 'defer'
      }),
      new CopyPlugin({ patterns: [
        // The print iframe loads these directly, outside the app bundle.
        { from: 'node_modules/pagedjs/dist/paged.polyfill.js', to: 'assets/paged.polyfill.js', toType: 'file' },
        { from: 'src/styles/markdown.css', to: 'assets/print/markdown.css', toType: 'file' },
        { from: 'src/styles/compact-documents.css', to: 'assets/print/compact-documents.css', toType: 'file' },
        { from: 'LICENSE', to: 'LICENSE', toType: 'file' },
        { from: 'public/.nojekyll', to: '.nojekyll', toType: 'file' },
        { from: 'node_modules/vue/LICENSE', to: 'licenses/vue.txt', toType: 'file' },
        { from: '@vue/*/LICENSE', to: 'licenses/[path][name]', context: 'node_modules' },
        { from: 'node_modules/bootstrap/LICENSE', to: 'licenses/bootstrap.txt', toType: 'file' },
        { from: 'node_modules/@popperjs/core/LICENSE.md', to: 'licenses/popper.txt', toType: 'file' },
        { from: 'node_modules/pagedjs/LICENSE.md', to: 'licenses/pagedjs.txt', toType: 'file' }
      ] }),
    ],
    optimization: {
      minimizer: ['...', new CssMinimizerPlugin()],
      splitChunks: { chunks: 'all' }
    },
    devServer: {
      host: process.env.HOST ?? '127.0.0.1',
      port,
      static: false,
      historyApiFallback: false,
      hot: false,
      liveReload: true,
      client: { overlay: { errors: true, warnings: false } }
    }
  };
};
