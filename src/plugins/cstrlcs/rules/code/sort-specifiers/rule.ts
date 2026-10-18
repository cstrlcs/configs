import type { Context, ESTree, Range, Span } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { moduleExportName } from "../shared/ast.ts";

type MessageId = "exportSpecifier" | "importSpecifier" | "moduleSpecifier";

interface Member {
  readonly comment: string;
  readonly endsLine: boolean;
  readonly name: string;
  readonly node: Span;
  readonly range: Range;
  readonly separator: string;
  readonly text: string;
}

interface Replacement {
  readonly range: Range;
  readonly text: string;
}

interface SortableList {
  readonly members: readonly Member[];
  readonly messageId: MessageId;
}

const CHUNK = /\d+|\P{White_Space}/gv;
const DIGIT = /^\d/v;
const SCOPED_DIRECTIVE = /^\s*(?:eslint|oxlint)-(?:disable|enable)(?:\s|$)/v;

function compareDigitRuns(left: string, right: string) {
  if (left.startsWith("0") || right.startsWith("0") || left.length === right.length) {
    return left < right ? -1 : Number(left > right);
  }

  return left.length - right.length;
}

function compareChunks(left: string, right: string) {
  if (DIGIT.test(left) && DIGIT.test(right)) {
    return compareDigitRuns(left, right);
  }

  return (left.codePointAt(0) ?? 0) - (right.codePointAt(0) ?? 0);
}

function compareNames(left: string, right: string) {
  const leftChunks = left.toLowerCase().match(CHUNK) ?? [];
  const rightChunks = right.toLowerCase().match(CHUNK) ?? [];

  for (const [index, chunk] of leftChunks.entries()) {
    const other = rightChunks[index];

    if (other === undefined) {
      return 1;
    }

    const order = compareChunks(chunk, other);

    if (order !== 0) {
      return order;
    }
  }

  return leftChunks.length - rightChunks.length;
}

function leadingStart(context: Context, node: Span) {
  const { sourceCode } = context;
  const previousLine = sourceCode.getTokenBefore(node)?.loc.end.line ?? 0;
  let start: Span = node;

  for (const comment of sourceCode.getCommentsBefore(node).toReversed()) {
    if (
      comment.type === "Shebang" ||
      SCOPED_DIRECTIVE.test(comment.value) ||
      comment.loc.start.line <= previousLine ||
      comment.loc.end.line < start.loc.start.line - 1
    ) {
      break;
    }

    start = comment;
  }

  return start.range[0];
}

function separatorOf(context: Context, node: Span) {
  const comma = context.sourceCode.getTokenAfter(node);

  if (comma?.value !== "," || comma.loc.start.line !== node.loc.end.line) {
    return node;
  }

  return comma;
}

function lineEnding(context: Context, separator: Span) {
  const { sourceCode } = context;
  const { line } = separator.loc.end;
  const next = sourceCode.getTokenAfter(separator, { includeComments: true });

  if (next === null || next.loc.start.line > line) {
    return { endsLine: true };
  }

  if ((next.type !== "Line" && next.type !== "Block") || next.loc.end.line > line) {
    return { endsLine: false };
  }

  const following = sourceCode.getTokenAfter(next, { includeComments: true });

  if (following?.loc.start.line === line) {
    return { endsLine: false };
  }

  return { endsLine: true, trailing: next };
}

function toMember(context: Context, name: string, node: Span) {
  const { text } = context.sourceCode;
  const separator = separatorOf(context, node);
  const { endsLine, trailing } = lineEnding(context, separator);
  const start = leadingStart(context, node);
  const end = trailing?.range[1] ?? separator.range[1];

  return {
    comment: text.slice(separator.range[1], end),
    endsLine,
    name,
    node,
    range: [start, end] satisfies Range,
    separator: text.slice(node.range[1], separator.range[1]),
    text: text.slice(start, node.range[1]),
  };
}

function withSemicolon(moved: string, target: string) {
  if (!target.endsWith(";") || moved.endsWith(";")) {
    return moved;
  }

  return `${moved};`;
}

function sortedReplacements(members: readonly Member[]) {
  const sorted = members.toSorted((left, right) => compareNames(left.name, right.name));

  return members.map((target, position) => {
    const { comment, text } = sorted[position] ?? target;
    const lineBreak = comment !== "" && !target.endsLine ? "\n" : "";

    return {
      range: target.range,
      text: withSemicolon(text, target.text) + target.separator + comment + lineBreak,
    };
  });
}

function rewrite(source: string, [start, end]: Range, replacements: readonly Replacement[]) {
  let cursor = start;
  let result = "";

  for (const { range, text } of replacements) {
    result += source.slice(cursor, range[0]) + text;
    cursor = range[1];
  }

  return result + source.slice(cursor, end);
}

function reportUnsorted(
  context: Context,
  list: SortableList,
  replacements: readonly Replacement[],
) {
  const { members, messageId } = list;

  for (const [index, right] of members.entries()) {
    const left = members[index - 1];

    if (left !== undefined && compareNames(left.name, right.name) > 0) {
      context.report({
        data: { left: left.name, right: right.name },
        fix: (fixer) => replacements.map(({ range, text }) => fixer.replaceTextRange(range, text)),
        messageId,
        node: right.node,
      });
    }
  }
}

function checkSpecifiers(context: Context, list: SortableList) {
  reportUnsorted(context, list, sortedReplacements(list.members));
}

function exportSpecifierMembers(context: Context, node: ESTree.ExportNamedDeclaration) {
  return node.specifiers.map((specifier) =>
    toMember(context, moduleExportName(specifier.exported), specifier),
  );
}

function isReExport(
  statement: ESTree.Directive | ESTree.Statement,
): statement is ESTree.ExportAllDeclaration | ESTree.ExportNamedDeclaration {
  return (
    statement.type === "ExportAllDeclaration" ||
    (statement.type === "ExportNamedDeclaration" && statement.source !== null)
  );
}

function checkReExports(context: Context, body: readonly (ESTree.Directive | ESTree.Statement)[]) {
  const { text } = context.sourceCode;

  const statements = body
    .filter((statement) => isReExport(statement))
    .map((statement) => {
      const specifiers =
        statement.type === "ExportAllDeclaration" ? [] : exportSpecifierMembers(context, statement);

      const member = toMember(
        context,
        statement.source?.raw?.slice(1, -1).split("?")[0] ?? "",
        statement,
      );

      return {
        member: {
          ...member,
          text: rewrite(
            text,
            [member.range[0], statement.range[1]],
            sortedReplacements(specifiers),
          ),
        },
        specifiers,
      };
    });

  const members = statements.map(({ member }) => member);
  const replacements = sortedReplacements(members);

  reportUnsorted(context, { members, messageId: "moduleSpecifier" }, replacements);

  for (const { specifiers } of statements) {
    reportUnsorted(context, { members: specifiers, messageId: "exportSpecifier" }, replacements);
  }
}

export const sortSpecifiers = defineRule({
  meta: {
    docs: {
      description:
        "Require named imports, named exports and re-export statements in natural order.",
    },
    fixable: "code",
    messages: {
      exportSpecifier:
        'Named export "{{right}}" should come before "{{left}}". Sort named exports in natural order.',
      importSpecifier:
        'Named import "{{right}}" should come before "{{left}}". Sort named imports in natural order.',
      moduleSpecifier:
        'Re-export from "{{right}}" should come before "{{left}}". Sort re-exports by module path in natural order.',
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      ExportNamedDeclaration(node) {
        if (node.source === null) {
          checkSpecifiers(context, {
            members: exportSpecifierMembers(context, node),
            messageId: "exportSpecifier",
          });
        }
      },
      ImportDeclaration(node) {
        checkSpecifiers(context, {
          members: node.specifiers.flatMap((specifier) =>
            specifier.type === "ImportSpecifier"
              ? [toMember(context, specifier.local.name, specifier)]
              : [],
          ),
          messageId: "importSpecifier",
        });
      },
      Program(node) {
        checkReExports(context, node.body);
      },
      TSModuleBlock(node) {
        checkReExports(context, node.body);
      },
    };
  },
});
