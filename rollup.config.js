import nodeResolve from 'rollup-plugin-node-resolve'
import commonjs from 'rollup-plugin-commonjs'
import babel from 'rollup-plugin-babel'
import replace from '@rollup/plugin-replace'
import { terser } from 'rollup-plugin-terser'
import livereload from 'rollup-plugin-livereload'

const plugins = [
  nodeResolve(),
  babel({
    exclude: 'node_modules/**',
  }),
  replace({
    'process.env.NODE_ENV': JSON.stringify('production'),
  }),
  terser({
    compress: {
      pure_getters: true,
      unsafe: true,
      unsafe_comps: true,
      warnings: false,
    },
  }),
  commonjs(),
]

export default [
  {
    input: 'js/background.js',
    output: {
      file: 'dist/Live Assistant/background.js',
      format: 'umd',
      name: 'background',
      indent: false,
    },
    plugins,
  },
  {
    input: 'js/popup.js',
    output: {
      file: 'dist/Live Assistant/popup.js',
      format: 'umd',
      name: 'popup',
      indent: false,
    },
    plugins,
  },
  {
    input: 'js/contentScript.js',
    output: {
      file: 'dist/Live Assistant/contentScript.js',
      format: 'umd',
      name: 'contentScript',
      indent: false,
    },
    plugins,
  },
]
