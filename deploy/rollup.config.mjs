import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import nodeResolve from '@rollup/plugin-node-resolve'

export default [{
    input: '../server/lib/index.js',
    output: [
        { dir: './lib', format: 'cjs' },
    ],
    plugins: [
        json(),
        commonjs(),
        nodeResolve({
            preferBuiltins: true
        }),
    ],
    external: [
        '@lydell/node-pty'
    ]
}]
