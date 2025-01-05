#!/usr/bin/env bash

set -e

NDC_PORT=7293
CONFIG_PATH="/etc/docker-console"
DATA_PATH="/docker-console"
CONTAINER_NAME="docker-console"
VERSION="latest"

POSITIONAL_ARGS=()

while [[ $# -gt 0 ]]; do
  case $1 in
    -p|--port)
      if [[ -z "$2" ]]; then
        echo "Option $1 requires an argument."
        exit 1
      fi
      NDC_PORT="$2"
      shift
      shift
      ;;
    -d|--data-path)
      if [[ -z "$2" ]]; then
        echo "Option $1 requires an argument."
        exit 1
      fi
      DATA_PATH="$2"
      shift
      shift
      ;;
    -c|--config-path)
      if [[ -z "$2" ]]; then
        echo "Option $1 requires an argument."
        exit 1
      fi
      CONFIG_PATH="$2"
      shift
      shift
      ;;
    -n|--name)
      if [[ -z "$2" ]]; then
        echo "Option $1 requires an argument."
        exit 1
      fi
      CONTAINER_NAME="$2"
      shift
      shift
      ;;
    -v|--version)
      if [[ -z "$2" ]]; then
        echo "Option $1 requires an argument."
        exit 1
      fi
      VERSION="$2"
      shift
      shift
      ;;
    -*)
      echo "Unknown option $1"
      exit 1
      ;;
    *)
      POSITIONAL_ARGS+=("$1") # save positional arg
      shift # past argument
      ;;
  esac
done

set -- "${POSITIONAL_ARGS[@]}" # restore positional parameters

echo "CONFIG_PATH=$CONFIG_PATH"
echo "DATA_PATH=$DATA_PATH"
echo "CONTAINER_NAME=$CONTAINER_NAME"
echo "VERSION=$VERSION"
echo "NDC_PORT=$NDC_PORT"
echo "POSITIONAL_ARGS=${POSITIONAL_ARGS[*]}"

mkdir -p "$DATA_PATH"
mkdir -p "$CONFIG_PATH"

NDC_IMAGE="plankroot/docker-console:$VERSION"

if docker inspect "$CONTAINER_NAME" >/dev/null 2>&1; then
  exist_docker_version=$(docker inspect --format='{{index .Config.Labels "com.docker-console.version"}}' "$CONTAINER_NAME")
  exist_docker_status=$(docker inspect --format='{{.State.Status}}' "$CONTAINER_NAME")
  if [ "$exist_docker_version" = "$VERSION" ] && [ "$exist_docker_status" = "running" ]; then
    echo "$CONTAINER_NAME is already running with version $VERSION"
    exit 0;
  else
    docker stop "$CONTAINER_NAME" >/dev/null 2>&1 || echo '$CONTAINER_NAME not start'
    docker rm "$CONTAINER_NAME" >/dev/null 2>&1 || echo '$CONTAINER_NAME not exists'
  fi
fi

docker run -d --restart always \
--name "$CONTAINER_NAME" \
-l com.docker-console.project=docker-console \
-l com.docker-console.version="$VERSION" \
-l com.docker-console.config-path="$CONFIG_PATH" \
-l com.docker-console.data-path="$DATA_PATH" \
-e HOST_CONFIG_PATH="$CONFIG_PATH" \
-e HOST_DATA_PATH="$DATA_PATH" \
-v /var/run/docker.sock:/var/run/docker.sock \
-v "$CONFIG_PATH":/etc/node-docker-console \
-v "$DATA_PATH":/docker-console \
-p "$NDC_PORT:7293" \
"$NDC_IMAGE"
