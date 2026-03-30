#!/bin/bash

set -e

if ! command -v jq >/dev/null 2>&1; then
    echo "jq is not installed"
    exit 1
fi

REQUIRED_DEPS=("@cstrlcs/configs" "oxlint" "oxlint-tsgolint" "oxfmt")
EXPECTED_LINT_SCRIPT="oxlint ."
EXPECTED_LINT_FIX_SCRIPT="oxlint --fix && oxfmt"
EXPECTED_TSCONFIG_EXTENDS="@cstrlcs/configs/tsconfig/base.json"
EXPECTED_GITATTRIBUTES="* text=auto
*.* text eol=lf"
CONFIGS_VSCODE="node_modules/@cstrlcs/configs/.vscode"

create_config() {
    local tool="$1"
    echo "Creating ${tool} config..."
    cat > "${tool}.config.ts" <<TSEOF
import { defineConfig } from "${tool}";

import config from "@cstrlcs/configs/${tool}/base.ts";

export default defineConfig(config);
TSEOF
}

doctor() {
    local ok=true

    if [ -f .gitattributes ] && [ "$(cat .gitattributes)" = "$EXPECTED_GITATTRIBUTES" ]; then
        echo "✅ .gitattributes"
    else
        echo "❌ .gitattributes"
        ok=false
    fi

    local tsconfig_extends
    tsconfig_extends=$(jq -r '.extends // empty' tsconfig.json 2>/dev/null)
    
    if [ "$tsconfig_extends" = "$EXPECTED_TSCONFIG_EXTENDS" ]; then
        echo "✅ tsconfig.json"
    else
        echo "❌ tsconfig.json (expected extends: \"$EXPECTED_TSCONFIG_EXTENDS\", got: \"$tsconfig_extends\")"
        ok=false
    fi

    local lint_script lint_fix_script
    lint_script=$(jq -r '.scripts.lint // empty' package.json 2>/dev/null)
    lint_fix_script=$(jq -r '.scripts["lint:fix"] // empty' package.json 2>/dev/null)

    if [ "$lint_script" = "$EXPECTED_LINT_SCRIPT" ]; then
        echo "✅ package.json scripts.lint"
    else
        echo "❌ package.json scripts.lint (expected: \"$EXPECTED_LINT_SCRIPT\", got: \"$lint_script\")"
        ok=false
    fi

    if [ "$lint_fix_script" = "$EXPECTED_LINT_FIX_SCRIPT" ]; then
        echo "✅ package.json scripts.lint:fix"
    else
        echo "❌ package.json scripts.lint:fix (expected: \"$EXPECTED_LINT_FIX_SCRIPT\", got: \"$lint_fix_script\")"
        ok=false
    fi

    if diff -q "$CONFIGS_VSCODE/settings.json" .vscode/settings.json >/dev/null 2>&1; then
        echo "✅ .vscode/settings.json"
    else
        echo "❌ .vscode/settings.json"
        ok=false
    fi

    if diff -q "$CONFIGS_VSCODE/extensions.json" .vscode/extensions.json >/dev/null 2>&1; then
        echo "✅ .vscode/extensions.json"
    else
        echo "❌ .vscode/extensions.json"
        ok=false
    fi

    for dep in "${REQUIRED_DEPS[@]}"; do
        if jq -e --arg dep "$dep" '(.dependencies // {}) + (.devDependencies // {}) | has($dep)' package.json >/dev/null 2>&1; then
            echo "✅ $dep"
        else
            echo "❌ $dep not found in package.json"
            ok=false
        fi
    done

    echo ""

    if $ok; then
        echo "✅ Everything looks good!"
    else
        echo "❌ Some checks failed. Run 'bunx @cstrlcs/configs install' to fix."
        exit 1
    fi
}

install() {
    cat <<EOF
🚨 This script will add the following dependencies to your project:
  - @cstrlcs/configs
  - oxlint
  - oxlint-tsgolint
  - oxfmt

It will also edit/overwrite the following files:
  - oxlint.config.ts
  - oxfmt.config.ts
  - tsconfig.json
  - package.json
  - .gitattributes
  - .vscode/settings.json
  - .vscode/extensions.json

Make sure you have a backup of those files before proceeding.
EOF

    read -rp "Are you sure you want to continue? (y/N) " -n 1 -r REPLY
    echo

    if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
        echo "❌ Aborting..."
        exit 0
    fi

    bun add -D @cstrlcs/configs oxlint oxlint-tsgolint oxfmt

    jq '.scripts |= . + { "lint": "oxlint .", "lint:fix": "oxlint --fix && oxfmt" }' package.json > package.json.temp && mv package.json.temp package.json

    create_config oxlint
    create_config oxfmt

    echo '{ "extends": "@cstrlcs/configs/tsconfig/base.json", "compilerOptions": { "baseUrl": ".", "paths": { "@/*": ["./src/*"] } }, "include": ["src"] }' > tsconfig.json

    printf '* text=auto\n*.* text eol=lf\n' > .gitattributes

    mkdir -p .vscode
    cp "$CONFIGS_VSCODE/settings.json" .vscode/settings.json
    cp "$CONFIGS_VSCODE/extensions.json" .vscode/extensions.json

    bunx oxfmt && bunx oxlint --fix
}

case "$1" in
    install)
        install
        ;;
    doctor)
        doctor
        ;;
    *)
        echo "Usage: bunx @cstrlcs/configs <install|doctor>"
        exit 1
        ;;
esac
