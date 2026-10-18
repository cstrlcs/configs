import { RuleTester } from "oxlint/plugins-dev";

import { noInvariantReturns } from "./rule.ts";

function invariant(code: string) {
  return { code, errors: [{ messageId: "invariantReturn" }] };
}

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-invariant-returns",
  noInvariantReturns,
  {
    invalid: [
      invariant(
        "function discount(customer: Customer) {\n  if (customer.vip) {\n    return 15;\n  }\n  return 15;\n}",
      ),
      invariant(
        'function greeting(hour: number) {\n  if (hour < 12) {\n    return "hello";\n  } else if (hour < 18) {\n    return "hello";\n  }\n  return "hello";\n}',
      ),
      invariant('const pickColor = (dark) => { if (dark) { return "#fff"; } return "#fff"; };'),
      invariant(
        'function currency(country: string) {\n  const code = "EUR";\n  if (country === "fr") {\n    return code;\n  }\n  return code;\n}',
      ),
      invariant(
        'function separator(locale: string) {\n  const comma = ",";\n  if (locale === "de") {\n    return ",";\n  }\n  return comma;\n}',
      ),
      invariant(
        "function remaining(seats) {\n  seats -= 1;\n  if (seats <= 0) {\n    return seats;\n  }\n\n  const waitlist = loadWaitlist();\n  return seats;\n}",
      ),
      invariant(
        'function retries(mode: string) {\n  if (mode === "fast") {\n    return 3;\n  }\n  const backoff = (step) => { if (step) { return null; } return ""; };\n  return 3;\n}',
      ),
      {
        code: 'function timeout(mode: string) {\n  if (mode === "slow") {\n    return 30;\n  }\n  const fallback = (step) => { if (step) { return ""; } return ""; };\n  return "";\n}',
        errors: [{ column: 19, line: 5, messageId: "invariantReturn" }],
        output: null,
      },
      invariant(
        'function limit(plan: string) {\n  let max;\n  max = 10;\n  if (plan === "pro") {\n    return max;\n  }\n  return max;\n}',
      ),
      invariant(
        "function parsePort(text: string) {\n  try {\n    throw new RangeError(text);\n  } catch (error) {}\n\n  if (text) {\n    return 8080;\n  }\n  return 8080;\n}",
      ),
      invariant(
        'onReady(function () {\n  const mode = "dark";\n  if (prefersDark) {\n    return mode;\n  }\n  return mode;\n});',
      ),
      invariant("const emptyState = (rows) => { if (rows) { return null; } return null; };"),
      invariant("const canEdit = (role) => { if (role) { return true; } return true; };"),
      invariant("const isHidden = (panel) => { if (panel) { return !true; } return false; };"),
      invariant("const gutter = (wide) => { if (wide) { return 8; } return +8; };"),
      invariant("const indent = (nested) => { if (nested) { return 4; } return +(+4); };"),
      invariant("const isOpen = (door) => { if (door) { return !1; } return false; };"),
      invariant(
        'const kindOf = (flag) => { if (flag) { return "boolean"; } return typeof true; };',
      ),
      invariant("const zoom = (pinch) => { if (pinch) return 2; return 2; };"),
      invariant(
        "function inRange(level, warn) {\n  if (level < 0) { return false; }\n  if (level > 100) { warn(level); }\n  return false;\n}",
      ),
      invariant(
        'function cartReducer(cart = [], event) {\n  switch (event.type) {\n    case "checkout":\n      track(event)\n      return cart\n    default:\n      return cart\n  }\n}',
      ),
      invariant(
        "function inBounds(level, warn) {\n  if (level < 0) { return false; }\n  if (level > 100) { warn(level); return false; }\n  return false;\n}",
      ),
      invariant(
        'class Thermostat {\n  mode(reading) {\n    if (reading.cold) {\n      return "auto";\n    }\n    return "auto";\n  }\n}',
      ),
      invariant(
        "async function release(lock) {\n  try {\n    return 0;\n  } finally {\n    lock.free();\n  }\n}\nfunction exitCode(result) {\n  if (result.ok) { return 0; }\n  return 0;\n}",
      ),
      invariant(
        "function isSupported(browser) {\n  if (browser.modern) {\n    return true;\n  } else {\n    return true;\n  }\n}",
      ),
      invariant(
        "function hasPending(jobs) {\n  for (const job of jobs) {\n    if (job.pending) return 1;\n  }\n  return 1;\n}",
      ),
      invariant(
        'function sameShape(left, right) {\n  if (left.kind === "polygon" && right.kind === "polygon") {\n    if (left.points.length !== right.points.length) {\n      return false;\n    }\n    for (const point of right.points) {\n      if (!left.points.includes(point)) {\n        return false;\n      }\n    }\n  }\n  return false;\n}',
      ),
    ],
    valid: [
      'const tracker = {\n  set(target, key, value) {\n    if (target[key] === value) return true;\n    target[key] = value;\n    if (key === "title") {\n      target.render();\n    }\n    return true;\n  },\n};',
      "function takeSlot(request, fallback) {\n  const slot = reserved;\n  if (!slot) return fallback;\n  reserved = undefined;\n  slot.assign(request.id, fallback);\n  return fallback;\n}",
      "async function persist(note) {\n  if (!note.changed) {\n    return false;\n  }\n  await notes.save(note);\n  return false;\n}",
      'function suffix(count: number) {\n  let unit = "item";\n  if (count == 1) {\n    return unit;\n  }\n  unit += "s";\n  return unit;\n}',
      'function suffix(count: number) {\n  let unit = "item";\n  if (count == 1) {\n    return unit;\n  }\n  if (count > 1) {\n    unit += "s";\n  }\n  return unit;\n}',
      "function firstSeen(visits: number) {\n  let stamp;\n  if (visits == 0) {\n    return stamp;\n  }\n  stamp = 1;\n  return stamp;\n}",
      "function profile(user: User) {\n  const card = {};\n  if (user.anonymous) {\n    return card;\n  }\n  card.name = user.name;\n  return card;\n}",
      "function profile(user: User) {\n  const card = {};\n  if (user.anonymous) {\n    return card;\n  }\n  card.contact.email = user.email;\n  return card;\n}",
      "function profile(user: User) {\n  const card = {};\n  if (user.anonymous) {\n    return card;\n  }\n  card[0] = user.name;\n  return card;\n}",
      'function profile(user: User) {\n  const card = {};\n  if (user.anonymous) {\n    return card;\n  }\n  card["links"].social[0].url = user.site;\n  return card;\n}',
      "function profile(user: User) {\n  const card = {};\n  if (user.anonymous) {\n    return card;\n  }\n  card.hydrate();\n  return card;\n}",
      "function profile(user: User) {\n  const card = {};\n  if (user.anonymous) {\n    return card;\n  }\n  decorate(card);\n  return card;\n}",
      "function collect(user: User) {\n  const tags = [];\n  if (user.anonymous) {\n    return tags;\n  }\n  user.groups.forEach((group) => tags.push(group));\n  return tags;\n}",
      "function lastActive(sessions) {\n  let session;\n  for (const entry of sessions) {\n    session = entry;\n    if (session.live) return session;\n  }\n  return session;\n}",
      "function version() {\n  return 3;\n}",
      "function weight(heavy: boolean) {\n  if (heavy) {\n    return 9;\n  } else if (!heavy) {\n    return 9;\n  }\n}",
      "function weight(heavy: boolean) {\n  if (heavy) {\n    return 9;\n  } else {\n    return 1;\n  }\n}",
      "function weight(heavy: boolean) {\n  if (heavy) {\n    return !0;\n  } else {\n    return 0;\n  }\n}",
      "function stop(running: boolean) {\n  if (running) {\n    halt();\n  } else {\n    return;\n  }\n}",
      "function cap(strict: boolean): number | undefined {\n  if (strict) {\n    return 5;\n  }\n}",
      "function noop() {}",
      "function quota(blocked: boolean, trial: boolean) {\n  if (blocked) {\n    throw new QuotaError();\n  }\n  if (trial) {\n    return 10;\n  }\n  return 10;\n}",
      "function quota(trial: boolean) {\n  try {\n    refresh();\n  } catch (failure) {\n    throw failure;\n  }\n  if (trial) {\n    return 10;\n  }\n  return 10;\n}",
      "const pad = (compact) => (compact ? 2 : 2);",
      "function spread(narrow) {\n  const gap = measure() - offset();\n  const copy = gap;\n  if (narrow) {\n    return gap;\n  } else {\n    return copy;\n  }\n}",
      "function pattern(strict) {\n  if (strict) {\n    return /^\\d+$/;\n  }\n  return /^\\d+$/;\n}",
      "function* pages(more) {\n  if (more) {\n    yield 1;\n    return 0;\n  }\n  return 0;\n}",
      "function scan(found) {\n  search: {\n    if (found) break search;\n    return 1;\n  }\n  if (retry) return 1;\n}",
      "function route(code) {\n  switch (code) {\n    case 404:\n      if (code) break;\n      return 1;\n    default:\n      return 1;\n  }\n}",
      "function ceiling(strict) {\n  if (strict) {\n    return MAX_UPLOAD;\n  }\n  return MAX_UPLOAD;\n}",
      "function depth(nested) {\n  const level = 1;\n  if (nested) {\n    const level = 2;\n    return level;\n  }\n  return level;\n}",
      'function sealTree(tree) {\n  if (!tree || typeof tree !== "object") {\n    return tree;\n  }\n  const queue = [tree];\n  while (queue.length > 0) {\n    const branch = queue.shift();\n    Object.seal(branch);\n  }\n  return tree;\n}',
      "function append(entry, tail, position) {\n  if (entry.position === position) {\n    return entry;\n  }\n  if (tail === null) {\n    tail = entry;\n  } else {\n    tail.next = entry;\n  }\n  return entry;\n}",
      "function highlights(editor, onChange) {\n  const marks = editor.marks ?? [];\n  if (!editor.cursor.collapsed) {\n    return marks;\n  }\n  const notes = editor.notesAt(editor.cursor.start);\n  if (notes) {\n    onChange(notes);\n  }\n  return marks;\n}",
      'async function withAuth(request, forward) {\n  const reply = await forward(request)\n  if (reply.failed && reply.failed.length) {\n    if (seenBefore(request)) {\n      return reply\n    }\n    const probe = await fetch("/session")\n    if (probe.status === 403) {\n      logout()\n    }\n  }\n  return reply\n}',
      "function backup(online, snapshotId) {\n  if (!online) {\n    queueBackup(snapshotId);\n    return true;\n  }\n  uploadBackup(snapshotId);\n  return true;\n}",
      'function onKey(code, withShift) {\n  if (code === "Tab") {\n    moveFocus();\n    return false;\n  }\n  if (code === "Space" && withShift) {\n    togglePlay();\n    return false;\n  }\n  return false;\n}',
    ],
  },
);
