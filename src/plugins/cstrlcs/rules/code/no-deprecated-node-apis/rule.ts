import type { IdentifierNode } from "../shared/ast.ts";
import type { Context, ESTree, Scope, Variable } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { moduleExportName } from "../shared/ast.ts";
import { staticString } from "../shared/constants.ts";
import { variableOf } from "../shared/scope.ts";

interface Tracker {
  context: Context;
  isModule: boolean;
  table: ReadonlyMap<string, string | null>;
  visited: Map<Variable, Set<string>>;
}

interface Visit {
  isPattern: boolean;
  node: ESTree.Node;
  path: readonly string[];
  tracker: Tracker;
}

type ObjectPatternNode = Extract<ESTree.Node, { type: "ObjectPattern" }>;

const BUFFER_FACTORIES = '"Buffer.alloc()" or "Buffer.from()"';
const CONSOLE_LOG = '"console.log()"';
const CREATE_REQUIRE = '"module.createRequire()"';
const GLOBAL_THIS = '"globalThis"';
const RANDOM_BYTES = '"crypto.randomBytes()"';
const REPL_MODULE = 'the "node:repl" module';
const SLOW_BUFFER = '"Buffer.allocUnsafeSlow()"';
const TLS_SOCKET = '"tls.TLSSocket"';

const COUNTERS = [
  "COUNTER_HTTP_CLIENT_REQUEST",
  "COUNTER_HTTP_CLIENT_RESPONSE",
  "COUNTER_HTTP_SERVER_REQUEST",
  "COUNTER_HTTP_SERVER_RESPONSE",
  "COUNTER_NET_SERVER_CONNECTION",
  "COUNTER_NET_SERVER_CONNECTION_CLOSE",
];

const UTIL_PREDICATES = [
  "isBoolean",
  "isDate",
  "isError",
  "isFunction",
  "isNull",
  "isNullOrUndefined",
  "isNumber",
  "isObject",
  "isPrimitive",
  "isRegExp",
  "isString",
  "isSymbol",
  "isUndefined",
];

const ZLIB_CLASSES = [
  "BrotliCompress",
  "BrotliDecompress",
  "Deflate",
  "DeflateRaw",
  "Gunzip",
  "Gzip",
  "Inflate",
  "InflateRaw",
  "Unzip",
];

const PROCESS_APIS = {
  "process.EventEmitter": 'the "node:events" module',
  "process.binding": null,
  "process.env.NODE_REPL_HISTORY_FILE": 'the "NODE_REPL_HISTORY" variable',
  "process.report.triggerReport": '"process.report.writeReport()"',
};

const GLOBAL_OBJECTS = new Set(["global", "globalThis", "self", "window"]);
const LOADERS = new Set(["process.getBuiltinModule", "require"]);
const NODE_PREFIX = /^node:/v;

const TRANSPARENT_PARENTS = new Set([
  "ChainExpression",
  "LogicalExpression",
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSNonNullExpression",
  "TSSatisfiesExpression",
  "TSTypeAssertion",
]);

function withoutReplacement(owner: string, names: readonly string[]) {
  return Object.fromEntries(names.map((name) => [`${owner}.${name}`, null]));
}

function calledWithoutNew(owner: string, names: readonly string[]) {
  return Object.fromEntries(
    names.map((name) => [`${owner}.${name}()`, `"new ${owner}.${name}()"`]),
  );
}

function loaderInternals(owner: string) {
  return {
    [`${owner}._debug`]: null,
    [`${owner}.createRequireFromPath`]: CREATE_REQUIRE,
    [`${owner}.requireRepl`]: REPL_MODULE,
  };
}

const moduleApis: ReadonlyMap<string, string | null> = new Map(
  Object.entries({
    ...PROCESS_APIS,
    ...calledWithoutNew("repl", ["Recoverable", "REPLServer"]),
    ...calledWithoutNew("zlib", ZLIB_CLASSES),
    ...loaderInternals("module"),
    ...loaderInternals("module.Module"),
    ...withoutReplacement("crypto", ["_toBuf", "DEFAULT_ENCODING"]),
    ...withoutReplacement("readline", [
      "codePointAt",
      "getStringWidth",
      "isFullWidthCodePoint",
      "stripVTControlCharacters",
    ]),
    ...withoutReplacement("tls", ["CleartextStream", "convertNPNProtocols"]),
    ...withoutReplacement("util", UTIL_PREDICATES),
    _linklist: null,
    _stream_wrap: null,
    "async_hooks.currentId": '"async_hooks.executionAsyncId()"',
    "async_hooks.triggerId": '"async_hooks.triggerAsyncId()"',
    "buffer.Buffer()": BUFFER_FACTORIES,
    "buffer.SlowBuffer": SLOW_BUFFER,
    constants: 'the "constants" export of "node:fs", "node:os" or "node:crypto"',
    "crypto.Credentials": '"tls.SecureContext"',
    "crypto.createCipher": '"crypto.createCipheriv()"',
    "crypto.createCredentials": '"tls.createSecureContext()"',
    "crypto.createDecipher": '"crypto.createDecipheriv()"',
    "crypto.prng": RANDOM_BYTES,
    "crypto.pseudoRandomBytes": RANDOM_BYTES,
    "crypto.rng": RANDOM_BYTES,
    domain: null,
    freelist: null,
    "fs.SyncWriteStream": null,
    "http.createClient": '"http.request()"',
    "net._setSimultaneousAccepts": null,
    "new safe-buffer.Buffer()": BUFFER_FACTORIES,
    "os.getNetworkInterfaces": '"os.networkInterfaces()"',
    "os.tmpDir": '"os.tmpdir()"',
    "path._makeLong": '"path.toNamespacedPath()"',
    punycode: 'the "punycode" package from npm',
    "repl.REPL_MODE_MAGIC": null,
    "repl.builtinModules": '"module.builtinModules"',
    "safe-buffer.Buffer()": BUFFER_FACTORIES,
    "safe-buffer.SlowBuffer": SLOW_BUFFER,
    sys: 'the "node:util" module',
    "timers.enroll": '"setTimeout()" or "setInterval()"',
    "timers.unenroll": '"clearTimeout()" or "clearInterval()"',
    "tls.CryptoStream": TLS_SOCKET,
    "tls.SecurePair": TLS_SOCKET,
    "tls.createSecurePair": TLS_SOCKET,
    "tls.parseCertString": '"querystring.parse()"',
    "tty.setRawMode": '"process.stdin.setRawMode()"',
    "util._extend": '"Object.assign()"',
    "util.error": '"console.error()"',
    "util.isBuffer": '"Buffer.isBuffer()"',
    "util.log": "a logging library",
    "util.print": CONSOLE_LOG,
    "util.pump": '"stream.pipeline()"',
    "util.puts": CONSOLE_LOG,
    "vm.runInDebugContext": null,
  }),
);

const globalApis: ReadonlyMap<string, string | null> = new Map(
  Object.entries({
    ...PROCESS_APIS,
    ...Object.fromEntries(COUNTERS.map((name) => [name, null])),
    "Buffer()": BUFFER_FACTORIES,
    GLOBAL: GLOBAL_THIS,
    "Intl.v8BreakIterator": '"Intl.Segmenter"',
    root: GLOBAL_THIS,
  }),
);

const GLOBAL_ROOTS = new Set([
  ...COUNTERS,
  "Buffer",
  "GLOBAL",
  "Intl",
  "process",
  "require",
  "root",
]);

function propertyKey(key: ESTree.Node, computed: boolean) {
  if (computed || key.type !== "Identifier") {
    return staticString(key);
  }

  return key.name;
}

function reportDeprecated({ context, isModule, table }: Tracker, node: ESTree.Node, name: string) {
  const replacement = table.get(name);

  if (replacement === undefined) {
    return;
  }

  const kind = isModule && !name.includes(".") ? "module" : "API";

  if (replacement === null) {
    context.report({ data: { kind, name }, messageId: "remove", node });

    return;
  }

  context.report({ data: { kind, name, replacement }, messageId: "replace", node });
}

function moduleVisit(context: Context, node: ESTree.Node, specifier: string) {
  const name = specifier.replace(NODE_PREFIX, "");

  const tracker = {
    context,
    isModule: true,
    table: moduleApis,
    visited: new Map<Variable, Set<string>>(),
  };

  reportDeprecated(tracker, node, name);

  return { isPattern: false, node, path: [name], tracker };
}

function extend({ path, tracker }: Visit, node: ESTree.Node, key: string) {
  if (tracker.isModule && path.length === 1 && key === "default") {
    return path;
  }

  const member = [...path, key];

  reportDeprecated(tracker, node, member.join("."));

  return member;
}

function accessed(visit: Visit, parent: ESTree.Node) {
  const isObject = parent.type === "MemberExpression" && parent.object === visit.node;
  const key = isObject ? propertyKey(parent.property, parent.computed) : undefined;

  if (key === undefined) {
    return [];
  }

  return [{ ...visit, node: parent, path: extend(visit, parent, key) }];
}

function called({ node, path, tracker }: Visit, parent: ESTree.Node) {
  if (parent.type !== "CallExpression" || parent.callee !== node) {
    return [];
  }

  const name = path.join(".");
  const specifier = staticString(parent.arguments[0]);

  reportDeprecated(tracker, parent, `${name}()`);

  if (specifier === undefined || !LOADERS.has(name)) {
    return [];
  }

  return [moduleVisit(tracker.context, parent, specifier)];
}

function constructed({ node, path, tracker }: Visit, parent: ESTree.Node) {
  if (parent.type === "NewExpression" && parent.callee === node) {
    reportDeprecated(tracker, parent, `new ${path.join(".")}()`);
  }

  return [];
}

function declared(visit: Visit, parent: ESTree.Node) {
  if (parent.type === "VariableDeclarator" && parent.init === visit.node) {
    return [{ ...visit, isPattern: true, node: parent.id }];
  }

  if (parent.type === "AssignmentPattern" && parent.right === visit.node) {
    return [{ ...visit, isPattern: true, node: parent.left }];
  }

  return [];
}

function assigned(visit: Visit, parent: ESTree.Node) {
  const isAssigned =
    parent.type === "AssignmentExpression" &&
    parent.operator === "=" &&
    parent.right === visit.node;

  if (!isAssigned) {
    return [];
  }

  return [
    { ...visit, isPattern: true, node: parent.left },
    { ...visit, node: parent },
  ];
}

const climbers: Partial<Record<string, (visit: Visit, parent: ESTree.Node) => Visit[]>> = {
  AssignmentExpression: assigned,
  AssignmentPattern: declared,
  CallExpression: called,
  MemberExpression: accessed,
  NewExpression: constructed,
  VariableDeclarator: declared,
};

function climb(visit: Visit) {
  const { node } = visit;
  const { parent } = node;

  if (parent === null) {
    return [];
  }

  const isTransparent =
    parent.type === "ConditionalExpression"
      ? parent.test !== node
      : TRANSPARENT_PARENTS.has(parent.type);

  if (isTransparent) {
    return [{ ...visit, node: parent }];
  }

  return climbers[parent.type]?.(visit, parent) ?? [];
}

function readsOf(visit: Visit, identifier: IdentifierNode) {
  const { path, tracker } = visit;
  const variable = variableOf(tracker.context, identifier);

  if (variable === undefined) {
    return [];
  }

  const key = path.join(".");
  const paths = tracker.visited.get(variable) ?? new Set<string>();

  if (paths.has(key)) {
    return [];
  }

  tracker.visited.set(variable, paths.add(key));

  return variable.references
    .filter((reference) => reference.isRead())
    .map(({ identifier: node }) => ({ isPattern: false, node, path, tracker }));
}

function destructured(visit: Visit, pattern: ObjectPatternNode) {
  return pattern.properties.flatMap((property) => {
    if (property.type !== "Property") {
      return [];
    }

    const key = propertyKey(property.key, property.computed);

    if (key === undefined) {
      return [];
    }

    return [{ ...visit, node: property.value, path: extend(visit, property, key) }];
  });
}

function unpack(visit: Visit) {
  const { node } = visit;

  if (node.type === "Identifier") {
    return readsOf(visit, node);
  }

  if (node.type === "AssignmentPattern") {
    return [{ ...visit, node: node.left }];
  }

  return node.type === "ObjectPattern" ? destructured(visit, node) : [];
}

function walk(start: Visit) {
  const queue = [start];

  for (const visit of queue) {
    queue.push(...(visit.isPattern ? unpack(visit) : climb(visit)));
  }
}

function globalReads(scope: Scope, name: string) {
  const variable = scope.set.get(name);

  if (variable !== undefined && variable.defs.length > 0) {
    return [];
  }

  const references =
    variable?.references ?? scope.through.filter(({ identifier }) => identifier.name === name);

  if (references.some((reference) => reference.isWrite())) {
    return [];
  }

  return references.map(({ identifier }) => identifier);
}

function globalEntry(identifier: ESTree.Node, name: string) {
  if (GLOBAL_ROOTS.has(name)) {
    return [{ name, node: identifier }];
  }

  const { parent } = identifier;

  if (parent?.type !== "MemberExpression" || parent.object !== identifier) {
    return [];
  }

  const key = propertyKey(parent.property, parent.computed);

  return key !== undefined && GLOBAL_ROOTS.has(key) ? [{ name: key, node: parent }] : [];
}

function checkGlobals(context: Context) {
  const scope = context.sourceCode.scopeManager.globalScope;

  if (scope === null) {
    return;
  }

  const tracker = {
    context,
    isModule: false,
    table: globalApis,
    visited: new Map<Variable, Set<string>>(),
  };

  const entries = [...GLOBAL_ROOTS, ...GLOBAL_OBJECTS].flatMap((name) =>
    globalReads(scope, name).flatMap((identifier) => globalEntry(identifier, name)),
  );

  for (const { name, node } of entries) {
    reportDeprecated(tracker, node, name);
    walk({ isPattern: false, node, path: [name], tracker });
  }
}

function checkImport(context: Context, declaration: ESTree.ImportDeclaration) {
  if (declaration.importKind === "type") {
    return;
  }

  const start = moduleVisit(context, declaration, declaration.source.value);

  const values = declaration.specifiers.filter(
    (specifier) => specifier.type !== "ImportSpecifier" || specifier.importKind !== "type",
  );

  for (const specifier of values) {
    const path =
      specifier.type === "ImportSpecifier"
        ? extend(start, specifier, moduleExportName(specifier.imported))
        : start.path;

    walk({ ...start, isPattern: true, node: specifier.local, path });
  }
}

function checkExport(
  context: Context,
  declaration: ESTree.ExportAllDeclaration | ESTree.ExportNamedDeclaration,
) {
  const specifier = staticString(declaration.source);

  if (specifier === undefined || declaration.exportKind === "type") {
    return;
  }

  const start = moduleVisit(context, declaration, specifier);

  if (declaration.type === "ExportAllDeclaration") {
    return;
  }

  for (const exported of declaration.specifiers.filter(({ exportKind }) => exportKind !== "type")) {
    extend(start, exported, moduleExportName(exported.local));
  }
}

export const noDeprecatedNodeApis = defineRule({
  meta: {
    docs: {
      description:
        "Forbid deprecated Node.js modules, globals and call forms that type definitions do not mark as deprecated.",
    },
    messages: {
      remove: '"{{name}}" is a deprecated Node.js {{kind}} with no replacement. Remove it.',
      replace: '"{{name}}" is a deprecated Node.js {{kind}}. Use {{replacement}} instead.',
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    return {
      ExportAllDeclaration(node) {
        checkExport(context, node);
      },
      ExportNamedDeclaration(node) {
        checkExport(context, node);
      },
      ImportDeclaration(node) {
        checkImport(context, node);
      },
      ImportExpression(node) {
        const specifier = staticString(node.source);
        const { parent } = node;

        if (specifier === undefined) {
          return;
        }

        const start = moduleVisit(context, node, specifier);

        if (parent.type === "AwaitExpression") {
          walk({ ...start, node: parent });
        }
      },
      Program() {
        checkGlobals(context);
      },
    };
  },
});
