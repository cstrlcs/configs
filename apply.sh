#!/bin/bash

set -e

if ! command -v jq >/dev/null 2>&1; then 
    echo "jq is not installed"
    exit 1
fi

cat <<EOF
🚨 This script will add the following dependencies to your Bun project:
  - @cstrlcs/configs
  - @biomejs/biome
  - typescript

It will also edit/overwrite the following files:
  - biome.json
  - tsconfig.json
  - package.json
  - .gitattributes

Make sure you have a backup of those files before proceeding.
EOF

read -rp "Are you sure you want to continue? (y/N) " -n 1 -r REPLY
echo

if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
    echo "❌ Aborting..."
    exit 0
fi

bun add -D @cstrlcs/configs @biomejs/biome typescript
jq '.scripts |= . + { "lint": "biome check .", "lint:fix": "biome check . --apply-unsafe" }' package.json > package.json.temp && mv package.json.temp package.json

echo '{ "extends": ["@cstrlcs/configs/biome"] }' > biome.json
echo '{ "extends": "@cstrlcs/configs/tsconfig", "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } }, "include": ["src"] }' > tsconfig.json
echo -e "* text=auto\n*.* text eol=lf" > .gitattributes

bunx biome check package.json biome.json tsconfig.json --write --unsafe