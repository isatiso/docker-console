#!/usr/bin/env bash

set -e

repo_root="$(git rev-parse --show-toplevel)"

function figure_hash_of_packages() {
    "$repo_root"/scripts/figure_files_hash.sh "$repo_root"/common
    "$repo_root"/scripts/figure_files_hash.sh "$repo_root"/deploy
    "$repo_root"/scripts/figure_files_hash.sh "$repo_root"/scripts
    "$repo_root"/scripts/figure_files_hash.sh "$repo_root"/server
    "$repo_root"/scripts/figure_files_hash.sh "$repo_root"/ui
    md5sum "$repo_root"/package.json | awk '{print $1}'
}

figure_hash_of_packages | sort | md5sum | awk '{print $1}'
