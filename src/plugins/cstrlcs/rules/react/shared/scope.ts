import type { Identifier } from "./nodes.ts";
import type { Context, Scope } from "@oxlint/plugins";

export function findVariable(scope: Scope, name: string) {
  let current: Scope | null = scope;

  while (current !== null && !current.set.has(name)) {
    current = current.upper;
  }

  return current?.set.get(name);
}

export function variableOf(context: Context, identifier: Identifier) {
  return findVariable(context.sourceCode.getScope(identifier), identifier.name);
}

export function definitionOf(context: Context, identifier: Identifier) {
  return variableOf(context, identifier)?.defs.at(-1);
}

export function declaratorOf(context: Context, identifier: Identifier) {
  const definition = definitionOf(context, identifier);

  return definition?.node.type === "VariableDeclarator" ? definition.node : undefined;
}
