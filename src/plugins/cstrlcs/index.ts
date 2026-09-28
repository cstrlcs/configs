import { definePlugin } from "@oxlint/plugins";

import { forbiddenDependencies } from "./forbidden-dependencies/rule.ts";
import { noComments } from "./no-comments/rule.ts";
import { noExplicitReturnType } from "./no-explicit-return-type/rule.ts";

export default definePlugin({
  meta: { name: "cstrlcs" },
  rules: {
    "forbidden-dependencies": forbiddenDependencies,
    "no-comments": noComments,
    "no-explicit-return-type": noExplicitReturnType,
  },
});
