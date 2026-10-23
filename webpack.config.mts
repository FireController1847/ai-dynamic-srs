import { fileURLToPath } from 'node:url';
import webpack from 'webpack';
import type { Configuration } from 'webpack';
import type { Configuration as DevServerConfiguration } from 'webpack-dev-server';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import CopyPlugin from 'copy-webpack-plugin';
import MiniCssExtractPlugin from 'mini-css-extract-plugin';
import CssMinimizerPlugin from 'css-minimizer-webpack-plugin';

const root = fileURLToPath(new URL('.', import.meta.url));

function configuredBasePath(): string {
  const raw = process.env.PAGES_BASE_PATH ?? '';
  if (raw && (!raw.startsWith('/') || raw.startsWith('//') ||
      /[?#\\\s%]/.test(raw) || raw.split('/').some(part => part === '.' || part === '..'))) {
    throw new Error('PAGES_BASE_PATH must be an absolute URL path, such as /ai-dynamic-srs.');
  }
  return `${raw.replace(/\/+$/, '')}/`;
}

export default (_env: unknown, argv: { mode?: Configuration['mode'] }): Configuration & { devServer: DevServerConfiguration } => {
  const production = argv.mode === 'production';
  const basePath = configuredBasePath();
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 0 || port > 65535) {
    throw new Error('PORT must be an integer between 0 and 65535.');
  }

  return {
    context: root,
    entry: { app: './src/app/app.ts' },
    target: ['web', 'es2022'],
    output: {
      path: fileURLToPath(new URL('dist/', import.meta.url)),
      filename: 'assets/[name].[contenthash:8].js',
      assetModuleFilename: 'assets/[name].[contenthash:8][ext]',
      publicPath: basePath,
      clean: true,
    },
    devtool: production ? false : 'source-map',
    resolve: { extensionAlias: { '.js': ['.ts', '.js'] } },
    module: { rules: [
      { test: /\.ts$/i, exclude: /node_modules/, use: {
        loader: 'ts-loader',
        options: { configFile: 'tsconfig.app.json',
          compilerOptions: { noEmit: false, rewriteRelativeImportExtensions: true } },
      }},
      { test: /\.css$/i, use: [MiniCssExtractPlugin.loader, 'css-loader'] },
      { test: /\.(png|jpe?g|gif|svg|webp|ico|woff2?)$/i, type: 'asset/resource' },
    ] },
    plugins: [
      new webpack.DefinePlugin({
        __VUE_OPTIONS_API__: true,
        __VUE_PROD_DEVTOOLS__: false,
        __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
      }),
      new MiniCssExtractPlugin({ filename: 'assets/[name].[contenthash:8].css' }),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: './src/html/index.html',
        templateParameters: { basePath },
        scriptLoading: 'defer',
      }),
      new CopyPlugin({ patterns: [
        { from: 'LICENSE', to: 'LICENSE', toType: 'file' },
        { from: 'public/.nojekyll', to: '.nojekyll', toType: 'file' },
      ] }),
    ],
    optimization: { minimizer: ['...', new CssMinimizerPlugin()], splitChunks: { chunks: 'all' } },
    devServer: {
      host: process.env.HOST ?? '127.0.0.1',
      port,
      static: false,
      // A branch switch/rebuild must not leave the browser mixing old styles and new views.
      headers: { 'Cache-Control': 'no-store, no-cache, must-revalidate' },
      historyApiFallback: false,
      hot: false,
      liveReload: true,
      client: { overlay: { errors: true, warnings: false } },
    },
  };
};
