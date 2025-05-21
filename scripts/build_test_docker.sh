#!/bin/bash

repo_root="$(git rev-parse --show-toplevel)"

function build() {
  cd "$repo_root" || exit 1
  yarn && yarn build

  cd "$repo_root"/deploy || exit 1
  yarn && yarn build
  docker build --build-arg NDC_VERSION=1.3.4 --build-arg NDC_FINGERPRINT="$(openssl rand -hex 16)" -t plankroot/docker-console:test-1 .
}

build
