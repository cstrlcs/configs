import type { Options, Ranged, RuleOptionsSchema } from "@oxlint/plugins";
import path from "node:path";
import { defineRule } from "@oxlint/plugins";
import { ResolverFactory } from "oxc-resolver";

type Json = Options[number];
type JsonRecord = Readonly<Record<string, Json>>;
type Schema = Exclude<RuleOptionsSchema, false | unknown[]>;

interface PathCondition {
  readonly path: string | undefined;
  readonly pathNot: string | undefined;
}

interface DependencyRule {
  readonly name: string;
  readonly comment: string | undefined;
  readonly from: PathCondition;
  readonly target: PathCondition;
  readonly allowList: boolean;
}

const PATTERN: Schema = {
  oneOf: [{ type: "string" }, { items: { type: "string" }, minItems: 1, type: "array" }],
};

const CONDITION: Schema = {
  additionalProperties: false,
  properties: { path: PATTERN, pathNot: PATTERN },
  type: "object",
};

const DEPENDENCY_RULES_SCHEMA: Schema = {
  items: {
    additionalProperties: false,
    oneOf: [{ required: ["to"] }, { required: ["allow"] }],
    properties: {
      allow: CONDITION,
      comment: { type: "string" },
      from: CONDITION,
      name: { type: "string" },
      to: CONDITION,
    },
    required: ["name"],
    type: "object",
  },
  type: "array",
};

const regExpCache = new Map<string, RegExp>();

function toRegExp(source: string) {
  let regExp = regExpCache.get(source);

  if (regExp === undefined) {
    regExp = new RegExp(source, "u");
    regExpCache.set(source, regExp);
  }

  return regExp;
}

function isRecord(value: Json | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSource(value: Json | undefined) {
  if (typeof value === "string") {
    return value;
  }

  return Array.isArray(value)
    ? value.filter((part): part is string => typeof part === "string").join("|")
    : undefined;
}

function toCondition(value: Json | undefined) {
  const condition = isRecord(value) ? value : {};

  return { path: toSource(condition["path"]), pathNot: toSource(condition["pathNot"]) };
}

function toRule(value: JsonRecord) {
  const { allow, comment, from, name, to } = value;

  return {
    allowList: allow !== undefined,
    comment: typeof comment === "string" ? comment : undefined,
    from: toCondition(from),
    name: typeof name === "string" ? name : "",
    target: toCondition(allow ?? to),
  };
}

function parseDependencyRules(options: Readonly<Options>) {
  return options
    .filter((option): option is JsonRecord => isRecord(option))
    .map((option) => toRule(option));
}

function matchFrom(rule: DependencyRule, file: string) {
  const { path: pattern, pathNot } = rule.from;

  if (pathNot !== undefined && toRegExp(pathNot).test(file)) {
    return;
  }

  if (pattern === undefined) {
    return [];
  }

  const match = toRegExp(pattern).exec(file);

  return match === null ? undefined : [...match];
}

function withGroups(source: string | undefined, groups: readonly string[]) {
  return source?.replaceAll(/\$(?<index>[1-9])/gv, (_, index: string) =>
    RegExp.escape(groups[Number(index)] ?? ""),
  );
}

function matchTarget(rule: DependencyRule, groups: readonly string[], target: string) {
  const pattern = withGroups(rule.target.path, groups);
  const pathNot = withGroups(rule.target.pathNot, groups);

  return (
    (pattern === undefined || toRegExp(pattern).test(target)) &&
    (pathNot === undefined || !toRegExp(pathNot).test(target))
  );
}

const resolver = new ResolverFactory({
  builtinModules: true,
  conditionNames: ["node", "import"],
  extensionAlias: {
    ".cjs": [".cts", ".cjs"],
    ".js": [".ts", ".tsx", ".js", ".jsx"],
    ".mjs": [".mts", ".mjs"],
  },
  extensions: [".ts", ".tsx", ".d.ts", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs", ".json"],
  tsconfig: "auto",
});

function toPosix(filePath: string) {
  return filePath.replaceAll("\\", "/");
}

function toRelativePath(cwd: string, filePath: string) {
  const posixCwd = toPosix(cwd);
  const posixPath = toPosix(filePath);

  return posixPath.startsWith(`${posixCwd}/`) ? posixPath.slice(posixCwd.length + 1) : posixPath;
}

const BUN_STORE = /(?<=(?:^|\/)node_modules\/)\.bun\/[^\/]+\/node_modules\//gv;
const PACKAGE_SPECIFIER = /^(?:@[a-z0-9][\w.\-]*\/)?[a-z0-9][\w.\-]*(?:\/|$)/iv;

function resolveSpecifier(importer: string, specifier: string) {
  const { builtin, path: resolved } = resolver.resolveFileSync(importer, specifier);

  if (resolved !== undefined) {
    return toPosix(resolved).replaceAll(BUN_STORE, "");
  }

  if (builtin !== undefined) {
    return builtin.resolved;
  }

  if (PACKAGE_SPECIFIER.test(specifier)) {
    return `node_modules/${specifier}/`;
  }

  if (specifier.startsWith(".") || path.isAbsolute(specifier)) {
    return path.resolve(path.dirname(importer), specifier);
  }

  return specifier;
}

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

export const noForbiddenDependencies = defineRule({
  meta: {
    docs: { description: "Forbid dependencies between modules based on their resolved paths." },
    messages: {
      forbidden: 'Dependency on "{{to}}" is forbidden by "{{name}}".{{comment}}',
      notAllowed: 'Dependency on "{{to}}" is not allowed by "{{name}}".{{comment}}',
    },
    schema: DEPENDENCY_RULES_SCHEMA,
    type: "problem",
  },
  createOnce(context) {
    let activeRules: ActiveRule[] = [];

    function check(node: Ranged, specifier: string) {
      const target = toRelativePath(context.cwd, resolveSpecifier(context.filename, specifier));

      for (const { rule, groups } of activeRules) {
        if (matchTarget(rule, groups, target) !== rule.allowList) {
          const comment = rule.comment === undefined ? "" : ` ${rule.comment}`;

          context.report({
            data: { comment, name: rule.name, to: target },
            messageId: rule.allowList ? "notAllowed" : "forbidden",
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
