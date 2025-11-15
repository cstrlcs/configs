import pluginTypescript from "@typescript-eslint/eslint-plugin";
import parserTypescript from "@typescript-eslint/parser";
import pluginAntfu from "eslint-plugin-antfu";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    name: "typescript",
    files: ["**/*.?([cm])ts", "**/*.?([cm])tsx"],
    languageOptions: {
      parser: parserTypescript,
      parserOptions: {
        sourceType: "module",
      },
    },
    plugins: {
      antfu: pluginAntfu,
      ts: pluginTypescript,
    },
    rules: {
      "no-dupe-class-members": "off",
      "no-redeclare": "off",
      "no-use-before-define": "off",
      "no-useless-constructor": "off",
      "ts/ban-ts-comment": ["error", { "ts-expect-error": "allow-with-description" }],
      "ts/consistent-type-definitions": ["error", "interface"],
      "ts/consistent-type-imports": ["error", {
        disallowTypeAnnotations: false,
        fixStyle: "separate-type-imports",
        prefer: "type-imports",
      }],
      "ts/method-signature-style": ["error", "property"],
      "ts/no-dupe-class-members": "error",
      "ts/no-dynamic-delete": "off",
      "ts/no-empty-object-type": ["error", { allowInterfaces: "always" }],
      "ts/no-explicit-any": "off",
      "ts/no-extraneous-class": "off",
      "ts/no-import-type-side-effects": "error",
      "ts/no-invalid-void-type": "off",
      "ts/no-non-null-assertion": "off",
      "ts/no-redeclare": ["error", { builtinGlobals: false }],
      "ts/no-require-imports": "error",
      "ts/no-unused-expressions": ["error", {
        allowShortCircuit: true,
        allowTaggedTemplates: true,
        allowTernary: true,
      }],
      "ts/no-unused-vars": "off",
      "ts/no-use-before-define": ["error", { classes: false, functions: false, variables: true }],
      "ts/no-useless-constructor": "off",
      "ts/no-wrapper-object-types": "error",
      "ts/triple-slash-reference": "off",
      "ts/unified-signatures": "off",
    },
  },
]);
