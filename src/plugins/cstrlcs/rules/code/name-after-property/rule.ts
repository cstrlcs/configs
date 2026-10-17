import type { Context, ESTree, Scope, Variable } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { hasBooleanPrefix, isProducerName, matchesCasing } from "../shared/casing.ts";
import { isModuleConstant, isStaticValue } from "../shared/constants.ts";
import { isBooleanExpression, isComponentFactory } from "../shared/expressions.ts";

type Reference = Variable["references"][number];

function filledKey({ identifier }: Reference) {
  const { parent } = identifier;

  return parent.type === "Property" && parent.key.type === "Identifier"
    ? parent.key.name
    : undefined;
}

function sharedKey(uses: Reference[]) {
  const keys = new Set(uses.map((use) => filledKey(use)));
  const [key] = keys;

  return keys.size === 1 ? key : undefined;
}

function scopesWithin(root: Scope) {
  const scopes = [root];

  for (const scope of scopes) {
    scopes.push(...scope.childScopes);
  }

  return scopes;
}

function isNameTaken({ scope }: Variable, name: string) {
  for (let current: Scope | null = scope; current !== null; current = current.upper) {
    if (current.set.has(name)) {
      return true;
    }
  }

  return scopesWithin(scope).some(
    (inner) =>
      inner.set.has(name) ||
      inner.references.some((reference) => reference.identifier.name === name),
  );
}

function usesOf(variable: Variable) {
  return variable.references.filter((reference) => !reference.init);
}

function hasCompetitor(variable: Variable, key: string) {
  return variable.scope.variables.some(
    (other) => other !== variable && sharedKey(usesOf(other)) === key,
  );
}

function keepsNaming(init: ESTree.Expression | null, key: string) {
  if (init === null) {
    return true;
  }

  if (isComponentFactory(init)) {
    return false;
  }

  if (init.type === "ArrowFunctionExpression" || init.type === "FunctionExpression") {
    return !hasBooleanPrefix(key) && !isProducerName(key);
  }

  return !isBooleanExpression(init) || hasBooleanPrefix(key);
}

function isFreeName(variable: Variable, key: string) {
  return (
    matchesCasing(key, "camelCase") && !isNameTaken(variable, key) && !hasCompetitor(variable, key)
  );
}

function isRenamable(node: ESTree.VariableDeclarator) {
  const { init, parent } = node;

  if (parent.type !== "VariableDeclaration" || parent.declare) {
    return false;
  }

  const isExported = parent.parent.type === "ExportNamedDeclaration";
  const isConstant = isModuleConstant(node) && init !== null && isStaticValue(init);

  return !isExported && !isConstant;
}

function checkDeclarator(context: Context, node: ESTree.VariableDeclarator) {
  const { id } = node;
  const [variable] = context.sourceCode.getDeclaredVariables(node);
  const uses = variable === undefined ? [] : usesOf(variable);
  const key = sharedKey(uses);

  if (id.type !== "Identifier" || variable === undefined || key === undefined) {
    return;
  }

  if (!isFreeName(variable, key) || !keepsNaming(node.init, key)) {
    return;
  }

  context.report({
    data: { key, name: id.name },
    fix: (fixer) => [
      fixer.replaceTextRange([id.range[0], id.range[0] + id.name.length], key),
      ...uses.map((use) => fixer.replaceText(use.identifier.parent, key)),
    ],
    messageId: "rename",
    node: id,
  });
}

export const nameAfterProperty = defineRule({
  meta: {
    docs: {
      description:
        "Name a variable after the object property it fills, so every use becomes shorthand.",
    },
    fixable: "code",
    messages: {
      rename:
        '"{{name}}" only fills the "{{key}}" property. Rename it to "{{key}}" and use the shorthand.',
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      VariableDeclarator(node) {
        if (isRenamable(node)) {
          checkDeclarator(context, node);
        }
      },
    };
  },
});
