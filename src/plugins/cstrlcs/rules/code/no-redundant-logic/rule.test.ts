import { RuleTester } from "oxlint/plugins-dev";

import { noRedundantLogic } from "./rule.ts";

function inverted(operator: string, output: string) {
  return {
    errors: [{ data: { operator }, messageId: "invertedComparison" }],
    output,
  };
}

function suggestedInversion(operator: string, output: string) {
  return {
    errors: [
      {
        data: { operator },
        messageId: "invertedComparison",
        suggestions: [{ data: { operator }, messageId: "invertComparison", output }],
      },
    ],
    output: null,
  };
}

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-redundant-logic",
  noRedundantLogic,
  {
    invalid: [
      {
        code: "while (!(cursor == end)) advance();",
        ...inverted("!=", "while (cursor != end) advance();"),
      },
      {
        code: 'const pending = !(order.state != "paid");',
        ...inverted("==", 'const pending = order.state == "paid";'),
      },
      {
        code: "assert(!(session.user === guest));",
        ...inverted("!==", "assert(session.user !== guest);"),
      },
      {
        code: "if (!(locale !== DEFAULT_LOCALE)) translate();",
        ...inverted("===", "if (locale === DEFAULT_LOCALE) translate();"),
      },
      {
        code: "const icon = !(status != 200) ? okIcon : errorIcon;",
        ...inverted("==", "const icon = status == 200 ? okIcon : errorIcon;"),
      },
      {
        code: 'const retained = !(plan.tier === "free");',
        ...inverted("!==", 'const retained = plan.tier !== "free";'),
      },
      {
        code: 'toggle(!(drawer.side === "left"));',
        ...inverted("!==", 'toggle(drawer.side !== "left");'),
      },
      {
        code: "const isForeign = !!(invoice.currency === home);",
        ...inverted("!==", "const isForeign = !(invoice.currency !== home);"),
      },
      {
        code: "const score = bonus + !(answer === expected);",
        ...inverted("!==", "const score = bonus + (answer !== expected);"),
      },
      {
        code: "const label = (!(page === last)).toString();",
        ...inverted("!==", "const label = (page !== last).toString();"),
      },
      {
        code: "const stale = !((cached ? cached.etag : null) === etag);",
        ...inverted("!==", "const stale = (cached ? cached.etag : null) !== etag;"),
      },
      {
        code: "const moved = !(origin /* before drag */ === target);",
        ...inverted("!==", "const moved = origin /* before drag */ !== target;"),
      },
      {
        code: "const overdue = !(dueDate > today);",
        ...suggestedInversion("<=", "const overdue = dueDate <= today;"),
      },
      {
        code: "if (!(attempts < limit)) giveUp();",
        ...suggestedInversion(">=", "if (attempts >= limit) giveUp();"),
      },
      {
        code: "const empty = !(cart.size >= 1);",
        ...suggestedInversion("<", "const empty = cart.size < 1;"),
      },
      {
        code: "do retry(); while (!(elapsed <= timeout));",
        ...suggestedInversion(">", "do retry(); while (elapsed > timeout);"),
      },
      {
        code: "const tooSmall = !(width <= 320);",
        ...suggestedInversion(">", "const tooSmall = width > 320;"),
      },
      {
        code: "const fits = !!(height < viewport);",
        ...suggestedInversion(">=", "const fits = !(height >= viewport);"),
      },
      {
        code: "const moved = !(/* before drag */ origin === target);",
        errors: [{ data: { operator: "!==" }, messageId: "invertedComparison" }],
        output: null,
      },
      {
        code: "function isLocked(file) {\n  if (!file.writable) {\n    return true;\n  } else {\n    return false;\n  }\n}",
        errors: [{ messageId: "singleBooleanReturn" }],
        output: "function isLocked(file) {\n  return !file.writable;\n}",
      },
      {
        code: "function hasUnread(inbox) {\n  if (inbox.unread.length > 0) {\n    return true;\n  }\n\n  return false;\n}",
        errors: [{ messageId: "singleBooleanReturn" }],
        output: "function hasUnread(inbox) {\n  return inbox.unread.length > 0;\n}",
      },
      {
        code: "function isEmptyCart(cart) {\n  if (cart.total() > 0) {\n    return false;\n  } else {\n    return true;\n  }\n}",
        errors: [{ messageId: "singleBooleanReturn" }],
        output: "function isEmptyCart(cart) {\n  return !(cart.total() > 0);\n}",
      },
      {
        code: "function changed(previous, next) {\n  if (previous === next) {\n    return false;\n  }\n\n  return true;\n}",
        errors: [{ messageId: "singleBooleanReturn" }],
        output: "function changed(previous, next) {\n  return previous !== next;\n}",
      },
      {
        code: "function canRetry(upload) {\n  if (upload.isFinal()) {\n    return false;\n  } else {\n    return true;\n  }\n}",
        errors: [{ messageId: "singleBooleanReturn" }],
        output: "function canRetry(upload) {\n  return !upload.isFinal();\n}",
      },
      {
        code: "function hasOwner(record) {\n  if (!record.owner) return false;\n  return true;\n}",
        errors: [{ messageId: "singleBooleanReturn" }],
        output: "function hasOwner(record) {\n  return Boolean(record.owner);\n}",
      },
      {
        code: "function isBefore(start, end) {\n  if (!(start < end)) return false;\n  return true;\n}",
        errors: [
          { messageId: "singleBooleanReturn" },
          {
            messageId: "invertedComparison",
            suggestions: [
              {
                data: { operator: ">=" },
                messageId: "invertComparison",
                output:
                  "function isBefore(start, end) {\n  if (start >= end) return false;\n  return true;\n}",
              },
            ],
          },
        ],
        output: "function isBefore(start, end) {\n  return start < end;\n}",
      },
      {
        code: "function isVisible(panel) {\n  if (panel.shown) return true;\n  else return false;\n}",
        errors: [
          {
            messageId: "singleBooleanReturn",
            suggestions: [
              {
                messageId: "returnBoolean",
                output: "function isVisible(panel) {\n  return Boolean(panel.shown);\n}",
              },
              {
                messageId: "returnCondition",
                output: "function isVisible(panel) {\n  return panel.shown;\n}",
              },
            ],
          },
        ],
        output: null,
      },
      {
        code: "function access(user) {\n  if (user.admin) {\n    if (user.active) {\n      return true\n    }\n    return false\n  }\n\n  if (user.guest) {\n    if (user.verified) {\n      return false\n    }\n    return true\n  }\n\n  if (user.banned) {\n    if (user.appealed) {\n      return false\n    }\n  }\n}",
        errors: [
          {
            messageId: "singleBooleanReturn",
            suggestions: [
              {
                messageId: "returnBoolean",
                output:
                  "function access(user) {\n  if (user.admin) {\n    return Boolean(user.active);\n  }\n\n  if (user.guest) {\n    if (user.verified) {\n      return false\n    }\n    return true\n  }\n\n  if (user.banned) {\n    if (user.appealed) {\n      return false\n    }\n  }\n}",
              },
              {
                messageId: "returnCondition",
                output:
                  "function access(user) {\n  if (user.admin) {\n    return user.active;\n  }\n\n  if (user.guest) {\n    if (user.verified) {\n      return false\n    }\n    return true\n  }\n\n  if (user.banned) {\n    if (user.appealed) {\n      return false\n    }\n  }\n}",
              },
            ],
          },
          { messageId: "singleBooleanReturn" },
        ],
        output:
          "function access(user) {\n  if (user.admin) {\n    if (user.active) {\n      return true\n    }\n    return false\n  }\n\n  if (user.guest) {\n    return !user.verified;\n  }\n\n  if (user.banned) {\n    if (user.appealed) {\n      return false\n    }\n  }\n}",
      },
      {
        code: "function shouldSync(device) {\n  if (device.online()) {\n    if (device.charging()) {\n      return true;\n    } else {\n      return false;\n    }\n  }\n\n  return device.forced();\n}",
        errors: [
          {
            messageId: "singleBooleanReturn",
            suggestions: [
              {
                messageId: "returnBoolean",
                output:
                  "function shouldSync(device) {\n  if (device.online()) {\n    return Boolean(device.charging());\n  }\n\n  return device.forced();\n}",
              },
              {
                messageId: "returnCondition",
                output:
                  "function shouldSync(device) {\n  if (device.online()) {\n    return device.charging();\n  }\n\n  return device.forced();\n}",
              },
            ],
          },
        ],
        output: null,
      },
      {
        code: 'function allowed(action) {\n  switch (action.kind) {\n    case "read":\n      if (action.scope === "public") return true;\n      return false;\n  }\n}',
        errors: [{ messageId: "singleBooleanReturn" }],
        output:
          'function allowed(action) {\n  switch (action.kind) {\n    case "read":\n      return action.scope === "public";\n  }\n}',
      },
      {
        code: "function isDraft(post) {\n  if (post.publishedAt === null) {\n    // drafts never expire\n    return false;\n  } else {\n    return true;\n  }\n}",
        errors: [{ messageId: "singleBooleanReturn" }],
        output: null,
      },
      {
        code: "function isDraft(post) {\n  if (post.publishedAt === null) {\n    return false;\n  }\n  // published posts are final\n  return true;\n}",
        errors: [{ messageId: "singleBooleanReturn" }],
        output: null,
      },
    ],
    valid: [
      "if (!enabled) disable();",
      "while (queue.length == 0) wait();",
      "const missing = !(offset + 1);",
      "const flag = +(mode == 2);",
      "const tone = !muted ? loud : quiet;",
      "if (!(token in cache)) refresh(token);",
      "if (!(failure instanceof HttpError)) throw failure;",
      "function access(user) {\n  if (user.admin) {\n    return true;\n  } else if (user.guest) {\n    return false;\n  } else {\n    return true;\n  }\n}",
      "function isValid(form) {\n  if (!form.name) {\n    return false;\n  }\n  if (!form.email) {\n    return false;\n  }\n  if (!form.consent) {\n    return false;\n  }\n  return true;\n}",
      "function resolve(config) {\n  if (config.override) {\n    return config.value;\n  } else {\n    return false;\n  }\n}",
      "function either(enabled, fallback) {\n  if (enabled) {\n    return true;\n  } else {\n    return fallback;\n  }\n}",
      "function flush(writer) {\n  if (writer.dirty) {\n    writer.save();\n  } else {\n    return true;\n  }\n}",
      "function commit(tx) {\n  if (tx.valid) {\n    tx.apply();\n    return true;\n  } else {\n    return false;\n  }\n}",
      "function close(stream) {\n  if (stream.closed) {\n    return;\n  } else {\n    return true;\n  }\n}",
      "function ready(app) {\n  if (app.booted) {\n    return true;\n  }\n}",
      "function track(event) {\n  if (event.important) {\n    return send(true);\n  } else {\n    return send(false);\n  }\n}",
      "function parse(input) {\n  if (input.raw) {\n    var buffer;\n  } else {\n    return false;\n  }\n}",
      "function check(input) {\n  if (input.strict) {\n    function validate() {}\n    return false;\n  } else {\n    return true;\n  }\n}",
      "function always(input) {\n  if (input.cached) {\n    return true;\n  } else {\n    return true;\n  }\n}",
      "function verify(input) {\n  if (input.signed) {\n    return true;\n  }\n\n  audit(input);\n\n  return false;\n}",
    ],
  },
);
