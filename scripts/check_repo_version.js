#!/usr/bin/env node

const { compareVersions } = require('compare-versions')

const compare_result = compareVersions(process.env.MASTER_VERSION, process.env.CURRENT_VERSION)

if (compare_result > 0) {
    console.log('Master version is bigger than current version')
    process.exit(1)
} else if (compare_result === 0) {
    console.log('Master version is equal to current version')
    process.exit(1)
} else {
    process.exit(0)
}
