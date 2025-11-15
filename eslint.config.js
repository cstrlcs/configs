import { defineConfig } from "eslint/config";

import { javascript, jsonc, react, sort, stylistic, typescript } from "./eslint/index.js";

export default defineConfig([
  javascript,
  jsonc,
  react,
  sort,
  stylistic,
  typescript,
]);
