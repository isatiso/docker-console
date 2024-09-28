#!/usr/bin/env bash

set -e

export MASTER_VERSION=$(git show origin/master:package.json | jq -r '.version');
export CURRENT_VERSION=$(git show HEAD:package.json | jq -r '.version');

node scripts/check_repo_version.js
