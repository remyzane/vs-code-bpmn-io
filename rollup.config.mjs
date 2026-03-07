import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';
import url from '@rollup/plugin-url';

import css from 'rollup-plugin-css-only';

export default [

  // client
  {
    input: 'src/bpmn/index.js',
    output: {
      sourcemap: true,
      format: 'iife',
      file: './out/bpmn/index.js'
    },
    plugins: [
      url({
        fileName: '[dirname][filename][extname]',
        publicPath: '/media/'
      }),

      css({ output: 'bpmn/样式.css' }),

      resolve(),
      commonjs()
    ],
    watch: {
      clearScreen: false
    }
  },

  // app
  {
    input: 'src/extension.ts',
    output: {
      sourcemap: true,
      format: 'commonjs',
      file: './out/extension.js'
    },
    external: ['vscode'],
    plugins: [
      typescript(),
      resolve(),
      commonjs()
    ],
    watch: {
      clearScreen: false
    }
  }
];
