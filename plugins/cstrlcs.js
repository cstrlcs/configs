// node_modules/@oxlint/plugins/index.js
function definePlugin(plugin) {
  return plugin;
}
function defineRule(rule) {
  return rule;
}
var FILE_CONTEXT = Object.freeze({
  get filename() {
    throw Error("Cannot access `context.filename` in `createOnce`");
  },
  getFilename() {
    throw Error("Cannot call `context.getFilename` in `createOnce`");
  },
  get physicalFilename() {
    throw Error("Cannot access `context.physicalFilename` in `createOnce`");
  },
  getPhysicalFilename() {
    throw Error("Cannot call `context.getPhysicalFilename` in `createOnce`");
  },
  get cwd() {
    throw Error("Cannot access `context.cwd` in `createOnce`");
  },
  getCwd() {
    throw Error("Cannot call `context.getCwd` in `createOnce`");
  },
  get sourceCode() {
    throw Error("Cannot access `context.sourceCode` in `createOnce`");
  },
  getSourceCode() {
    throw Error("Cannot call `context.getSourceCode` in `createOnce`");
  },
  get languageOptions() {
    throw Error("Cannot access `context.languageOptions` in `createOnce`");
  },
  get settings() {
    throw Error("Cannot access `context.settings` in `createOnce`");
  },
  extend(extension) {
    return Object.freeze(Object.assign(Object.create(this), extension));
  },
  get parserOptions() {
    throw Error("Cannot access `context.parserOptions` in `createOnce`");
  },
  get parserPath() {
    throw Error("Cannot access `context.parserPath` in `createOnce`");
  },
});

// src/plugins/cstrlcs/forbidden-dependencies/dependency-rules.ts
var PATTERN = {
  oneOf: [{ type: "string" }, { items: { type: "string" }, minItems: 1, type: "array" }],
};
var CONDITION = {
  additionalProperties: false,
  properties: { path: PATTERN, pathNot: PATTERN },
  type: "object",
};
var DEPENDENCY_RULES_SCHEMA = {
  items: {
    additionalProperties: false,
    properties: {
      comment: { type: "string" },
      from: CONDITION,
      name: { type: "string" },
      to: CONDITION,
    },
    required: ["name", "to"],
    type: "object",
  },
  type: "array",
};
var regExpCache = new Map();
function toRegExp(source) {
  let regExp = regExpCache.get(source);
  if (regExp === undefined) {
    regExp = new RegExp(source, "u");
    regExpCache.set(source, regExp);
  }
  return regExp;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function toSource(value) {
  if (typeof value === "string") {
    return value;
  }
  return Array.isArray(value)
    ? value.filter((part) => typeof part === "string").join("|")
    : undefined;
}
function toCondition(value) {
  const condition = isRecord(value) ? value : {};
  return { path: toSource(condition["path"]), pathNot: toSource(condition["pathNot"]) };
}
function toRule(value) {
  const { comment, from, name, to } = value;
  return {
    comment: typeof comment === "string" ? comment : undefined,
    from: toCondition(from),
    name: typeof name === "string" ? name : "",
    to: toCondition(to),
  };
}
function parseDependencyRules(options) {
  return options.filter((option) => isRecord(option)).map((option) => toRule(option));
}
function matchFrom(rule, file) {
  const { path, pathNot } = rule.from;
  if (pathNot !== undefined && toRegExp(pathNot).test(file)) {
    return;
  }
  if (path === undefined) {
    return [];
  }
  const match = toRegExp(path).exec(file);
  return match === null ? undefined : [...match];
}
function withGroups(source, groups) {
  return source?.replaceAll(/\$(?<index>[1-9])/gv, (_match, index) =>
    RegExp.escape(groups[Number(index)] ?? ""),
  );
}
function matchTo(rule, groups, target) {
  const path = withGroups(rule.to.path, groups);
  const pathNot = withGroups(rule.to.pathNot, groups);
  return (
    (path === undefined || toRegExp(path).test(target)) &&
    (pathNot === undefined || !toRegExp(pathNot).test(target))
  );
}

// src/plugins/cstrlcs/forbidden-dependencies/resolve.ts
import { ResolverFactory } from "oxc-resolver";
var resolver = new ResolverFactory({
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
function toPosix(filePath) {
  return filePath.replaceAll("\\", "/");
}
function toRelativePath(cwd, filePath) {
  const posixCwd = toPosix(cwd);
  const posixPath = toPosix(filePath);
  return posixPath.startsWith(`${posixCwd}/`) ? posixPath.slice(posixCwd.length + 1) : posixPath;
}
function resolveSpecifier(importer, specifier) {
  return resolver.resolveFileSync(importer, specifier).path ?? specifier;
}

// src/plugins/cstrlcs/forbidden-dependencies/rule.ts
function activeRulesFor(rules, file) {
  return rules.flatMap((rule) => {
    const groups = matchFrom(rule, file);
    return groups === undefined ? [] : [{ groups, rule }];
  });
}
var forbiddenDependencies = defineRule({
  meta: {
    docs: { description: "Forbid dependencies between modules based on their resolved paths." },
    messages: {
      forbidden: 'Dependency on "{{to}}" is forbidden by "{{name}}".{{comment}}',
    },
    schema: DEPENDENCY_RULES_SCHEMA,
    type: "problem",
  },
  createOnce(context) {
    let activeRules = [];
    function check(node, specifier) {
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

// src/plugins/cstrlcs/no-comments/rule.ts
var DIRECTIVES = [
  /^(?:oxlint|eslint)-(?:disable|enable)\b/v,
  /^@ts-(?:check|expect-error|ignore|nocheck)\b/v,
  /^\/\s*<reference\b/v,
];
function isAllowed(comment) {
  if (comment.type === "Shebang") {
    return true;
  }
  if (comment.type === "Block" && comment.value.startsWith("!")) {
    return true;
  }
  const value = comment.value.trim();
  return DIRECTIVES.some((directive) => directive.test(value));
}
var noComments = defineRule({
  meta: {
    docs: { description: "Forbid comments; the code itself should explain what it does." },
    messages: {
      forbidden: "Comments are not allowed. Express the intent through names and structure.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    return {
      Program() {
        for (const comment of context.sourceCode.getAllComments()) {
          if (!isAllowed(comment)) {
            context.report({ messageId: "forbidden", node: comment });
          }
        }
      },
    };
  },
});

// src/plugins/cstrlcs/no-explicit-return-type/rule.ts
function isRequired(node) {
  return node.body === null || node.returnType?.typeAnnotation.type === "TSTypePredicate";
}
var noExplicitReturnType = defineRule({
  meta: {
    docs: { description: "Forbid return type annotations; let TypeScript infer them." },
    hasSuggestions: true,
    messages: {
      forbidden: "Remove the return type annotation and let TypeScript infer it.",
      remove: "Remove the return type annotation.",
    },
    schema: [],
    type: "suggestion",
  },
  createOnce(context) {
    function check(node) {
      const { returnType } = node;
      if (returnType === null || returnType === undefined || isRequired(node)) {
        return;
      }
      context.report({
        messageId: "forbidden",
        node: returnType,
        suggest: [{ fix: (fixer) => fixer.remove(returnType), messageId: "remove" }],
      });
    }
    return {
      ArrowFunctionExpression: check,
      FunctionDeclaration: check,
      FunctionExpression: check,
    };
  },
});

// src/plugins/cstrlcs/padding-between-statements/rule.ts
function groupOf(statement) {
  if (statement.type === "ExpressionStatement" && "directive" in statement) {
    return "Directive";
  }
  return statement.type;
}
var STATEMENTS_WITH_BODY = new Set([
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
function hasBody(statement) {
  if (
    (statement.type === "ExportNamedDeclaration" ||
      statement.type === "ExportDefaultDeclaration") &&
    statement.declaration !== null
  ) {
    return STATEMENTS_WITH_BODY.has(statement.declaration.type);
  }
  return STATEMENTS_WITH_BODY.has(statement.type);
}
function isSingleLine(statement) {
  return statement.loc.start.line === statement.loc.end.line;
}
function canBeGrouped(previous, next) {
  if (groupOf(previous) !== groupOf(next) || hasBody(previous) || hasBody(next)) {
    return false;
  }
  return next.type === "ImportDeclaration" || (isSingleLine(previous) && isSingleLine(next));
}
function hasBlankLineBetween(context, previous, next) {
  return context.sourceCode.lines
    .slice(previous.loc.end.line, next.loc.start.line - 1)
    .some((line) => line.trim() === "");
}
function report(context, previous, next) {
  if (previous.loc.end.line === next.loc.start.line) {
    context.report({ messageId: "missing", node: next });
    return;
  }
  const startOfFollowingLine = context.sourceCode.lineStartIndices[previous.loc.end.line] ?? 0;
  context.report({
    fix: (fixer) =>
      fixer.insertTextBeforeRange(
        [startOfFollowingLine, startOfFollowingLine],
        `
`,
      ),
    messageId: "missing",
    node: next,
  });
}
function check(context, statements) {
  for (const [index, next] of statements.entries()) {
    const previous = statements[index - 1];
    if (
      previous !== undefined &&
      !canBeGrouped(previous, next) &&
      !hasBlankLineBetween(context, previous, next)
    ) {
      report(context, previous, next);
    }
  }
}
var paddingBetweenStatements = defineRule({
  meta: {
    docs: {
      description:
        "Require a blank line between statements, except between single-line statements of the same kind.",
    },
    fixable: "whitespace",
    messages: {
      missing: "Expected a blank line before this statement.",
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

// src/plugins/cstrlcs/index.ts
var cstrlcs_default = definePlugin({
  meta: { name: "cstrlcs" },
  rules: {
    "forbidden-dependencies": forbiddenDependencies,
    "no-comments": noComments,
    "no-explicit-return-type": noExplicitReturnType,
    "padding-between-statements": paddingBetweenStatements,
  },
});
export { cstrlcs_default as default };
