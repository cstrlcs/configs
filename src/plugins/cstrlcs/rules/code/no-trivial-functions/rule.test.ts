import { RuleTester } from "oxlint/plugins-dev";

import { noTrivialFunctions } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "no-trivial-functions",
  noTrivialFunctions,
  {
    invalid: [
      {
        code: 'function isPaid(status: string) {\n  return status === "paid";\n}\n\nship(isPaid(order.status));',
        errors: [{ data: { name: "isPaid" }, messageId: "inline" }],
      },
      {
        code: "const toCents = (amount: number) => amount * 100;\n\ncharge(toCents(total));",
        errors: [{ data: { name: "toCents" }, messageId: "inline" }],
      },
      {
        code: "const slug = (title: string) => {\n  return title.toLowerCase();\n};\n\nsave(slug(post.title));",
        errors: [{ data: { name: "slug" }, messageId: "inline" }],
      },
      {
        code: "const perimeter = function (width: number) {\n  return width * 4;\n};\n\ndraw(perimeter(12));",
        errors: [{ data: { name: "perimeter" }, messageId: "inline" }],
      },
      {
        code: "function ownerEmail(invoice: Invoice) {\n  return invoice.customer.email;\n}\n\nconst decode = (token: string) => decodeJwt(token);\n\nsend(ownerEmail(invoice), decode(header));",
        errors: [
          { data: { name: "ownerEmail" }, messageId: "inline" },
          { data: { name: "decode" }, messageId: "inline" },
        ],
      },
      {
        code: "function orderTotal(order: Order) {\n  return order.summary.total;\n}\n\nsum(orderTotal(cart), orderTotal(saved));",
        errors: [{ data: { name: "orderTotal" }, messageId: "forward" }],
      },
      {
        code: "const decode = (token: string) => decodeJwt(token);\n\nverify(decode(access), decode(refresh), decode(legacy), decode(guest));",
        errors: [{ data: { name: "decode" }, messageId: "forward" }],
      },
      {
        code: "const logIn = (credentials: Credentials) => api.sessions.create(credentials);\n\nretry(logIn(primary), logIn(fallback));",
        errors: [{ data: { name: "logIn" }, messageId: "forward" }],
      },
      {
        code: "const timestamp = () => performance.now();\n\nmeasure(timestamp(), timestamp());",
        errors: [{ data: { name: "timestamp" }, messageId: "forward" }],
      },
      {
        code: 'const field = (row: Row, column: string) => row[column];\n\ntable(field(header, "sku"), field(footer, "sku"));',
        errors: [{ data: { name: "field" }, messageId: "forward" }],
      },
      {
        code: "const warn = (...details: string[]) => console.warn(...details);\n\nwarn(quotaMessage);\nwarn(retryMessage);",
        errors: [{ data: { name: "warn" }, messageId: "forward" }],
      },
      {
        code: 'function track(event: string) {\n  analytics.track(event);\n}\n\ntrack("checkout");',
        errors: [{ data: { name: "track" }, messageId: "forward" }],
      },
      {
        code: "const decode = (token: string) =>\n  decodeJwt(\n    token,\n  );\n\nverify(decode(header));",
        errors: [{ data: { name: "decode" }, messageId: "forward" }],
      },
      {
        code: "const invoiceId = (invoice: Invoice) => invoice.id;\n\nprint(invoices.map(invoiceId));",
        errors: [{ data: { name: "invoiceId" }, messageId: "forward" }],
      },
      {
        code: "function Drawer() {\n  function handleClose(reason: string) {\n    closeDrawer(reason);\n  }\n\n  return <Sheet onClose={handleClose} />;\n}",
        errors: [{ data: { name: "handleClose" }, messageId: "forward" }],
      },
      {
        code: "function createStore() {\n  const select = (state: State) => pickState(state);\n\n  return select;\n}",
        errors: [{ data: { name: "select" }, messageId: "forward" }],
      },
      {
        code: "const retryUpload = (file: File) => retryUpload(file);\n\ntype RetryUpload = typeof retryUpload;",
        errors: [{ data: { name: "retryUpload" }, messageId: "forward" }],
      },
      {
        code: 'const decode = (token: string) => decodeJwt(token);\nconst upload = (file: File) => sendFile(file);\n\nexport type { decode as Decode };\nexport { upload } from "./uploads";',
        errors: [
          { data: { name: "decode" }, messageId: "forward" },
          { data: { name: "upload" }, messageId: "forward" },
        ],
      },
      {
        code: "const toCsv = (rows: Row[]) => serialize(rows);\n\nconfig.exports.handler = toCsv;",
        errors: [{ data: { name: "toCsv" }, messageId: "forward" }],
      },
    ],
    valid: [
      'function isPaid(status: string) {\n  return status === "paid";\n}\n\nship(isPaid(draft.status), isPaid(sent.status));',
      "const isOverdue = (days: number) => days > 30;\n\nremind(invoices.filter(isOverdue));",
      "function subtotal(lines: Line[]) {\n  const amount = lines.reduce((sum, line) => sum + line.price, 0);\n\n  return amount;\n}\n\nrender(subtotal(cart.lines));",
      'const initials = (names: string[]) =>\n  names\n    .map((part) => part[0])\n    .join("");\n\nshow(initials(fullName));',
      "function canRefund(order: Order) {\n  return order.paid && order.shipped;\n}\n\nguard(canRefund(order));",
      'const badge = (overdue: boolean) => (overdue ? "late" : "due");\n\nrender(badge(flag));',
      "const city = ({ address }: Customer) => address;\n\nship(city(customer));",
      "let toCents = (amount: number) => amount * 100;\n\ncharge(toCents(total));",
      "function countdown(seconds: number) {\n  return countdown(seconds - 1);\n}",
      "function EmptyCart() {\n  return <p>No items</p>;\n}\n\nrender(<EmptyCart />);",
      'function isInvoice(value: unknown): value is Invoice {\n  return typeof value === "object";\n}\n\nhandle(isInvoice(payload));',
      "const isRefund = (entry: unknown): entry is Refund => matches(entry);\n\nsplit(isRefund(head), isRefund(tail));",
      "async function loadOrder(id: string) {\n  return fetchOrder(id);\n}\n\nawait loadOrder(orderId);",
      "const loadInvoice = async (id: string) => fetchInvoice(id);\n\nawait Promise.all([loadInvoice(draftId), loadInvoice(sentId)]);",
      "const currentStep = function () {\n  return this.step;\n};\n\nrender(currentStep());",
      "const lookup = function (key: string) {\n  return this.cache.get(key);\n};\n\nwarm(lookup(primaryKey), lookup(backupKey));",
      "function firstUpload() {\n  return arguments[0];\n}\n\nqueue(firstUpload(file));",
      'function requireSession(session: Session) {\n  if (!session.active) {\n    throw new Error("expired");\n  }\n\n  return session;\n}\n\nhandle(requireSession(current));',
      "const toRow = (order: Order) => ({ id: order.id });\n\ntable(toRow(open), toRow(closed));",
      "const nextPage = (page: number) => page + 1;\n\nload(nextPage(current), nextPage(last));",
      "const cleanEmail = (email: string) => validateEmail(email.toLowerCase());\n\nsave(cleanEmail(primary), cleanEmail(backup));",
      "const ownerId = (upload?: Upload) => upload?.ownerId;\n\naudit(ownerId(recent), ownerId(pending));",
      'const emit = (event: string) => listener?.(event);\n\nnotify(emit("opened"), emit("closed"));',
      "const compareDates = (left: Date, right: Date) => byDate(right, left);\n\nsort(compareDates(start, end), compareDates(due, paid));",
      "const toInt = (input: string) => Number.parseInt(input, 10);\n\nsum(toInt(width), toInt(height));",
      "const lastLine = (lines: string[]) => lines.at(-1);\n\nprint(lastLine(header), lastLine(body));",
      "const render = (template: string) => compile(template)(template);\n\nemail(render(welcome), render(receipt));",
      'const parseQuery = (search = "") => parseParams(search);\n\nroute(parseQuery(current), parseQuery(previous));',
      "function issuedAt() {\n  return new Date().toISOString();\n}\n\nstamp(issuedAt(), issuedAt());",
      "const sku = (item: Item) => item.sku;\n\nlist(sku(shirt), sku(hat), sku(scarf), sku(boots), sku(belt));",
      'const onScroll = () => trackScroll();\n\ndocument.addEventListener("scroll", onScroll);\ndocument.removeEventListener("scroll", onScroll);',
      "export function isOpen(state: string) {\n  return state !== 'closed';\n}\n\nrender(isOpen(drawer.state));",
      "export const toCents = (amount: number) => amount * 100;\n\ncharge(toCents(total));",
      "export function customerName(invoice: Invoice) {\n  return invoice.customer;\n}",
      "const decode = (token: string) => decodeJwt(token);\n\nexport { decode };",
      "const serialize = (rows: Row[]) => toCsv(rows);\n\nexport default serialize;",
      "export default function serialize(rows: Row[]) {\n  return toCsv(rows);\n}",
      "const orderTotal = (order: Order) => order.total;\n\nsum(orderTotal(cart), orderTotal(saved));\n\nexport { orderTotal };",
      "const decode = (token: string) => decodeJwt(token);\n\nmodule.exports = { decode };",
      "const decode = (token: string) => decodeJwt(token);\n\nmodule.exports = { decodeToken: decode };",
      "const decode = (token: string) => decodeJwt(token);\n\nmodule.exports = decode;",
      "const decode = (token: string) => decodeJwt(token);\n\nmodule.exports.decode = decode;",
      'const decode = (token: string) => decodeJwt(token);\n\nmodule.exports["decode"] = decode;',
      "function decode(token: string) {\n  return decodeJwt(token);\n}\n\nexports.decode = decode;",
      "function formatAmount(amount: number): string;\nfunction formatAmount(amount: bigint): string;\nfunction formatAmount(amount: number | bigint) {\n  return formatter.format(amount);\n}\n\nprint(formatAmount(price), formatAmount(total));",
      "function toLabel(code: number): string;\nfunction toLabel(code: string): string;\nfunction toLabel(code: number | string) {\n  return String(code);\n}\n\nprint(toLabel(status));",
    ],
  },
);
