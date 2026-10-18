import type { Context, Definition, ESTree, Scope, Variable } from "@oxlint/plugins";

import { unwrap } from "./nodes.ts";
import { definitionOf, findVariable } from "./scope.ts";

interface Pending {
  members: string[];
  scope: Scope;
  value: ESTree.Node;
}

type Step = Pending | string | undefined;

export const MAX_ALIAS_DEPTH = 8;

const GLOBAL_MODULES = new Map([
  ["React", "react"],
  ["ReactDOM", "react-dom"],
  ["react", "react"],
]);

function packageOf(source: string) {
  if (source === "react" || source === "react-dom") {
    return source;
  }

  return source.startsWith("react-dom/") ? "react-dom" : undefined;
}

function qualify(module: string | undefined, [member, ...deeper]: string[]) {
  if (module === undefined || member === undefined) {
    return module;
  }

  return module.includes(".") || deeper.length > 0 ? undefined : `${module}.${member}`;
}

function importedFrom({ node, parent }: Definition) {
  const module = parent?.type === "ImportDeclaration" ? packageOf(parent.source.value) : undefined;

  if (module === undefined || node.type !== "ImportSpecifier") {
    return module;
  }

  const { imported } = node;
  const name = imported.type === "Identifier" ? imported.name : imported.value;

  return name === "default" ? module : `${module}.${name}`;
}

function requiredFrom({ arguments: [source], callee }: ESTree.CallExpression) {
  if (callee.type !== "Identifier" || callee.name !== "require") {
    return;
  }

  return source?.type === "Literal" && typeof source.value === "string"
    ? packageOf(source.value)
    : undefined;
}

function patternKey(pattern: ESTree.BindingPattern, name: string) {
  const property =
    pattern.type === "ObjectPattern"
      ? pattern.properties.find(
          (entry) =>
            entry.type === "Property" &&
            entry.value.type === "Identifier" &&
            entry.value.name === name,
        )
      : undefined;

  return property?.type === "Property" && !property.computed && property.key.type === "Identifier"
    ? property.key.name
    : undefined;
}

function declaredValue({ defs, name, scope }: Variable, members: string[]) {
  const declarator = defs.at(-1)?.node;

  if (declarator?.type !== "VariableDeclarator" || declarator.init === null) {
    return;
  }

  const { id, init } = declarator;

  if (id.type === "Identifier") {
    return { members, scope, value: init };
  }

  const key = patternKey(id, name);

  return key === undefined ? undefined : { members: [key, ...members], scope, value: init };
}

function identifierOrigin(scope: Scope, name: string, members: string[]) {
  const variable = findVariable(scope, name);
  const definition = variable?.defs.at(-1);

  if (variable === undefined || definition === undefined) {
    return qualify(GLOBAL_MODULES.get(name), members);
  }

  return definition.type === "ImportBinding"
    ? qualify(importedFrom(definition), members)
    : declaredValue(variable, members);
}

function advance({ members, scope, value }: Pending) {
  const expression = unwrap(value);

  if (expression.type === "Identifier") {
    return identifierOrigin(scope, expression.name, members);
  }

  if (expression.type === "CallExpression") {
    return qualify(requiredFrom(expression), members);
  }

  if (
    expression.type !== "MemberExpression" ||
    expression.computed ||
    expression.property.type !== "Identifier"
  ) {
    return;
  }

  return { members: [expression.property.name, ...members], scope, value: expression.object };
}

function settle(start: Step) {
  let current = start;

  for (let depth = 0; typeof current === "object"; depth += 1) {
    current = depth < MAX_ALIAS_DEPTH ? advance(current) : undefined;
  }

  return current;
}

export function originOfName(scope: Scope, name: string) {
  return settle(identifierOrigin(scope, name, []));
}

export function originOf(context: Context, expression: ESTree.Node) {
  return settle({ members: [], scope: context.sourceCode.getScope(expression), value: expression });
}

export function reactExportName(context: Context, callee: ESTree.Node) {
  const target = unwrap(callee);

  if (
    target.type === "Identifier" &&
    !GLOBAL_MODULES.has(target.name) &&
    definitionOf(context, target) === undefined
  ) {
    return target.name;
  }

  const origin = originOf(context, target);

  return origin?.startsWith("react.") ? origin.slice("react.".length) : undefined;
}
