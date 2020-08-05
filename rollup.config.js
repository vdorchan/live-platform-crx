import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import replace from '@rollup/plugin-replace'
import { terser } from 'rollup-plugin-terser'
import copy from 'rollup-plugin-copy'

const crxName = 'Live Assistant'
const prodOutput = `dist/${crxName}`
const testOutput = `dist/${crxName} Test`
const devOutput = `dist/${crxName} Dev`

const getPlugins = (env, output) => {
  return {
    plugins: [
      copy({
        targets: [
          { src: 'popup.html', dest: output },
          { src: 'images/**/*', dest: `${output}/images` },
          { src: 'css/**/*', dest: `${output}/css` },
        ],
      }),
      nodeResolve(),
      babel({
        exclude: 'node_modules/**',
      }),
      replace({
        'process.env.NODE_ENV': JSON.stringify(env),
      }),
      ...(env === 'production'
        ? [
            terser({
              compress: {
                pure_getters: true,
                unsafe: true,
                unsafe_comps: true,
                warnings: false,
              },
            }),
          ]
        : []),
      commonjs(),
    ],
  }
}

export default [
  {
    input: 'js/background.js',
    output: {
      file: `${prodOutput}/background.js`,
      format: 'umd',
      name: 'background',
      indent: false,
    },
    ...getPlugins('production', prodOutput),
  },
  {
    input: 'js/popup.js',
    output: {
      file: `${prodOutput}/popup.js`,
      format: 'umd',
      name: 'popup',
      indent: false,
    },
    ...getPlugins('production', prodOutput),
  },
  {
    input: 'js/contentScript.js',
    output: {
      file: `${prodOutput}/contentScript.js`,
      format: 'umd',
      name: 'contentScript',
      indent: false,
    },
    ...getPlugins('production', prodOutput),
  },

  {
    input: 'js/background.js',
    output: {
      file: `${testOutput}/background.js`,
      format: 'umd',
      name: 'background',
      indent: false,
    },
    ...getPlugins('test', testOutput),
  },
  {
    input: 'js/popup.js',
    output: {
      file: `${testOutput}/popup.js`,
      format: 'umd',
      name: 'popup',
      indent: false,
    },
    ...getPlugins('test', testOutput),
  },
  {
    input: 'js/contentScript.js',
    output: {
      file: `${testOutput}/contentScript.js`,
      format: 'umd',
      name: 'contentScript',
      indent: false,
    },
    ...getPlugins('test', testOutput),
  },

  {
    input: 'js/background.js',
    output: {
      file: `${devOutput}/background.js`,
      format: 'umd',
      name: 'background',
      indent: false,
    },
    ...getPlugins('dev', devOutput),
  },
  {
    input: 'js/popup.js',
    output: {
      file: `${devOutput}/popup.js`,
      format: 'umd',
      name: 'popup',
      indent: false,
    },
    ...getPlugins('dev', devOutput),
  },
  {
    input: 'js/contentScript.js',
    output: {
      file: `${devOutput}/contentScript.js`,
      format: 'umd',
      name: 'contentScript',
      indent: false,
    },
    ...getPlugins('dev', devOutput),
  }
]
