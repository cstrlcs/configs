import type { ESTree } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

type Aliases = Map<string, ESTree.TSTypeAliasDeclaration>;

const TERMINAL_KINDS = new Map([
  ["TSBigIntKeyword", "primitive"],
  ["TSBooleanKeyword", "primitive"],
  ["TSNullKeyword", "primitive"],
  ["TSNumberKeyword", "primitive"],
  ["TSStringKeyword", "primitive"],
  ["TSSymbolKeyword", "primitive"],
  ["TSUndefinedKeyword", "primitive"],
  ["TSUnknownKeyword", "unknown"],
]);

function isTopLevel({ parent }: ESTree.TSTypeAliasDeclaration) {
  return (
    parent.type === "Program" ||
    (parent.type === "ExportNamedDeclaration" && parent.parent.type === "Program")
  );
}

function referencedAlias(annotation: ESTree.TSType, aliases: Aliases) {
  if (
    annotation.type !== "TSTypeReference" ||
    annotation.typeName.type !== "Identifier" ||
    annotation.typeArguments !== null
  ) {
    return;
  }

  return aliases.get(annotation.typeName.name);
}

function terminalKind(alias: ESTree.TSTypeAliasDeclaration, aliases: Aliases) {
  const seen = new Set<string>();
  let current: ESTree.TSTypeAliasDeclaration | undefined = alias;
  let kind: string | undefined;

  while (kind === undefined && current?.typeParameters === null && !seen.has(current.id.name)) {
    seen.add(current.id.name);
    kind = TERMINAL_KINDS.get(current.typeAnnotation.type);
    current = referencedAlias(current.typeAnnotation, aliases);
  }

  return kind;
}

export const noTrivialTypeAliases = defineRule({
  meta: {
    docs: {
      description:
        "Forbid type aliases that end in a bare primitive or unknown with nothing added.",
    },
    messages: {
      primitive:
        '"{{name}}" stands for a bare primitive. Write that primitive at each use, or narrow it with a literal union or a brand.',
      unknown:
        '"{{name}}" is unknown under another name. Write unknown where the value enters, and validate it into a real type.',
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    const topLevel: Aliases = new Map();
    let declared: ESTree.TSTypeAliasDeclaration[] = [];

    return {
      before() {
        topLevel.clear();
        declared = [];
      },
      "Program:exit"() {
        for (const alias of declared) {
          const kind = terminalKind(alias, isTopLevel(alias) ? topLevel : new Map());

          if (kind !== undefined) {
            context.report({ data: { name: alias.id.name }, messageId: kind, node: alias });
          }
        }
      },
      TSTypeAliasDeclaration(node) {
        declared.push(node);

        if (isTopLevel(node)) {
          topLevel.set(node.id.name, node);
        }
      },
    };
  },
});
