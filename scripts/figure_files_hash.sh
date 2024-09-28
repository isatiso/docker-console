#!/usr/bin/env bash

set -e

TARGET_PATH=${1:-.}

if ! [ -f "$TARGET_PATH/package.json" ]; then
  exit 0
fi

find "$TARGET_PATH" -type f \
! -path '*/.*' \
! -path "$TARGET_PATH/lib/*" \
! -path "$TARGET_PATH/node_modules/*" \
! -path "$TARGET_PATH/.angular/*" \
-exec md5sum {} + | awk '{print $1}' | sort | md5sum | awk '{print $1}'
