#!/usr/bin/env bash

set -e

cd "$(git rev-parse --show-toplevel)" || return 0;
if command -v yarn; then
  CACHE_DIR=$(yarn cache dir)
else
  CACHE_DIR=/usr/local/share/.cache/yarn
fi

echo "Use cache dir $CACHE_DIR"

docker run \
    -v "${UNIFIED_NODE_ROOT:-$(git rev-parse --show-toplevel)}":/root/code \
    -v $CACHE_DIR:/usr/local/share/.cache/yarn \
    -v /var/run/docker.sock:/var/run/docker.sock \
    --network host \
    -e AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID \
    -e AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY \
    -e NODE_SMC_PROJECT_NAME=$NODE_SMC_PROJECT_NAME \
    -e NODE_SMC_STATION_NAME=$NODE_SMC_STATION_NAME \
    --name "node_smc_dev_"$USER \
    -it \
    --rm \
    -w /root/code \
    node:22.2.0 \
    bash;
