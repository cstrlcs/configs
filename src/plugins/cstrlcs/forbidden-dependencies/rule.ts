import type { DependencyRule } from "./dependency-rules.ts";
import type { Ranged } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import {
  DEPENDENCY_RULES_SCHEMA,
  matchFrom,
  matchTo,
  parseDependencyRules,
} from "./dependency-rules.ts";
import { resolveSpecifier, toRelativePath } from "./resolve.ts";

interface ActiveRule {
  readonly rule: DependencyRule;
  readonly groups: readonly string[];
}

function activeRulesFor(rules: readonly DependencyRule[], file: string) {
  return rules.flatMap((rule) => {
    const groups = matchFrom(rule, file);
    return groups === undefined ? [] : [{ groups, rule }];
  });
}

export const forbiddenDependencies = defineRule({
  meta: {
    docs: { description: "Forbid dependencies between modules based on their resolved paths." },
    messages: {
      forbidden: 'Dependency on "{{to}}" is forbidden by "{{name}}".{{comment}}',
    },
    schema: DEPENDENCY_RULES_SCHEMA,
    type: "problem",
  },
  createOnce(context) {
    let activeRules: ActiveRule[] = [];

    function check(node: Ranged, specifier: string) {
      const target = toRelativePath(context.cwd, resolveSpecifier(context.filename, specifier));

      for (const { rule, groups } of activeRules) {
        if (matchTo(rule, groups, target)) {
          const comment = rule.comment === undefined ? "" : ` ${rule.comment}`;
          context.report({
            data: { comment, name: rule.name, to: target },
            messageId: "forbidden",
            node,
          });
        }
      }
    }

    return {
      before() {
        const rules = parseDependencyRules(context.options);
        activeRules = activeRulesFor(rules, toRelativePath(context.cwd, context.filename));

        return activeRules.length > 0;
      },
      ExportAllDeclaration(node) {
        check(node.source, node.source.value);
      },
      ExportNamedDeclaration(node) {
        if (node.source !== null) {
          check(node.source, node.source.value);
        }
      },
      ImportDeclaration(node) {
        check(node.source, node.source.value);
      },
      ImportExpression(node) {
        if (node.source.type === "Literal" && typeof node.source.value === "string") {
          check(node.source, node.source.value);
        }
      },
    };
  },
});
