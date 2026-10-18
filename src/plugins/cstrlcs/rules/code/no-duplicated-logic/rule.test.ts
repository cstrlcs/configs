import { RuleTester } from "oxlint/plugins-dev";

import { noDuplicatedLogic } from "./rule.ts";

const TOTAL =
  "{\n  const subtotal = sumLines(order.lines);\n  const tax = subtotal * order.taxRate;\n  return subtotal + tax;\n}";

const SAVE = "{\n  draft.updatedAt = now();\n  store.write(draft);\n  return draft.id;\n}";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "no-duplicated-logic",
  noDuplicatedLogic,
  {
    invalid: [
      {
        code: `function invoiceTotal(order) ${TOTAL}\n\nfunction quoteTotal(order) ${TOTAL}`,
        errors: [{ data: { line: 1 }, line: 7, messageId: "identicalFunction" }],
      },
      {
        code: `const totalOf = (order) => ${TOTAL};\nfunction cartTotal(order) ${TOTAL}\nconst legacyTotal = function (order) ${TOTAL};\nexport async function remoteTotal(order) ${TOTAL}`,
        errors: [
          { data: { line: 1 }, line: 6, messageId: "identicalFunction" },
          { data: { line: 1 }, line: 11, messageId: "identicalFunction" },
          { data: { line: 1 }, line: 16, messageId: "identicalFunction" },
        ],
      },
      {
        code: `class Checkout {\n  static from(order) ${TOTAL}\n  get total() ${TOTAL}\n  set total(order) ${TOTAL}\n  constructor(order) ${TOTAL}\n  compute = (order) => ${TOTAL};\n}`,
        errors: [
          { data: { line: 2 }, line: 7, messageId: "identicalFunction" },
          { data: { line: 2 }, line: 12, messageId: "identicalFunction" },
          { data: { line: 2 }, line: 17, messageId: "identicalFunction" },
          { data: { line: 2 }, line: 22, messageId: "identicalFunction" },
        ],
      },
      {
        code: `export default {\n  beforeSave: (draft) => ${SAVE},\n  onBlur(draft) ${SAVE},\n};`,
        errors: [{ data: { line: 2 }, line: 7, messageId: "identicalFunction" }],
      },
      {
        code: "function clamp(low, high) {\n  low = Math.max(low, 0); high = Math.min(high, 100); return {\n    low, high\n  };\n}\nfunction bound(low, high) {\n  low = Math.max(low, 0); high = Math.min(high, 100); return {\n    low, high\n  };\n}",
        errors: [{ data: { line: 1 }, line: 6, messageId: "identicalFunction" }],
      },
      {
        code: "function parseConfig(text) {\n  try {\n    return JSON.parse(text);\n  } catch {\n    return defaults;\n  }\n}\nfunction readSettings(text) {\n  try {\n    return JSON.parse(text);\n  } catch {\n    return defaults;\n  }\n}",
        errors: [{ data: { line: 1 }, line: 8, messageId: "identicalFunction" }],
      },
      {
        code: 'if (session.expired) {\n  cache.clear();\n  redirect("/login");\n} else {\n  cache.clear();\n  redirect("/login");\n}',
        errors: [{ data: { kind: "if" }, messageId: "identicalBranches" }],
      },
      {
        code: "if (isAdmin) { openPanel(); } else { openPanel(); }",
        errors: [{ data: { kind: "if" }, messageId: "identicalBranches" }],
      },
      {
        code: "if (upload.done) { notify(upload); } else if (upload.failed) { notify(upload); } else { notify(upload); }",
        errors: [{ data: { kind: "if" }, messageId: "identicalBranches" }],
      },
      {
        code: "if (drawer.open) { drawer.focus(); } else drawer.focus();",
        errors: [{ data: { kind: "if" }, messageId: "identicalBranches" }],
      },
      {
        code: "if (invoice.paid) {\n  archive(invoice);\n  sendReceipt(invoice);\n} else if (invoice.voided) {\n  archive(invoice);\n  sendReceipt(invoice);\n}",
        errors: [{ data: { kind: "branch", line: 1 }, line: 4, messageId: "duplicatedBranch" }],
      },
      {
        code: "if (order.priority) {\n  reserve(order);\n  ship(order);\n} else if (order.backorder) {\n  wait(order);\n  ship(order);\n} else {\n  reserve(order);\n  ship(order);\n}",
        errors: [{ data: { kind: "branch", line: 1 }, line: 7, messageId: "duplicatedBranch" }],
      },
      {
        code: 'if (level === "debug") {\n  write(entry);\n} else if (level === "info") {\n  write(entry);\n} else if (level === "warn") {\n  write(entry);\n}',
        errors: [
          { data: { kind: "branch", line: 1 }, line: 3, messageId: "duplicatedBranch" },
          { data: { kind: "branch", line: 3 }, line: 5, messageId: "duplicatedBranch" },
        ],
      },
      {
        code: 'switch (theme) {\n  case "dark":\n    applyPalette(base);\n    persist(theme);\n    break;\n  default:\n    applyPalette(base);\n    persist(theme);\n}',
        errors: [{ data: { kind: "switch" }, line: 1, messageId: "identicalBranches" }],
      },
      {
        code: 'switch (event.key) {\n  case "Enter":\n    submit(form);\n    break;\n  case " ":\n    submit(form);\n    break;\n  default:\n    submit(form);\n}',
        errors: [{ data: { kind: "switch" }, messageId: "identicalBranches" }],
      },
      {
        code: 'switch (role) {\n  case "owner":\n  case "admin":\n    grant(user);\n    break;\n  case "editor":\n    grant(user);\n    break;\n  default:\n    grant(user);\n}',
        errors: [{ data: { kind: "switch" }, messageId: "identicalBranches" }],
      },
      {
        code: 'function pick(mode) {\n  switch (mode) {\n    case "fast":\n      return speedPlan(mode);\n    default:\n      return speedPlan(mode);\n  }\n}',
        errors: [{ data: { kind: "switch" }, messageId: "identicalBranches" }],
      },
      {
        code: "switch (response.status) {\n  case 401:\n    throw new AuthError(response);\n  default:\n    throw new AuthError(response);\n}",
        errors: [{ data: { kind: "switch" }, messageId: "identicalBranches" }],
      },
      {
        code: 'for (const job of queue) {\n  switch (job.kind) {\n    case "email":\n      skip(job);\n      continue;\n    default:\n      skip(job);\n      continue;\n  }\n}',
        errors: [{ data: { kind: "switch" }, messageId: "identicalBranches" }],
      },
      {
        code: 'switch (format) {\n  case "csv":\n  case "tsv":\n    rows = split(text);\n    render(rows);\n    break;\n  case "txt":\n    rows = split(text);\n    render(rows);\n    break;\n}',
        errors: [{ data: { kind: "case", line: 3 }, line: 7, messageId: "duplicatedBranch" }],
      },
      {
        code: 'switch (tab) {\n  case "inbox":\n    load(tab);\n    break;\n  case "sent":\n    load(tab);\n    break;\n}',
        errors: [{ data: { kind: "case", line: 2 }, line: 5, messageId: "duplicatedBranch" }],
      },
      {
        code: 'switch (size) {\n  case "s":\n    padding = 4;\n    margin = 4;\n    break;\n  case "m":\n    padding = 8;\n    break;\n  case "l":\n    padding = 4;\n    margin = 4;\n    break;\n}',
        errors: [{ data: { kind: "case", line: 2 }, line: 9, messageId: "duplicatedBranch" }],
      },
      {
        code: 'switch (step) {\n  case "cart": {\n    validate(cart);\n    advance(cart);\n    break;\n  }\n  case "payment": {\n    charge(cart);\n    break;\n  }\n  default: {\n    validate(cart);\n    advance(cart);\n  }\n}',
        errors: [{ data: { kind: "case", line: 2 }, line: 11, messageId: "duplicatedBranch" }],
      },
      {
        code: 'switch (region) {\n  case "eu":\n    currency = "EUR";\n    vat = true;\n    break;\n  case "fr":\n    currency = "EUR";\n    vat = true;\n    break;\n  case "de":\n    currency = "EUR";\n    vat = true;\n    break;\n}',
        errors: [
          { data: { kind: "case", line: 2 }, line: 6, messageId: "duplicatedBranch" },
          { data: { kind: "case", line: 6 }, line: 10, messageId: "duplicatedBranch" },
        ],
      },
      {
        code: 'switch (plan) {\n  case "pro":\n    enable(features);\n    bill(account);\n    break;\n  case "team":\n    enable(features);\n    bill(account);\n    break;\n  default:\n    trial(account);\n}',
        errors: [{ data: { kind: "case", line: 2 }, line: 6, messageId: "duplicatedBranch" }],
      },
      {
        code: "const label = compact ? title : title;",
        errors: [{ messageId: "identicalTernary" }],
      },
      {
        code: "const delay = retrying ? backoff(attempt) : backoff(attempt);",
        errors: [{ messageId: "identicalTernary" }],
      },
      {
        code: "const ratio = 0.25 / 0.25;",
        errors: [{ data: { operator: "/" }, messageId: "identicalOperands" }],
      },
      {
        code: "const mask = 3 << 3;",
        errors: [{ data: { operator: "<<" }, messageId: "identicalOperands" }],
      },
      {
        code: "const change = prices[2] - prices[2];",
        errors: [{ data: { operator: "-" }, messageId: "identicalOperands" }],
      },
      {
        code: "const visible = (expanded ? rows : preview) && (expanded ? rows : preview);",
        errors: [{ data: { operator: "&&" }, messageId: "identicalOperands" }],
      },
      {
        code: "const tags = [label] || [/* saved */ label];",
        errors: [{ data: { operator: "||" }, messageId: "identicalOperands" }],
      },
      ...["/", "-", "%", "<<", ">>", ">>>", "&", "|", "^", "??"].map((operator) => ({
        code: `const remaining = stock ${operator} stock;`,
        errors: [{ data: { operator }, messageId: "identicalOperands" }],
      })),
    ],
    valid: [
      `function invoiceTotal(order) ${TOTAL}\nitems.reduce(function (order) ${TOTAL});\nwatch(() => ${TOTAL});`,
      "function invoiceTotal(order) {\n  const subtotal = sumLines(order.lines);\n  const tax = subtotal * order.taxRate;\n  return subtotal + tax;\n}\nfunction quoteTotal(order) {\n  if (order.taxable) {\n    const subtotal = sumLines(order.lines);\n  }\n  return subtotal + tax;\n}",
      "function openDrawer() {\n  drawer.show();\n  return drawer;\n}\nfunction openModal() {\n  drawer.show();\n  return drawer;\n}",
      "const pair = (left, right) => {\n  [\n    left,\n    right\n  ]\n};\nconst tuple = (left, right) => (\n  [\n    left,\n    right\n  ]\n);",
      "declare function format(input: Date): string;\ndeclare function format(input: number): string;",
      'if (legacy) {\n  emit("v1");\n  emit("done");\n} else {\n  emit("v2");\n  emit("done");\n}',
      "if (reverse) {\n  lock(file);\n  flush(file);\n} else {\n  flush(file);\n  lock(file);\n}",
      "if (verbose) {\n  trace(request);\n  log(request);\n} else {\n  trace(request);\n}",
      'if (status === "queued") {\n  poll(job);\n} else if (status === "running") {\n  watch(job);\n} else {\n  poll(job);\n}',
      "if (cold) { heat(room); } else if (hot) { cool(room); } else { heat(room); }",
      "if (mobile) { shrink(); hide(); } else if (tablet) { shrink(); hide(); } else { shrink(); show(); }",
      "if (empty) {\n  return <span>Nothing yet</span>;\n} else {\n  return <span>{count} items</span>;\n}",
      "if (online) {\n  if (stale) {\n    refresh(feed);\n  }\n} else if (cached) {\n  restore(feed);\n}",
      'function badge(user) {\n  switch (user.tier) {\n    case "gold":\n      return star(user);\n    default:\n      return dot(user);\n  }\n}',
      'switch (direction) {\n  case "up": {\n    break;\n  }\n  case "down": {\n    break;\n  }\n}',
      'switch (unit) {\n  case "km":\n    scale(distance);\n    round(distance);\n    break;\n  default:\n    round(distance);\n    scale(distance);\n}',
      'switch (channel) {\n  case "sms":\n    queue(message);\n    break;\n  case "push":\n    queue(message);\n    break;\n  default:\n}',
      'switch (filter) {\n  case "all":\n    reset(list);\n    break;\n  case "done":\n    prune(list);\n    break;\n  default:\n    reset(list);\n}',
      'switch (stage) {\n  case "draft":\n    save(post);\n  default:\n    save(post);\n}',
      'switch (stage) {\n  case "draft":\n    save(post);\n  case "review":\n    save(post);\n}',
      "const label = compact ? shortTitle : title;",
      "const flag = 1 << 1;",
      "const wide = 1n << 1n;",
      "const doubled = width + width;",
      "const area = side * side;",
      "const isNumber = amount === amount;",
      "const grows = count > count;",
      "const ready = loaded && loaded;",
      "const busy = queue.pending || queue.pending;",
      "const same = (left === right) && (left === right);",
      "const sameKind = Shape instanceof Shape;",
      "const finished = task.isDone() && task.isDone();",
      "const pair = this.consume(COMMA) && this.consume(COMMA);",
      "const jitter = Math.random() - Math.random();",
      "const token = nextToken() ?? nextToken();",
      "const elapsed = new Date() - new Date();",
      "const gap = samples[cursor++] - samples[cursor++];",
      "async function speed() {\n  return (await tick()) / (await tick());\n}",
      "const dialect = parse(`sql`) || parse(`csv`);",
      'const isFinal = status === "paid" || status === "refunded";',
      'const isWord = token.kind === "keyword" || token.kind === "identifier";',
      String.raw`const port = host.match(/:\d{4}$/) || host.match(/:\d{2}$/);`,
    ],
  },
);
