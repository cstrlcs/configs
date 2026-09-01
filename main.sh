#!/bin/bash

set -e

if ! command -v jq >/dev/null 2>&1; then
    echo "jq is not installed"
    exit 1
fi

MINIMUM_BUN_MAJOR=1
MINIMUM_BUN_MINOR=4
BUN_TEST_GLOBALS_FILE="bun.d.ts"
BUN_TYPES_REFERENCE='/// <reference types="bun" />'
BUN_TEST_GLOBALS_REFERENCE='/// <reference types="bun-types/test-globals" />'
REQUIRED_DEPS=("@cstrlcs/configs" "@types/bun" "oxlint" "oxlint-tsgolint" "oxfmt")
EXPECTED_LINT_SCRIPT="oxlint --type-aware ."
EXPECTED_LINT_FIX_SCRIPT="oxlint --type-aware --fix && oxfmt"
EXPECTED_GITATTRIBUTES="* text=auto
*.* text eol=lf"
CONFIGS_VSCODE="node_modules/@cstrlcs/configs/.vscode"

bun_version_supported() {
    local version major remainder minor
    version=$(bun --version 2>/dev/null) || return 1
    major=${version%%.*}
    remainder=${version#*.}
    minor=${remainder%%.*}

    case "$major" in
        '' | *[!0-9]*) return 1 ;;
    esac

    case "$minor" in
        '' | *[!0-9]*) return 1 ;;
    esac

    if [ "$major" -gt "$MINIMUM_BUN_MAJOR" ]; then
        return 0
    fi

    [ "$major" -eq "$MINIMUM_BUN_MAJOR" ] && [ "$minor" -ge "$MINIMUM_BUN_MINOR" ]
}

bun_test_globals_file_valid() {
    [ -f "$BUN_TEST_GLOBALS_FILE" ] &&
        grep -Fqx "$BUN_TYPES_REFERENCE" "$BUN_TEST_GLOBALS_FILE" &&
        grep -Fqx "$BUN_TEST_GLOBALS_REFERENCE" "$BUN_TEST_GLOBALS_FILE"
}

tsconfig_includes_bun_test_globals() {
    jq -e --arg file "$BUN_TEST_GLOBALS_FILE" '(.include // []) | index($file) != null' tsconfig.json >/dev/null 2>&1
}

is_vite_project() {
    jq -e '(.dependencies // {}) + (.devDependencies // {}) | has("vite")' package.json >/dev/null 2>&1
}

tsconfig_extends_target() {
    if is_vite_project; then
        echo "@cstrlcs/configs/tsconfig/vite.json"
    else
        echo "@cstrlcs/configs/tsconfig/base.json"
    fi
}

create_config() {
    local tool="$1"
    echo "Creating ${tool} config..."
    cat > "${tool}.config.ts" <<TSEOF
import { defineConfig } from "${tool}";

import config from "@cstrlcs/configs/${tool}/base.js";

export default defineConfig(config);
TSEOF
}

doctor() {
    local ok=true
    local bun_version
    bun_version=$(bun --version 2>/dev/null || true)

    if bun_version_supported; then
        echo "✅ Bun $bun_version"
    else
        echo "❌ Bun >= ${MINIMUM_BUN_MAJOR}.${MINIMUM_BUN_MINOR}.0 required (found: ${bun_version:-not installed})"
        ok=false
    fi

    if [ -f .gitattributes ] && [ "$(cat .gitattributes)" = "$EXPECTED_GITATTRIBUTES" ]; then
        echo "✅ .gitattributes"
    else
        echo "❌ .gitattributes"
        ok=false
    fi

    local expected_tsconfig_extends
    expected_tsconfig_extends=$(tsconfig_extends_target)

    local tsconfig_extends
    tsconfig_extends=$(jq -r '.extends // empty' tsconfig.json 2>/dev/null)

    if [ "$tsconfig_extends" = "$expected_tsconfig_extends" ]; then
        echo "✅ tsconfig.json"
    else
        echo "❌ tsconfig.json (expected extends: \"$expected_tsconfig_extends\", got: \"$tsconfig_extends\")"
        ok=false
    fi

    if bun_test_globals_file_valid && tsconfig_includes_bun_test_globals; then
        echo "✅ Bun test globals"
    else
        echo "❌ Bun test globals (expected $BUN_TEST_GLOBALS_FILE with Bun references and tsconfig inclusion)"
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
  - @types/bun
  - oxlint
  - oxlint-tsgolint
  - oxfmt

It will also edit/overwrite the following files:
  - oxlint.config.ts
  - oxfmt.config.ts
  - tsconfig.json
  - bun.d.ts
  - package.json
  - .gitattributes
  - .vscode/settings.json
  - .vscode/extensions.json

Make sure you have a backup of those files before proceeding.
EOF

    local bun_version
    bun_version=$(bun --version 2>/dev/null || true)

    if ! bun_version_supported; then
        echo "❌ Bun >= ${MINIMUM_BUN_MAJOR}.${MINIMUM_BUN_MINOR}.0 is required (found: ${bun_version:-not installed})"
        exit 1
    fi

    read -rp "Are you sure you want to continue? (y/N) " -n 1 -r REPLY
    echo

    if [[ ! "$REPLY" =~ ^[Yy]$ ]]; then
        echo "❌ Aborting..."
        exit 0
    fi

    bun add -D @cstrlcs/configs @types/bun oxlint oxlint-tsgolint oxfmt

    jq '.scripts |= . + { "lint": "oxlint --type-aware .", "lint:fix": "oxlint --type-aware --fix && oxfmt" }' package.json > package.json.temp && mv package.json.temp package.json

    create_config oxlint
    create_config oxfmt

    if is_vite_project; then
        echo '{ "extends": "@cstrlcs/configs/tsconfig/vite.json", "compilerOptions": { "paths": { "@/*": ["./src/*"] } }, "include": ["src", "bun.d.ts"], "exclude": ["dist", "node_modules"] }' > tsconfig.json
    else
        echo '{ "extends": "@cstrlcs/configs/tsconfig/base.json", "compilerOptions": { "paths": { "@/*": ["./src/*"] } }, "include": ["src", "bun.d.ts"] }' > tsconfig.json
    fi

    printf '%s\n%s\n\nexport {};\n' "$BUN_TYPES_REFERENCE" "$BUN_TEST_GLOBALS_REFERENCE" > "$BUN_TEST_GLOBALS_FILE"

    printf '* text=auto\n*.* text eol=lf\n' > .gitattributes

    mkdir -p .vscode
    cp "$CONFIGS_VSCODE/settings.json" .vscode/settings.json
    cp "$CONFIGS_VSCODE/extensions.json" .vscode/extensions.json

    bunx oxfmt && bunx oxlint --type-aware --fix
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
