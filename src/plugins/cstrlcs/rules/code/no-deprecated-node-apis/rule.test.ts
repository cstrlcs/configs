import { RuleTester } from "oxlint/plugins-dev";

import { noDeprecatedNodeApis } from "./rule.ts";

const BUFFER_FACTORIES = '"Buffer.alloc()" or "Buffer.from()"';
const CONSOLE_LOG = '"console.log()"';
const RANDOM_BYTES = '"crypto.randomBytes()"';
const REPL_MODULE = 'the "node:repl" module';
const SLOW_BUFFER = '"Buffer.allocUnsafeSlow()"';
const TLS_SOCKET = '"tls.TLSSocket"';

function deprecation(name: string, replacement: string | null, kind = "API") {
  if (replacement === null) {
    return { data: { kind, name }, messageId: "remove" };
  }

  return { data: { kind, name, replacement }, messageId: "replace" };
}

function api(code: string, name: string, replacement: string | null = null) {
  return { code, errors: [deprecation(name, replacement)] };
}

function legacyModule(code: string, name: string, replacement: string | null = null) {
  return { code, errors: [deprecation(name, replacement, "module")] };
}

const viaRequire = [
  legacyModule('const linkedList = require("_linklist");', "_linklist"),
  legacyModule('const wrapStream = require("_stream_wrap");', "_stream_wrap"),
  legacyModule(
    'const { O_RDONLY } = require("node:constants");',
    "constants",
    'the "constants" export of "node:fs", "node:os" or "node:crypto"',
  ),
  legacyModule('const sandbox = require("domain").create();', "domain"),
  legacyModule('const pool = require("freelist");', "freelist"),
  legacyModule(
    'const { toASCII } = require("punycode");',
    "punycode",
    'the "punycode" package from npm',
  ),
  legacyModule('const { inspect } = require("node:sys");', "sys", 'the "node:util" module'),
  api(
    'const { currentId } = require("node:async_hooks");',
    "async_hooks.currentId",
    '"async_hooks.executionAsyncId()"',
  ),
  api(
    'const parentId = require("async_hooks").triggerId();',
    "async_hooks.triggerId",
    '"async_hooks.triggerAsyncId()"',
  ),
  api('const header = require("node:buffer").Buffer(4);', "buffer.Buffer()", BUFFER_FACTORIES),
  api(
    'const buffers = require("buffer");\nconst chunk = buffers.Buffer(payload);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'const buffers = require("buffer");\nconst chunk = buffers["Buffer"](payload);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'const buffers = require("buffer");\nconst chunk = buffers[`Buffer`](payload);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'const LegacyBuffer = require("buffer").Buffer;\nconst frame = LegacyBuffer(frameSize);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  {
    code: 'let buffers;\n((buffers = require("node:buffer")).Buffer)(8);\nbuffers.Buffer(16);',
    errors: [
      deprecation("buffer.Buffer()", BUFFER_FACTORIES),
      deprecation("buffer.Buffer()", BUFFER_FACTORIES),
    ],
  },
  api(
    'const { Buffer: RawBuffer } = require("node:buffer");\nconst packet = RawBuffer(packetSize);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'const { ["Buffer"]: allocate = null } = require("buffer");\nallocate(blockSize);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'const { "Buffer": allocate = undefined } = require("buffer");\nallocate(blockSize);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'const { allocate = require("buffer").Buffer } = options;\nallocate(blockSize);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api('const Pooled = require("node:buffer").SlowBuffer;', "buffer.SlowBuffer", SLOW_BUFFER),
  api(
    'const buffers = require("buffer");\nconst scratch = new buffers.SlowBuffer(64);',
    "buffer.SlowBuffer",
    SLOW_BUFFER,
  ),
  api('const { SlowBuffer: Pooled } = require("buffer");', "buffer.SlowBuffer", SLOW_BUFFER),
  api(
    'const { Buffer } = require("safe-buffer");\nconst token = Buffer(tokenLength);',
    "safe-buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'const { Buffer: SafeBuffer } = require("safe-buffer");\nconst token = new SafeBuffer(tokenLength);',
    "new safe-buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api('const { SlowBuffer } = require("safe-buffer");', "safe-buffer.SlowBuffer", SLOW_BUFFER),
  api(
    'const { Credentials } = require("node:crypto");',
    "crypto.Credentials",
    '"tls.SecureContext"',
  ),
  api(
    'const secure = require("crypto").createCredentials(tlsOptions);',
    "crypto.createCredentials",
    '"tls.createSecureContext()"',
  ),
  api(
    'const crypto = require("crypto");\nconst cipher = crypto.createCipher("aes192", secret);',
    "crypto.createCipher",
    '"crypto.createCipheriv()"',
  ),
  api(
    'const { createDecipher } = require("node:crypto");',
    "crypto.createDecipher",
    '"crypto.createDecipheriv()"',
  ),
  api('const salt = require("crypto").rng(16);', "crypto.rng", RANDOM_BYTES),
  api('const { prng } = require("crypto");', "crypto.prng", RANDOM_BYTES),
  api(
    'const nonce = require("node:crypto").pseudoRandomBytes(12);',
    "crypto.pseudoRandomBytes",
    RANDOM_BYTES,
  ),
  api('const encoding = require("crypto").DEFAULT_ENCODING;', "crypto.DEFAULT_ENCODING"),
  api('const toBuffer = require("crypto")._toBuf;', "crypto._toBuf"),
  api('const { SyncWriteStream } = require("node:fs");', "fs.SyncWriteStream"),
  api(
    'const client = require("http").createClient(8080, "localhost");',
    "http.createClient",
    '"http.request()"',
  ),
  api('const { requireRepl } = require("module");', "module.requireRepl", REPL_MODULE),
  api(
    'const shell = require("node:module").Module.requireRepl();',
    "module.Module.requireRepl",
    REPL_MODULE,
  ),
  api('const { _debug } = require("module");', "module._debug"),
  api('const trace = require("module").Module._debug;', "module.Module._debug"),
  api(
    'const load = require("module").createRequireFromPath(__filename);',
    "module.createRequireFromPath",
    '"module.createRequire()"',
  ),
  api(
    'const { Module } = require("node:module");\nconst load = Module.createRequireFromPath(entry);',
    "module.Module.createRequireFromPath",
    '"module.createRequire()"',
  ),
  api('require("net")._setSimultaneousAccepts(true);', "net._setSimultaneousAccepts"),
  api(
    'const interfaces = require("os").getNetworkInterfaces();',
    "os.getNetworkInterfaces",
    '"os.networkInterfaces()"',
  ),
  api('const { tmpDir } = require("node:os");', "os.tmpDir", '"os.tmpdir()"'),
  api(
    'const longPath = require("path")._makeLong(uploadDir);',
    "path._makeLong",
    '"path.toNamespacedPath()"',
  ),
  api('const { codePointAt } = require("readline");', "readline.codePointAt"),
  api('const width = require("readline").getStringWidth(label);', "readline.getStringWidth"),
  api(
    'const { isFullWidthCodePoint } = require("node:readline");',
    "readline.isFullWidthCodePoint",
  ),
  api(
    'const plain = require("readline").stripVTControlCharacters(output);',
    "readline.stripVTControlCharacters",
  ),
  api(
    'const console = require("repl").REPLServer({ prompt: "> " });',
    "repl.REPLServer()",
    '"new repl.REPLServer()"',
  ),
  api(
    'const { Recoverable } = require("node:repl");\nthrow Recoverable(parseError);',
    "repl.Recoverable()",
    '"new repl.Recoverable()"',
  ),
  api('const magic = require("repl").REPL_MODE_MAGIC;', "repl.REPL_MODE_MAGIC"),
  api(
    'const { builtinModules } = require("repl");',
    "repl.builtinModules",
    '"module.builtinModules"',
  ),
  api(
    'require("timers").enroll(socket, idleTimeout);',
    "timers.enroll",
    '"setTimeout()" or "setInterval()"',
  ),
  api(
    'const { unenroll } = require("node:timers");',
    "timers.unenroll",
    '"clearTimeout()" or "clearInterval()"',
  ),
  api('const { CleartextStream } = require("tls");', "tls.CleartextStream"),
  api('const stream = new (require("tls").CryptoStream)();', "tls.CryptoStream", TLS_SOCKET),
  api('const { SecurePair } = require("node:tls");', "tls.SecurePair", TLS_SOCKET),
  api('const pair = require("tls").createSecurePair(context);', "tls.createSecurePair", TLS_SOCKET),
  api(
    'const subject = require("tls").parseCertString(certificate);',
    "tls.parseCertString",
    '"querystring.parse()"',
  ),
  api('const { convertNPNProtocols } = require("tls");', "tls.convertNPNProtocols"),
  api('require("tty").setRawMode(true);', "tty.setRawMode", '"process.stdin.setRawMode()"'),
  api(
    'const util = require("util");\nutil.error("upload failed");',
    "util.error",
    '"console.error()"',
  ),
  api('const { isBoolean } = require("node:util");', "util.isBoolean"),
  api('const isBinary = require("util").isBuffer(body);', "util.isBuffer", '"Buffer.isBuffer()"'),
  api('const missing = require("util").isUndefined(invoice.dueDate);', "util.isUndefined"),
  {
    code: 'const { isNullOrUndefined, isRegExp } = require("util");',
    errors: [deprecation("util.isNullOrUndefined", null), deprecation("util.isRegExp", null)],
  },
  api('require("util").log("session started");', "util.log", "a logging library"),
  api('require("util").puts(summary);', "util.puts", CONSOLE_LOG),
  api('const { print } = require("node:util");', "util.print", CONSOLE_LOG),
  api('require("util").pump(uploadStream, archiveStream);', "util.pump", '"stream.pipeline()"'),
  api(
    'const merged = require("util")._extend(defaults, overrides);',
    "util._extend",
    '"Object.assign()"',
  ),
  api('const debugContext = require("vm").runInDebugContext("Debug");', "vm.runInDebugContext"),
  api('const gzip = require("zlib").Gzip();', "zlib.Gzip()", '"new zlib.Gzip()"'),
  api(
    'const { Inflate } = require("node:zlib");\nconst inflater = Inflate();',
    "zlib.Inflate()",
    '"new zlib.Inflate()"',
  ),
  api(
    'const zlib = require("zlib");\nconst compressor = zlib.BrotliCompress(brotliOptions);',
    "zlib.BrotliCompress()",
    '"new zlib.BrotliCompress()"',
  ),
];

const viaImport = [
  api(
    'import buffers from "buffer";\nconst chunk = buffers.Buffer(payload);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'import buffers from "node:buffer";\nconst chunk = buffers.Buffer(payload);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'import * as buffers from "buffer";\nconst chunk = buffers.Buffer(payload);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'import * as buffers from "buffer";\nconst chunk = buffers.default.Buffer(payload);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'import { Buffer as NodeBuffer } from "buffer";\nconst chunk = NodeBuffer(payload);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'import buffers from "buffer";\nconst Pooled = buffers.SlowBuffer;',
    "buffer.SlowBuffer",
    SLOW_BUFFER,
  ),
  api(
    'import * as buffers from "buffer";\nconst Pooled = buffers.default.SlowBuffer;',
    "buffer.SlowBuffer",
    SLOW_BUFFER,
  ),
  api('import { SlowBuffer as Pooled } from "buffer";', "buffer.SlowBuffer", SLOW_BUFFER),
  api(
    'import { default as utilities } from "node:util";\nutilities.isString(label);',
    "util.isString",
  ),
  api('import { "isDate" as isDate } from "util";', "util.isDate"),
  legacyModule('import sandboxes from "domain";', "domain"),
  legacyModule('import "node:domain";', "domain"),
  legacyModule('import { type Domain } from "node:domain";', "domain"),
  legacyModule(
    'import * as punycode from "node:punycode";',
    "punycode",
    'the "punycode" package from npm',
  ),
  api(
    'import process from "node:process";\nconst Emitter = process.EventEmitter;',
    "process.EventEmitter",
    'the "node:events" module',
  ),
  api(
    'import process from "node:process";\nconst fsBinding = process.binding("fs");',
    "process.binding",
  ),
  api(
    'import { env } from "node:process";\nconst historyPath = env.NODE_REPL_HISTORY_FILE;',
    "process.env.NODE_REPL_HISTORY_FILE",
    'the "NODE_REPL_HISTORY" variable',
  ),
  api(
    'import process from "node:process";\nconst {\n  env: { NODE_REPL_HISTORY_FILE: historyPath },\n} = process;',
    "process.env.NODE_REPL_HISTORY_FILE",
    'the "NODE_REPL_HISTORY" variable',
  ),
  api(
    'import { report } from "node:process";\nreport.triggerReport();',
    "process.report.triggerReport",
    '"process.report.writeReport()"',
  ),
];

const viaReexport = [
  api('export { tmpDir } from "node:os";', "os.tmpDir", '"os.tmpdir()"'),
  api('export { isError as isFailure } from "util";', "util.isError"),
  legacyModule('export { create } from "node:domain";', "domain"),
  legacyModule('export * from "node:domain";', "domain"),
  legacyModule('export * as idna from "punycode";', "punycode", 'the "punycode" package from npm'),
];

const viaDynamicImport = [
  api('const { inspect, isFunction } = await import("node:util");', "util.isFunction"),
  api('const os = await import("os");\nconst scratch = os.tmpDir();', "os.tmpDir", '"os.tmpdir()"'),
  legacyModule('const sandbox = await import("node:domain");', "domain"),
  legacyModule('import("domain").then((sandbox) => sandbox.create());', "domain"),
];

const viaBuiltinModule = [
  api(
    'const buffers = process.getBuiltinModule("node:buffer");\nconst chunk = buffers.Buffer(payload);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'import process from "node:process";\nconst { Buffer } = process.getBuiltinModule("buffer");\nconst chunk = Buffer(payload);',
    "buffer.Buffer()",
    BUFFER_FACTORIES,
  ),
  api(
    'import process from "node:process";\nconst load = process.getBuiltinModule("module").createRequireFromPath(entry);',
    "module.createRequireFromPath",
    '"module.createRequire()"',
  ),
  api(
    'const scratch = globalThis.process.getBuiltinModule("node:os").tmpDir();',
    "os.tmpDir",
    '"os.tmpdir()"',
  ),
  legacyModule('const sandbox = process.getBuiltinModule("domain");', "domain"),
];

const viaGlobal = [
  api("const header = Buffer(4);", "Buffer()", BUFFER_FACTORIES),
  api("const appName = GLOBAL.appName;", "GLOBAL", '"globalThis"'),
  api("const settings = root.settings;", "root", '"globalThis"'),
  {
    ...api("const config = root.config;", "root", '"globalThis"'),
    languageOptions: { globals: { root: "readonly" } },
  },
  api("const Segmenter = Intl.v8BreakIterator;", "Intl.v8BreakIterator", '"Intl.Segmenter"'),
  api(
    'const words = new globalThis.Intl.v8BreakIterator("en", { type: "word" });',
    "Intl.v8BreakIterator",
    '"Intl.Segmenter"',
  ),
  api("COUNTER_HTTP_SERVER_REQUEST();", "COUNTER_HTTP_SERVER_REQUEST"),
  api(
    "if (typeof COUNTER_NET_SERVER_CONNECTION_CLOSE === 'function') {}",
    "COUNTER_NET_SERVER_CONNECTION_CLOSE",
  ),
  api('const natives = process.binding("natives");', "process.binding"),
  api('const ttyBinding = window.process.binding("tty");', "process.binding"),
  api(
    "class Worker extends process.EventEmitter {}",
    "process.EventEmitter",
    'the "node:events" module',
  ),
  api(
    "const historyPath = process.env.NODE_REPL_HISTORY_FILE ?? defaultHistory;",
    "process.env.NODE_REPL_HISTORY_FILE",
    'the "NODE_REPL_HISTORY" variable',
  ),
  api(
    "process.report.triggerReport();",
    "process.report.triggerReport",
    '"process.report.writeReport()"',
  ),
  api(
    "const diagnostics = verbose ? process.env : process.report;\ndiagnostics.triggerReport();",
    "process.report.triggerReport",
    '"process.report.writeReport()"',
  ),
  api(
    "const diagnostics = verbose ? process.report : process.env;\ndiagnostics.triggerReport();",
    "process.report.triggerReport",
    '"process.report.writeReport()"',
  ),
];

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-deprecated-node-apis",
  noDeprecatedNodeApis,
  {
    invalid: [
      ...viaRequire,
      ...viaImport,
      ...viaReexport,
      ...viaDynamicImport,
      ...viaBuiltinModule,
      ...viaGlobal,
    ],
    valid: [
      'const { Buffer } = require("node:buffer");',
      'const encode = (text) => require("buffer").Buffer.from(text);',
      'register(require("buffer").Buffer);',
      'const chunk = new (require("node:buffer").Buffer)(16);',
      'const chunk = new (require("buffer-polyfill").Buffer)(16);',
      'import { Buffer } from "buffer-polyfill";\nconst chunk = Buffer(16);',
      'const http = require("http");\nconst upload = http.request(uploadUrl);',
      'const { request } = require("node:http");\nrequest(uploadUrl);',
      'const transport = (secure ? require("https") : require("http")).request(target);',
      "const client = require(transportName).createClient(port);",
      'const { request } = getBuiltinModule("http");',
      'const found = require("node:fs").existsSync(manifestPath);',
      'require("node:fs").exists(manifestPath, onResult);',
      'require("fs").lchmod(scriptPath, 0o755, onDone);',
      'const { fips } = require("crypto");',
      'import { parse } from "node:url";\nconst parts = parse(requestUrl);',
      'import { isArray } from "node:util";',
      'import util from "node:util";\nconst log = util.debug("uploads");',
      'process.assert(invoice.total > 0, "empty invoice");',
      'delete require.extensions[".coffee"];',
      'require("domain/index.js");',
      'import sandbox from "domain/";',
      'loadedFs = require("fs");',
      'let fs = fs || require("node:fs");',
      'const { listenerCount } = require("events");',
      'const watchers = require("events").EventEmitter.listenerCount(drawer, "open");',
      'const target = require("url").resolve("/orders/", "42");',
      'const shell = new (require("repl").REPLServer)({ prompt: "$ " });',
      'const gzip = new (require("zlib").Gzip)();',
      'import { stripVTControlCharacters } from "node:util";',
      'import type { Domain } from "node:domain";',
      'import { type SlowBuffer } from "node:buffer";',
      'export type { Domain } from "node:domain";',
      'export * from "node:util";',
      'import process from "node:process";\nprocess.exitCode = 1;',
      'import { Buffer } from "node:buffer";\nconst chunk = Buffer.alloc(32);',
      "const chunk = new Buffer(32);",
      'const process = createSandbox();\nprocess.binding("fs");',
      "function encode(Buffer) {\n  return Buffer(4);\n}",
      "Buffer = class {};\nconst header = Buffer(4);",
      'process = loadSandbox();\nprocess.binding("fs");',
      'let buffers = require("node:buffer");\nbuffers = buffers;',
      'worker.process.binding("fs");',
      "function load(require) {\n  return require('domain');\n}",
      'import * as util from "node:util";\nutil.inspect(order);',
      "const page = window.location.href;",
      "if (typeof process === 'undefined') {}",
    ],
  },
);
