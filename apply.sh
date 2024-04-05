#!/bin/bash

if ! which jq >/dev/null; then 
    echo "jq is not installed"
    exit 1
fi

echo "🚨 This script will add the following dependencies to your Bun project:" 
echo "  - @cstrlcs/configs"
echo "  - @biomejs/biome"
echo "  - typescript"
echo

echo "It will also edit/overwrite the following files:"
echo "  - biome.json"
echo "  - tsconfig.json"
echo "  - package.json"
echo "  - .gitattributes"

echo
echo  "Make sure you have a backup of these files before proceeding."
echo
read -p "Are you sure you want to continue? (y/n) " -n 1 -r
echo

if [[ $REPLY =~ ^[Yy]$ ]]; then
    bun add -D @cstrlcs/configs @biomejs/biome typescript
    jq '.scripts |= . + { "lint": "biome check .", "lint:fix": "biome check . --apply-unsafe" }' package.json > package.json.temp && mv package.json.temp package.json
    
    echo "{ \"extends\": [\"@cstrlcs/configs/biome\"] }" > biome.json
    echo "{ \"extends\": \"@cstrlcs/configs/tsconfig\", \"compilerOptions\": { \"baseUrl\": \".\", \"paths\": { \"@/*\": [\"./src/*\"] } }, \"include\": [\"src\"] }" > tsconfig.json
    echo -e "* text=auto\n*.* text eol=lf" > .gitattributes
    
    bunx biome check package.json biome.json tsconfig.json --apply-unsafe
else
    echo "Aborting..."
fi
