import { RuleTester } from "oxlint/plugins-dev";

import { preferModernApis } from "./rule.ts";

function filled(code: string, output: string | null, data: { length: string; value: string }) {
  return { code, errors: [{ data, messageId: "arrayFill" }], output };
}

function forwarded(code: string, output: string, timer = "setTimeout") {
  return { code, errors: [{ data: { timer }, messageId: "timerArguments" }], output };
}

function probed(code: string, suggestion: string | null) {
  const suggestions =
    suggestion === null ? [] : [{ messageId: "useUrlCanParse", output: suggestion }];

  return { code, errors: [{ messageId: "urlCanParse", suggestions }], output: null };
}

const arrayFrom = [
  filled(
    "const seats = Array.from({ length: 12 }, () => false);",
    "const seats = Array.from({ length: 12 }).fill(false);",
    { length: "12", value: "false" },
  ),
  filled(
    'const labels = Array.from({ length: 4 }, () => "pending");',
    'const labels = Array.from({ length: 4 }).fill("pending");',
    { length: "4", value: '"pending"' },
  ),
  filled(
    "const cells = Array.from({ length: rows * columns }, () => 0);",
    "const cells = Array.from({ length: rows * columns }).fill(0);",
    { length: "rows * columns", value: "0" },
  ),
  filled(
    "const totals = Array.from({ length: 7 }, function () {\n  return 0;\n});",
    "const totals = Array.from({ length: 7 }).fill(0);",
    { length: "7", value: "0" },
  ),
  filled(
    "const slots = Array.from({ length }, () => null);",
    "const slots = Array.from({ length }).fill(null);",
    { length: "length", value: "null" },
  ),
  filled(
    "const weeks = Array.from({ length: weekCount }, () => -1);",
    "const weeks = Array.from({ length: weekCount }).fill(-1);",
    { length: "weekCount", value: "-1" },
  ),
  filled(
    "render(Array.from({ length: 3 }, () => placeholder));",
    "render(Array.from({ length: 3 }).fill(placeholder));",
    { length: "3", value: "placeholder" },
  ),
  filled(
    "const margins = Array.from({ length: 4 }, () => gutter * 2);",
    "const margins = Array.from({ length: 4 }).fill(gutter * 2);",
    { length: "4", value: "gutter * 2" },
  ),
  filled(
    "const currencies = Array.from({ length: lineCount }, () => invoice.currency ?? fallbackCurrency);",
    "const currencies = Array.from({ length: lineCount }).fill(invoice.currency ?? fallbackCurrency);",
    { length: "lineCount", value: "invoice.currency ?? fallbackCurrency" },
  ),
  filled(
    'const widths = Array.from({ length: columnCount }, () => (compact ? "8rem" : "12rem"));',
    'const widths = Array.from({ length: columnCount }).fill(compact ? "8rem" : "12rem");',
    { length: "columnCount", value: 'compact ? "8rem" : "12rem"' },
  ),
  filled(
    "const owners = Array.from({ length: 2 }, () => session.user.id);",
    "const owners = Array.from({ length: 2 }).fill(session.user.id);",
    { length: "2", value: "session.user.id" },
  ),
  filled(
    "const statuses = Array.from({ length: 3 }, () => STATUS[active]);",
    "const statuses = Array.from({ length: 3 }).fill(STATUS[active]);",
    { length: "3", value: "STATUS[active]" },
  ),
];

const spreadArray = [
  filled(
    "const stars = [...Array(5)].map(() => 0);",
    "const stars = Array.from({ length: 5 }).fill(0);",
    { length: "5", value: "0" },
  ),
  filled(
    'const steps = [...Array(3)].map(() => "todo");',
    'const steps = Array.from({ length: 3 }).fill("todo");',
    { length: "3", value: '"todo"' },
  ),
  filled(
    "const retries = [...Array(4)].map(function () {\n  return maxDelay;\n});",
    "const retries = Array.from({ length: 4 }).fill(maxDelay);",
    { length: "4", value: "maxDelay" },
  ),
  filled(
    "const lanes = [...new Array(0)].map(() => true);",
    "const lanes = Array.from({ length: 0 }).fill(true);",
    { length: "0", value: "true" },
  ),
  filled(
    "function emptyBoard() {\n  return [...Array(9)].map(() => blank);\n}",
    "function emptyBoard() {\n  return Array.from({ length: 9 }).fill(blank);\n}",
    { length: "9", value: "blank" },
  ),
  filled(
    "const tiers = [...Array(3)].map(() => premium ? gold : silver);",
    "const tiers = Array.from({ length: 3 }).fill(premium ? gold : silver);",
    { length: "3", value: "premium ? gold : silver" },
  ),
  filled("const flags = [...new Array(drawerCount)].map(() => false);", null, {
    length: "drawerCount",
    value: "false",
  }),
  filled('const pages = [...Array("3")].map(() => 0);', null, { length: '"3"', value: "0" }),
  filled("const halves = [...Array(1.5)].map(() => 0);", null, { length: "1.5", value: "0" }),
  filled("const nothing = [...Array(-1)].map(() => 0);", null, { length: "-1", value: "0" }),
  {
    code: "const grid = Array.from({ length: 8 }, () => 0);\nconst header = [...Array(8)].map(() => title);",
    errors: [
      { data: { length: "8", value: "0" }, messageId: "arrayFill" },
      { data: { length: "8", value: "title" }, messageId: "arrayFill" },
    ],
    output:
      "const grid = Array.from({ length: 8 }).fill(0);\nconst header = Array.from({ length: 8 }).fill(title);",
  },
];

const arrowTimers = [
  forwarded(
    'import { closeDrawer, drawer } from "./drawer.ts";\nsetTimeout(() => closeDrawer(drawer, "smooth"), 300);',
    'import { closeDrawer, drawer } from "./drawer.ts";\nsetTimeout(closeDrawer, 300, drawer, "smooth");',
  ),
  forwarded(
    'import { flushQueue } from "./queue.ts";\nsetTimeout(() => flushQueue(), 0);',
    'import { flushQueue } from "./queue.ts";\nsetTimeout(flushQueue, 0);',
  ),
  forwarded(
    'import { retryUpload, upload, attempt, backoff } from "./uploads.ts";\nsetTimeout(() => retryUpload(upload, attempt + 1, backoff * 2), 1500);',
    'import { retryUpload, upload, attempt, backoff } from "./uploads.ts";\nsetTimeout(retryUpload, 1500, upload, attempt + 1, backoff * 2);',
  ),
  forwarded(
    `import { track, orderId } from "./analytics.ts";\nsetTimeout(() => track(\`order-\${orderId}\`, !orderId), 50);`,
    `import { track, orderId } from "./analytics.ts";\nsetTimeout(track, 50, \`order-\${orderId}\`, !orderId);`,
  ),
  forwarded(
    'import { expire, session } from "./sessions.ts";\nconst expiry = setTimeout(() => expire(session), 60_000);',
    'import { expire, session } from "./sessions.ts";\nconst expiry = setTimeout(expire, 60_000, session);',
  ),
  forwarded(
    "function scheduleReminder(invoiceId: string) {\n  const remind = (id: string) => id;\n\n  setTimeout(() => remind(invoiceId), 86_400_000);\n}",
    "function scheduleReminder(invoiceId: string) {\n  const remind = (id: string) => id;\n\n  setTimeout(remind, 86_400_000, invoiceId);\n}",
  ),
  forwarded(
    "setTimeout(() => announce(3), 10);\nfunction announce(count: number) {\n  return count;\n}",
    "setTimeout(announce, 10, 3);\nfunction announce(count: number) {\n  return count;\n}",
  ),
  forwarded(
    'setTimeout(() => persist(cart), 500);\nimport { cart, persist } from "./cart.ts";',
    'setTimeout(persist, 500, cart);\nimport { cart, persist } from "./cart.ts";',
  ),
  {
    code: 'import { hideToast, showToast, toast } from "./toast.ts";\nsetTimeout(() => showToast(toast), 0);\nsetTimeout(() => hideToast(toast, true), 4000);',
    errors: [
      { data: { timer: "setTimeout" }, messageId: "timerArguments" },
      { data: { timer: "setTimeout" }, messageId: "timerArguments" },
    ],
    output:
      'import { hideToast, showToast, toast } from "./toast.ts";\nsetTimeout(showToast, 0, toast);\nsetTimeout(hideToast, 4000, toast, true);',
  },
  forwarded(
    'import { pollStatus, jobId } from "./jobs.ts";\nsetInterval(() => pollStatus(jobId), 2000);',
    'import { pollStatus, jobId } from "./jobs.ts";\nsetInterval(pollStatus, 2000, jobId);',
    "setInterval",
  ),
  forwarded(
    'import { redraw, canvas } from "./canvas.ts";\nwindow.setTimeout(() => redraw(canvas), 16);',
    'import { redraw, canvas } from "./canvas.ts";\nwindow.setTimeout(redraw, 16, canvas);',
  ),
  forwarded(
    'import { refreshToken } from "./auth.ts";\nwindow.setTimeout(() => refreshToken(), 30_000);',
    'import { refreshToken } from "./auth.ts";\nwindow.setTimeout(refreshToken, 30_000);',
  ),
  forwarded(
    'import { syncInbox, account } from "./mail.ts";\nwindow.setInterval(() => syncInbox(account), 60_000);',
    'import { syncInbox, account } from "./mail.ts";\nwindow.setInterval(syncInbox, 60_000, account);',
    "setInterval",
  ),
  forwarded(
    'import { reconnect, socket, attempts } from "./socket.ts";\nglobalThis.setTimeout(() => reconnect(socket, attempts), 1000);',
    'import { reconnect, socket, attempts } from "./socket.ts";\nglobalThis.setTimeout(reconnect, 1000, socket, attempts);',
  ),
  forwarded(
    'import { heartbeat, worker } from "./worker.ts";\nglobalThis.setInterval(() => heartbeat(worker), 5000);',
    'import { heartbeat, worker } from "./worker.ts";\nglobalThis.setInterval(heartbeat, 5000, worker);',
    "setInterval",
  ),
];

const boundTimers = [
  forwarded(
    "setTimeout(closeDrawer.bind(null, drawer, true), 250);",
    "setTimeout(closeDrawer, 250, drawer, true);",
  ),
  forwarded(
    "setTimeout(markRead.bind(undefined, message), 800);",
    "setTimeout(markRead, 800, message);",
  ),
  forwarded("setTimeout(flushLogs.bind(undefined), 0);", "setTimeout(flushLogs, 0);"),
  forwarded(
    "setTimeout(billing.chargeCard.bind(null, invoice), 100);",
    "setTimeout(billing.chargeCard, 100, invoice);",
  ),
  forwarded(
    "setTimeout(this.saveDraft.bind(null, draft), 1000);",
    "setTimeout(this.saveDraft, 1000, draft);",
  ),
  forwarded(
    "setTimeout(notifyAll.bind(null, ...recipients), 10);",
    "setTimeout(notifyAll, 10, ...recipients);",
  ),
  forwarded(
    "const pending = setTimeout(onUpload.bind(null, file, progress), 0);",
    "const pending = setTimeout(onUpload, 0, file, progress);",
  ),
  forwarded(
    "window.setTimeout(openModal.bind(null, modal, focusTarget), 200);",
    "window.setTimeout(openModal, 200, modal, focusTarget);",
  ),
  forwarded(
    "window.setTimeout(trackView.bind(undefined, page), 0);",
    "window.setTimeout(trackView, 0, page);",
  ),
  forwarded(
    "globalThis.setTimeout(retry.bind(null, request, 3), 750);",
    "globalThis.setTimeout(retry, 750, request, 3);",
  ),
  forwarded(
    "setInterval(rotateBanner.bind(null, banner, 1), 7000);",
    "setInterval(rotateBanner, 7000, banner, 1);",
    "setInterval",
  ),
];

const urlChecks = [
  probed(
    "function isLink(text: string) {\n  try {\n    new URL(text);\n    return true;\n  } catch {\n    return false;\n  }\n}",
    "function isLink(text: string) {\n  return URL.canParse(text);\n}",
  ),
  probed(
    "function isLink(text: string) {\n  try {\n    new URL(text);\n    return true;\n  } catch (error) {\n    return false;\n  }\n}",
    "function isLink(text: string) {\n  return URL.canParse(text);\n}",
  ),
  probed(
    "function isAsset(path: string, origin: string) {\n  try {\n    new URL(path, origin);\n    return true;\n  } catch {\n    return false;\n  }\n}",
    "function isAsset(path: string, origin: string) {\n  return URL.canParse(path, origin);\n}",
  ),
  probed(
    "function nextCandidate() {\n  try {\n    new URL((retries++, candidate));\n    return true;\n  } catch {\n    return false;\n  }\n}",
    "function nextCandidate() {\n  return URL.canParse((retries++, candidate));\n}",
  ),
  probed(
    'function openLink(href: string) {\n  try {\n    new URL(href);\n    analytics.track("link");\n    window.open(href);\n  } catch {\n    toast.error("Broken link");\n  }\n}',
    'function openLink(href: string) {\n  if (URL.canParse(href)) {\n    analytics.track("link");\n    window.open(href);\n  } else {\n    toast.error("Broken link");\n  }\n}',
  ),
  probed(
    "function preview(href: string) {\n  try {\n    new URL(href);\n    showPreview(href);\n  } catch {\n  }\n}",
    "function preview(href: string) {\n  if (URL.canParse(href)) {\n    showPreview(href);\n  }\n}",
  ),
  probed(
    "function saveWebhook(endpoint: string) {\n  try {\n    new URL(endpoint);\n    webhooks.add(endpoint);\n  } catch (error) {\n    logger.warn(error);\n  }\n}",
    null,
  ),
  probed(
    "function isLink(text: string) {\n  try {\n    new URL(text);\n    return true;\n  } catch {\n    return false;\n  } finally {\n    metrics.count();\n  }\n}",
    null,
  ),
];

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "prefer-modern-apis",
  preferModernApis,
  {
    invalid: [...arrayFrom, ...spreadArray, ...arrowTimers, ...boundTimers, ...urlChecks],
    valid: [
      "const seats = Array.from({ length: 12 }).fill(false);",
      "const indexes = Array.from({ length: 6 }, (_, index) => index);",
      "const offsets = Array.from({ length: 6 }, (slot, index) => index * slot);",
      "const pages = [...Array(pageCount)].map((_, page) => page + 1);",
      "const sizes = [...Array(4)].map((size, index) => index * 8);",
      "const weekdays = [1, 2, 3, 4, 5];",
      'const letters = Array.from("drawer");',
      "const holes = Array.from({ length: 3 });",
      "const resets = orders.map(() => 0);",
      "const ids = Array.from({ length: 5 }, () => crypto.randomUUID());",
      "const dice = Array.from({ length: 2 }, () => Math.random());",
      "const names = Array.from({ length: 3 }, function () {\n  return faker.person.firstName();\n});",
      "const stamps = Array.from({ length: 4 }, () => new Date());",
      "const buckets = Array.from({ length: 4 }, () => []);",
      "const tokens = [...Array(3)].map(() => generateToken());",
      "const rolls = [...Array(3)].map(() => Math.random());",
      "const samples = [...Array(3)].map(function () {\n  return Math.random();\n});",
      "const carts = [...Array(2)].map(() => new Cart());",
      "const forms = Array.from({ length: 2 }, () => ({}));",
      "const rows = [...Array(2)].map(() => []);",
      "const fallbacks = Array.from({ length: 3 }, () => cached || loadDefault());",
      "const themes = [...Array(3)].map(() => dark ? loadTheme() : light);",
      "const patterns = Array.from({ length: 2 }, () => /order-[0-9]+/g);",
      "const blanks = Array.from({ length: 2 }, () => undefined);",
      "const tickets = Array.from({ length: 3 }, () => nextTicket++);",
      "const owners = Array.from({ length: 2 }, () => this.owner);",
      "const loads = Array.from({ length: 2 }, async () => 0);",
      "const defaults = { quantity: 1 };\nconst lines = Array.from({ length: 3 }, () => defaults);",
      "const stock = Array.from({ length: 3, step: 2 }, () => 0);",
      "const prices = Array.from({ length: 3 }, () => 0, pricing);",
      "const mixed = [...Array(3), extra].map(() => 0);",
      "const Array = createArrayShim();\nconst flags = Array.from({ length: 3 }, () => false);",
      "function collect() {\n  return Array.from({ length: 3 }, function () {\n    return arguments.length;\n  });\n}",
      "function repeatFirst() {\n  return [...Array(2)].map(function () {\n    return arguments[0];\n  });\n}",
      "setTimeout(flushQueue, 100);",
      "setTimeout(closeDrawer, 300, drawer);",
      "setTimeout(() => {\n  closeDrawer(drawer);\n}, 300);",
      'setTimeout(() => {\n  toast.info("Saved");\n  closeDrawer(drawer);\n}, 300);',
      "setTimeout(() => {\n  return closeDrawer(drawer);\n}, 300);",
      "setTimeout((event) => closeDrawer(event), 300);",
      "setTimeout(function () {\n  closeDrawer(drawer);\n}, 300);",
      "requestAnimationFrame(() => paint(frame));",
      "setTimeout(() => subtotal + tax, 100);",
      "setTimeout(() => cart.total, 100);",
      "setTimeout(closeDrawer.bind(this, drawer), 300);",
      "setTimeout(closeDrawer.bind(drawerStore, drawer), 300);",
      "setTimeout(closeDrawer.bind(), 300);",
      "setTimeout(closeDrawer.call(null, drawer), 300);",
      "setTimeout(closeDrawer.apply(null, drawers), 300);",
      'import { save, draft } from "./drafts.ts";\nsetTimeout(() => save(readEditor()), 1000);',
      'import { save, editor } from "./drafts.ts";\nsetTimeout(() => save(editor.read()), 1000);',
      'import { save, prefix } from "./drafts.ts";\nsetTimeout(() => save(prefix + readEditor()), 1000);',
      'import { save } from "./drafts.ts";\nsetTimeout(() => save([readEditor()]), 1000);',
      'import { save } from "./drafts.ts";\nsetTimeout(() => save({ body: readEditor() }), 1000);',
      "setTimeout(save.bind(null, readEditor()), 1000);",
      'import { save } from "./drafts.ts";\nlet revision = 0;\nsetTimeout(() => save(revision++), 1000);',
      'import { save } from "./drafts.ts";\nlet revision = 3;\nsetTimeout(() => save(--revision), 1000);',
      'import { save, draft } from "./drafts.ts";\nsetTimeout(() => save(delete draft.title), 1000);',
      "setTimeout(save.bind(null, revision++), 1000);",
      `import { save } from "./drafts.ts";\nsetTimeout(() => save(\`\${readEditor()}\`), 1000);`,
      `import { save } from "./drafts.ts";\nlet revision = 0;\nsetTimeout(() => save(\`v\${revision++}\`), 1000);`,
      "window.setTimeout(paint, 16);",
      "window.setTimeout(() => {\n  paint(frame);\n}, 16);",
      "window.setTimeout((frame) => paint(frame), 16);",
      "window.setTimeout(paint.bind(this, frame), 16);",
      "globalThis.setTimeout(reconnect, 1000, socket);",
      "globalThis.setTimeout(() => {\n  reconnect(socket);\n}, 1000);",
      "globalThis.setTimeout(reconnect.bind(this, socket), 1000);",
      "setInterval(pollStatus, 2000);",
      "setInterval(() => {\n  pollStatus(jobId);\n}, 2000);",
      "setInterval((job) => pollStatus(job), 2000);",
      "setInterval(pollStatus.bind(this, jobId), 2000);",
      'import { pollStatus } from "./jobs.ts";\nsetInterval(() => pollStatus(nextJob()), 2000);',
      "window.setInterval(() => {\n  syncInbox(account);\n}, 60_000);",
      "globalThis.setInterval(heartbeat.bind(worker, worker), 5000);",
      "window.setInterval();",
      'import { flushQueue } from "./queue.ts";\nsetTimeout(() => flushQueue());',
      'import { flushQueue, queue } from "./queue.ts";\ndebounce(() => flushQueue(queue), 100);',
      'import { cart } from "./cart.ts";\nsetTimeout(() => cart.persist(), 500);',
      'import { orders, isPaid, toRow } from "./orders.ts";\nsetTimeout(() => orders.filter(isPaid).map(toRow), 500);',
      "setTimeout(() => this.persist(), 500);",
      "setTimeout(() => this.cart.persist(order), 500);",
      'import { persist } from "./cart.ts";\nsetTimeout(() => persist(this.cart), 500);',
      'import { persist, cart, order } from "./cart.ts";\nsetTimeout(() => persist(cart, this.user, order), 500);',
      "setInterval(() => this.refreshPrices(), 30_000);",
      "window.setTimeout(() => this.paint(), 16);",
      'import { notifyAll, recipients } from "./mail.ts";\nsetTimeout(() => notifyAll(...recipients), 10);',
      'import { persist } from "./cart.ts";\nsetTimeout(() => persist({ items: [] }), 500);',
      'import { persist, cart } from "./cart.ts";\nsetTimeout(() => persist(cart.items), 500);',
      'import { highlight } from "./search.ts";\nsetTimeout(() => highlight(/total/g), 500);',
      'import { persist, cart } from "./cart.ts";\nsetTimeout(() => persist(cart), 500, "extra");',
      'import { persist, cart } from "./cart.ts";\nsetTimeout(async () => persist(cart), 500);',
      'import { persist, cart } from "./cart.ts";\nsetTimeout(() => persist?.(cart), 500);',
      'import { persist, cart } from "./cart.ts";\nsetTimeout(() => persist<Cart>(cart), 500);',
      'import { persist } from "./cart.ts";\nlet quantity = 1;\nsetTimeout(() => persist(quantity), 500);\nquantity = 2;',
      'import { persist, archive, cart } from "./cart.ts";\nlet store = persist;\nsetTimeout(() => store(cart), 500);\nstore = archive;',
      'import { persist } from "./cart.ts";\nsetTimeout(() => persist(lateCart), 500);\nconst lateCart = {};',
      "setTimeout(() => notify(order), 100);",
      {
        code: "setTimeout(() => notify(order), 100);",
        languageOptions: { globals: { notify: "readonly", order: "readonly" } },
      },
      'import { setTimeout } from "node:timers/promises";\nimport { persist, cart } from "./cart.ts";\nsetTimeout(() => persist(cart), 500);',
      'function link(text: string) {\n  const url = new URL(text, "https://shop.example");\n  return url.pathname;\n}',
      'try {\n  chargeCard(invoice);\n} catch {\n  toast.error("Payment failed");\n}',
      "function isLink(text: string) {\n  try {\n    trim(text);\n    new URL(text);\n    return true;\n  } catch {\n    return false;\n  }\n}",
      "try {\n  new URL(endpoint);\n} finally {\n  release();\n}",
      "try {\n  new URL(endpoint);\n} catch {\n  rejectEndpoint();\n}",
      "class URL {}\ntry {\n  new URL(endpoint);\n  register(endpoint);\n} catch {\n  rejectEndpoint();\n}",
    ],
  },
);
