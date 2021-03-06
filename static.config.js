import axios from 'axios'
import React, { Component } from 'react'
import { ServerStyleSheet } from 'styled-components'

/*
* For TypeScript Support
* */
const typescriptWebpackPaths = require("./webpack.config.js");

/*
* For Less Support
* */
import autoprefixer from 'autoprefixer';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import postcssFlexbugsFixes from 'postcss-flexbugs-fixes';

const path = require('path');
const fs = require('fs');

const lessToJs = require('less-vars-to-js');
const themeVariables = lessToJs(fs.readFileSync(path.join(__dirname, 'src/theme-ant-overwrite.less'), 'utf8'));

//
export default {
  getSiteProps: () => ({
    title: 'React Static',
  }),
  getRoutes: async () => {
    const { data: posts } = await axios.get('https://jsonplaceholder.typicode.com/posts')
    return [
      {
        path: '/',
        component: 'src/containers/Home',
      },
      {
        path: '/about',
        component: 'src/containers/About',
      },
      {
        path: '/blog',
        component: 'src/containers/Blog',
        getProps: () => ({
          posts,
        }),
        children: posts.map(post => ({
          path: `/post/${post.id}`,
          component: 'src/containers/Post',
          getProps: () => ({
            post,
          }),
        })),
      },
      {
        is404: true,
        component: 'src/containers/404',
      },
    ]
  },
  renderToHtml: (render, Comp, meta) => {
    const sheet = new ServerStyleSheet()
    const html = render(sheet.collectStyles(<Comp />))
    meta.styleTags = sheet.getStyleElement()
    return html
  },
  Document: class CustomHtml extends Component {
    render () {
      const { Html, Head, Body, children, renderMeta } = this.props

      return (
        <Html>
        <Head>
          <meta charSet="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          {renderMeta.styleTags}
        </Head>
        <Body>
        {children}
        </Body>
        </Html>
      )
    }
  },
  webpack: (config, args) => {

    // For Debug: Set to true to take a look at the final config.
    const printWebpackConfigDuringBuild = false;
    const { stage } = args; // is dev or prod

    /*
    * TypeScript Support
    * */

    // Add .ts and .tsx extension to resolver
    config.resolve.extensions.push(".ts", ".tsx");

    // Add TypeScript Path Mappings (from tsconfig via webpack.config.js)
    // to react-statics alias resolution
    config.resolve.alias = typescriptWebpackPaths.resolve.alias;

    // We replace the existing JS rule with one, that allows us to use
    // both TypeScript and JavaScript interchangeably
    config.module.rules[0] = {
      test: /\.(js|jsx|ts|tsx)$/,
      exclude: config.module.rules[0].exclude,
      use: [
        {
          loader: "babel-loader"
        },
        {
          loader: 'ts-loader',
          options: {
            transpileOnly: true
          }
        }
      ]
    };


    /*
    * Less Support
    * */

    // Add .less & .css to resolver
    config.resolve.extensions.push(".less");
    config.resolve.extensions.push(".css");

    // Loader depending on stage
    let lessConfig =  {};

    if (stage === 'dev') {

      // In-Line with style-loader
      lessConfig =
        {
          test: /\.less$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1,
                minimize: false,
                sourceMap: true,
              },
            },
            {
              loader: 'postcss-loader',
              options: {
                // Necessary for external CSS imports to work
                // https://github.com/facebookincubator/create-react-app/issues/2677
                sourceMap: true,
                ident: 'postcss',
                plugins: () => [
                  postcssFlexbugsFixes,
                  autoprefixer({
                    browsers: [
                      '>1%',
                      'last 4 versions',
                      'Firefox ESR',
                      'not ie < 9', // React doesn't support IE8 anyway
                    ],
                    flexbox: 'no-2009',
                  }),
                ],
              },
            },
            {
              loader: "less-loader",
              options: {
                sourceMap: true,
                modifyVars: themeVariables
              }
            }
          ],
        }

    } else {

      // Extract to style.css
      lessConfig =
        {
          test: /\.less$/,
          loader: ExtractTextPlugin.extract({
            fallback: {
              loader: 'style-loader',
              options: {
                hmr: false,
                sourceMap: false
              },
            },
            use: [
              {
                loader: 'css-loader',
                options: {
                  importLoaders: 1,
                  minimize: true,
                  sourceMap: false,
                },
              },
              {
                loader: 'postcss-loader',
                options: {
                  // Necessary for external CSS imports to work
                  // https://github.com/facebookincubator/create-react-app/issues/2677
                  ident: 'postcss',
                  plugins: () => [
                    postcssFlexbugsFixes,
                    autoprefixer({
                      browsers: [
                        '>1%',
                        'last 4 versions',
                        'Firefox ESR',
                        'not ie < 9', // React doesn't support IE8 anyway
                      ],
                      flexbox: 'no-2009',
                    }),
                  ],
                },
              },
              {
                loader: "less-loader",
                options: {
                  sourceMap: false,
                  modifyVars: themeVariables,
                }
              }
            ],
          }),
        }
      }

    // Add less config to rules
    config.module.rules.push(lessConfig);

    // Update ExtractTextPlugin with current instance
    config.plugins[2] =
      new ExtractTextPlugin({
        filename: getPath => {
          process.env.extractedCSSpath = 'styles.css';
          return getPath('styles.css')
        },
        allChunks: true,
      });

    /*
    * In the future, this segment will change or be unnecessary.
    * Whitelisting Extensions from pre-parser and universal url-loader
    * */

    // Tell pre-processor (babel) to ignore styles since, though they are
    // imported as modules, are not parse able code.
    require("babel-register");
    require.extensions[".less"] = () => {};
    require.extensions[".css"] = () => {};

    // Whitelist less and ts(x) extensions from the universal url-loader, by
    // overwriting the default exclude REGEX in static-react/src/webpack/rules
    config.module.rules[2].exclude = /\.(js|jsx|css|less|ts|tsx)(\?.*)?$/ ;

    // For Debugging and inspection. Final Webpack Config used during build.
    if(printWebpackConfigDuringBuild && stage === "dev") {
      const configString = JSON.stringify(config, null, 2);
      console.log(configString);
    }

  }
}
