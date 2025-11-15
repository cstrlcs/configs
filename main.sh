#!/bin/bash

set -e

if ! command -v jq >/dev/null 2>&1; then 
    echo "jq is not installed"
    exit 1
fi

cat <<EOF
🚨 This script will add the following dependencies to your project:
  - @cstrlcs/configs
  - eslint
  - typescript

It will also edit/overwrite the following files:
  - eslint.config.js
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

echo "Installing dependencies..."
bun add -D @cstrlcs/configs eslint typescript

echo "Updating package.json..."
jq '.scripts |= . + { "lint": "eslint .", "lint:fix": "eslint . --fix" }' package.json > package.json.temp && mv package.json.temp package.json

echo "Creating ESLint config..."
echo 'import { javascript, jsonc, react, sort, stylistic, typescript } from "@cstrlcs/configs/eslint/index.js";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    ignores: ["**/node_modules/**", "**/dist/**", "**/build/**"],
  },
  sort,
  jsonc,
  javascript,
  typescript,
  react,
  stylistic,
]);' > eslint.config.js

echo "Creating tsconfig..."
echo '{ "extends": "@cstrlcs/configs/tsconfigs/base.json", "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } }, "include": ["src"] }' > tsconfig.json

echo "Creating .gitattributes..."
echo -e "* text=auto\n*.* text eol=lf" > .gitattributes

echo "Running linters and formatter..."
bunx eslint . --fix