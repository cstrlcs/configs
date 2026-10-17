import type { Casing } from "../shared/casing.ts";
import type { Context, ESTree, Visitor } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import {
  hasBooleanPrefix,
  hasInterfacePrefix,
  isProducerName,
  matchesCasing,
} from "../shared/casing.ts";
import { isModuleConstant, isStaticValue } from "../shared/constants.ts";
import {
  isBooleanExpression,
  isComponentFactory,
  isNonBooleanExpression,
  returnedExpressions,
  returnsJsx,
} from "../shared/expressions.ts";

type FunctionNode = ESTree.ArrowFunctionExpression | ESTree.Function;

function isAmbient(node: ESTree.Node) {
  for (let current: ESTree.Node | null = node; current !== null; current = current.parent) {
    if (("global" in current && current.global) || ("declare" in current && current.declare)) {
      return true;
    }
  }

  return false;
}

function isFunctionExpression(node: ESTree.Expression): node is FunctionNode {
  return node.type === "ArrowFunctionExpression" || node.type === "FunctionExpression";
}

function casingMessage(name: string, casing: Casing) {
  return casing === "camelCase" && matchesCasing(name, "constantCase")
    ? "computedConstant"
    : casing;
}

function checkCasing(context: Context, identifier: ESTree.BindingIdentifier, casing: Casing) {
  const { name } = identifier;

  if (!matchesCasing(name, casing)) {
    context.report({ data: { name }, messageId: casingMessage(name, casing), node: identifier });
  }
}

function checkReturns(context: Context, identifier: ESTree.BindingIdentifier, node: FunctionNode) {
  const returned = returnedExpressions(context.sourceCode.visitorKeys, node);
  const { name } = identifier;

  if (returned.length === 0) {
    return;
  }

  if (
    hasBooleanPrefix(name) &&
    returned.every((value) => value !== null && isNonBooleanExpression(value))
  ) {
    context.report({ data: { name }, messageId: "predicateReturn", node: identifier });
  }

  if (
    isProducerName(name) &&
    returned.every((value) => value !== null && isBooleanExpression(value))
  ) {
    context.report({ data: { name }, messageId: "booleanReturn", node: identifier });
  }
}

function checkFunctionName(
  context: Context,
  identifier: ESTree.BindingIdentifier,
  node: FunctionNode,
) {
  const isComponent =
    matchesCasing(identifier.name, "pascalCase") &&
    returnsJsx(context.sourceCode.visitorKeys, node);

  checkCasing(context, identifier, isComponent ? "pascalCase" : "camelCase");
  checkReturns(context, identifier, node);
}

function checkParams(context: Context, { params }: FunctionNode) {
  for (const parameter of params) {
    const target =
      parameter.type === "AssignmentPattern"
        ? parameter.left
        : parameter.type === "RestElement"
          ? parameter.argument
          : parameter;

    if (target.type === "Identifier") {
      checkCasing(context, target, "camelCase");
    }
  }
}

function variableCasing(node: ESTree.VariableDeclarator, init: ESTree.Expression) {
  if (isModuleConstant(node) && isStaticValue(init)) {
    return "constantCase";
  }

  return isComponentFactory(init) ? "pascalCase" : "camelCase";
}

function checkVariable(context: Context, node: ESTree.VariableDeclarator) {
  const { id, init } = node;

  if (id.type !== "Identifier") {
    return;
  }

  if (init === null) {
    checkCasing(context, id, "camelCase");

    return;
  }

  if (isFunctionExpression(init)) {
    checkFunctionName(context, id, init);

    return;
  }

  checkCasing(context, id, variableCasing(node, init));

  if (isBooleanExpression(init) && !hasBooleanPrefix(id.name)) {
    context.report({ data: { name: id.name }, messageId: "booleanPrefix", node: id });
  }
}

function checkType(context: Context, node: ESTree.Node, identifier: ESTree.BindingIdentifier) {
  if (!isAmbient(node)) {
    checkCasing(context, identifier, "pascalCase");
  }
}

function checkInterface(context: Context, node: ESTree.TSInterfaceDeclaration) {
  checkType(context, node, node.id);

  if (hasInterfacePrefix(node.id.name) && !isAmbient(node)) {
    context.report({ data: { name: node.id.name }, messageId: "interfacePrefix", node: node.id });
  }
}

function typeVisitors(context: Context) {
  return {
    ClassDeclaration(node) {
      if (node.id !== null) {
        checkType(context, node, node.id);
      }
    },
    ClassExpression(node) {
      if (node.id !== null) {
        checkType(context, node, node.id);
      }
    },
    TSEnumDeclaration(node) {
      checkType(context, node, node.id);
    },
    TSEnumMember(node) {
      if (node.id.type === "Identifier") {
        checkType(context, node, node.id);
      }
    },
    TSInterfaceDeclaration(node) {
      checkInterface(context, node);
    },
    TSModuleDeclaration(node) {
      if (node.kind === "namespace" && node.id.type === "Identifier") {
        checkType(context, node, node.id);
      }
    },
    TSTypeAliasDeclaration(node) {
      checkType(context, node, node.id);
    },
    TSTypeParameter(node) {
      checkType(context, node, node.name);
    },
  } satisfies Visitor;
}

function valueVisitors(context: Context) {
  return {
    ArrowFunctionExpression(node) {
      checkParams(context, node);
    },
    CatchClause(node) {
      if (node.param?.type === "Identifier") {
        checkCasing(context, node.param, "camelCase");
      }
    },
    FunctionDeclaration(node) {
      if (node.id !== null && !isAmbient(node)) {
        checkFunctionName(context, node.id, node);
      }

      checkParams(context, node);
    },
    FunctionExpression(node) {
      if (node.id !== null) {
        checkFunctionName(context, node.id, node);
      }

      checkParams(context, node);
    },
    VariableDeclarator(node) {
      if (!isAmbient(node)) {
        checkVariable(context, node);
      }
    },
  } satisfies Visitor;
}

export const naming = defineRule({
  meta: {
    docs: {
      description:
        "Enforce one naming convention: casing by declaration kind, acronyms as words, no interface prefix and predicate names for booleans.",
    },
    messages: {
      booleanPrefix: '"{{name}}" holds a boolean. Start it with is, has, can, should, did or will.',
      booleanReturn:
        '"{{name}}" returns a boolean. Name it as a question that starts with is, has, can, should, did or will.',
      camelCase:
        '"{{name}}" should be camelCase. Write acronyms as words, such as customerId or loadHttpUrl.',
      computedConstant:
        '"{{name}}" is not a literal value, so it is not a constant. Write it in camelCase; CONSTANT_CASE is for module-level literals.',
      constantCase:
        '"{{name}}" is a module-level constant with a fixed value. Write it in CONSTANT_CASE.',
      interfacePrefix:
        'Interface "{{name}}" should not start with I. Name it after what it describes.',
      pascalCase: '"{{name}}" should be PascalCase. Write acronyms as words, such as HttpClient.',
      predicateReturn:
        '"{{name}}" reads as a boolean check but returns something else. Rename it, or return a boolean.',
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      before() {
        return !context.filename.endsWith(".d.ts");
      },
      ...typeVisitors(context),
      ...valueVisitors(context),
    };
  },
});
