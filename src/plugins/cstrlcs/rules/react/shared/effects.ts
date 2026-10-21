import type { Context, ESTree } from "@oxlint/plugins";

import { unwrap } from "./nodes.ts";
import { reactExportName } from "./origin.ts";

const EFFECT_HOOKS = new Set(["useEffect", "useInsertionEffect", "useLayoutEffect"]);

export function effectSetupOf(
  context: Context,
  { arguments: [setup], callee }: ESTree.CallExpression,
) {
  if (setup === undefined || !EFFECT_HOOKS.has(reactExportName(context, callee) ?? "")) {
    return;
  }

  return unwrap(setup);
}
