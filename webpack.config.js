const path = require('path')

module.exports = {
  resolve: {
    extensions: ['.ts', '.js', '.json']
  },
  entry: {
    'lightwallet-provider': './src/lightwallet-provider.ts',
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  optimization: {
    minimize: false
  },
  output: {
    // If path is missing, it's default value is './'
    path: path.resolve('./'),
    filename: path.join('dist', '[name].js'),
  },
  /*externals: {
    web3: 'Web3',
  },*/
};
