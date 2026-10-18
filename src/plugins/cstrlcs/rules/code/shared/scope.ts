import type { IdentifierNode } from "./ast.ts";
import type { Context, Scope } from "@oxlint/plugins";

export function variableOf(context: Context, identifier: IdentifierNode) {
  let scope: Scope | null = context.sourceCode.getScope(identifier);

  while (scope !== null && !scope.set.has(identifier.name)) {
    scope = scope.upper;
  }

  return scope?.set.get(identifier.name);
}
