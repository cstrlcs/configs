import type { Context, ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

type Statement = ESTree.Directive | ESTree.Statement | ESTree.ModuleDeclaration;

function groupOf(statement: Statement) {
  if (statement.type === "ExpressionStatement" && "directive" in statement) {
    return "Directive";
  }

  return statement.type;
}

const STATEMENTS_WITH_BODY = new Set([
  "BlockStatement",
  "ClassDeclaration",
  "DoWhileStatement",
  "ForInStatement",
  "ForOfStatement",
  "ForStatement",
  "FunctionDeclaration",
  "IfStatement",
  "LabeledStatement",
  "SwitchStatement",
  "TSEnumDeclaration",
  "TSInterfaceDeclaration",
  "TSModuleDeclaration",
  "TryStatement",
  "WhileStatement",
  "WithStatement",
]);

function hasBody(statement: Statement) {
  if (
    (statement.type === "ExportNamedDeclaration" ||
      statement.type === "ExportDefaultDeclaration") &&
    statement.declaration !== null
  ) {
    return STATEMENTS_WITH_BODY.has(statement.declaration.type);
  }

  return STATEMENTS_WITH_BODY.has(statement.type);
}

function isSingleLine(statement: Statement) {
  return statement.loc.start.line === statement.loc.end.line;
}

function canBeGrouped(previous: Statement, next: Statement) {
  if (groupOf(previous) !== groupOf(next) || hasBody(previous) || hasBody(next)) {
    return false;
  }

  return next.type === "ImportDeclaration" || (isSingleLine(previous) && isSingleLine(next));
}

function reportMissing(context: Context, previous: Statement, next: Statement) {
  if (previous.loc.end.line === next.loc.start.line) {
    context.report({ messageId: "missing", node: next });

    return;
  }

  const startOfFollowingLine = context.sourceCode.lineStartIndices[previous.loc.end.line] ?? 0;

  context.report({
    fix: (fixer) => fixer.insertTextBeforeRange([startOfFollowingLine, startOfFollowingLine], "\n"),
    messageId: "missing",
    node: next,
  });
}

function reportUnexpected(context: Context, previous: Statement, next: Statement) {
  const { lineStartIndices } = context.sourceCode;
  const startOfFollowingLine = lineStartIndices[previous.loc.end.line] ?? 0;
  const startOfNextLine = lineStartIndices[next.loc.start.line - 1] ?? startOfFollowingLine;

  context.report({
    fix: (fixer) => fixer.removeRange([startOfFollowingLine, startOfNextLine]),
    messageId: "unexpected",
    node: next,
  });
}

function checkPair(context: Context, previous: Statement, next: Statement) {
  const linesBetween = context.sourceCode.lines.slice(
    previous.loc.end.line,
    next.loc.start.line - 1,
  );

  const blankLines = linesBetween.filter((line) => line.trim() === "").length;

  if (!canBeGrouped(previous, next)) {
    if (blankLines === 0) {
      reportMissing(context, previous, next);
    }
  } else if (
    next.type !== "ImportDeclaration" &&
    blankLines > 0 &&
    blankLines === linesBetween.length
  ) {
    reportUnexpected(context, previous, next);
  }
}

function check(context: Context, statements: readonly Statement[]) {
  for (const [index, next] of statements.entries()) {
    const previous = statements[index - 1];

    if (previous !== undefined) {
      checkPair(context, previous, next);
    }
  }
}

export const paddingBetweenStatements = defineRule({
  meta: {
    docs: {
      description:
        "Require a blank line between statements, and forbid one between single-line statements of the same kind.",
    },
    fixable: "whitespace",
    messages: {
      missing: "Expected a blank line before this statement.",
      unexpected: "Unexpected blank line before this statement.",
    },
    schema: [],
    type: "layout",
  },
  createOnce(context) {
    return {
      BlockStatement(node) {
        check(context, node.body);
      },
      Program(node) {
        check(context, node.body);
      },
      StaticBlock(node) {
        check(context, node.body);
      },
      SwitchCase(node) {
        check(context, node.consequent);
      },
      TSModuleBlock(node) {
        check(context, node.body);
      },
    };
  },
});
