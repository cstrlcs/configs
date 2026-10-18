import { RuleTester } from "oxlint/plugins-dev";

import { sortSpecifiers } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "sort-specifiers",
  sortSpecifiers,
  {
    invalid: [
      {
        code: 'import { refundOrder, cancelOrder, shipOrder } from "./orders";',
        errors: [
          { data: { left: "refundOrder", right: "cancelOrder" }, messageId: "importSpecifier" },
        ],
        output: 'import { cancelOrder, refundOrder, shipOrder } from "./orders";',
      },
      {
        code: 'import {\n  archiveInvoice,\n  sendInvoice,\n  draftInvoice,\n  voidInvoice,\n} from "./invoices";',
        errors: [
          { data: { left: "sendInvoice", right: "draftInvoice" }, messageId: "importSpecifier" },
        ],
        output:
          'import {\n  archiveInvoice,\n  draftInvoice,\n  sendInvoice,\n  voidInvoice,\n} from "./invoices";',
      },
      {
        code: 'import {\n  upload, abort,\n} from "./uploads";',
        errors: [{ data: { left: "upload", right: "abort" }, messageId: "importSpecifier" }],
        output: 'import {\n  abort, upload,\n} from "./uploads";',
      },
      {
        code: 'import { retry10, retry2, retry1s, retry } from "./backoff";',
        errors: [
          { data: { left: "retry10", right: "retry2" }, messageId: "importSpecifier" },
          { data: { left: "retry2", right: "retry1s" }, messageId: "importSpecifier" },
          { data: { left: "retry1s", right: "retry" }, messageId: "importSpecifier" },
        ],
        output: 'import { retry, retry1s, retry2, retry10 } from "./backoff";',
      },
      {
        code: 'import { type Upload, startUpload, type Chunk } from "./uploads";',
        errors: [
          { data: { left: "Upload", right: "startUpload" }, messageId: "importSpecifier" },
          { data: { left: "startUpload", right: "Chunk" }, messageId: "importSpecifier" },
        ],
        output: 'import { type Chunk, startUpload, type Upload } from "./uploads";',
      },
      {
        code: 'import {\n  readSession as session2,\n  loadSession as session1,\n  expireSession\n} from "./sessions";',
        errors: [
          { data: { left: "session2", right: "session1" }, messageId: "importSpecifier" },
          { data: { left: "session1", right: "expireSession" }, messageId: "importSpecifier" },
        ],
        output:
          'import {\n  expireSession,\n  loadSession as session1,\n  readSession as session2\n} from "./sessions";',
      },
      {
        code: 'import Drawer, {\n  Panel,\n  openDrawer as Handle,\n  slideOut as Sheet,\n  backdrop as Overlay,\n} from "./drawer";',
        errors: [
          { data: { left: "Panel", right: "Handle" }, messageId: "importSpecifier" },
          { data: { left: "Sheet", right: "Overlay" }, messageId: "importSpecifier" },
        ],
        output:
          'import Drawer, {\n  openDrawer as Handle,\n  backdrop as Overlay,\n  Panel,\n  slideOut as Sheet,\n} from "./drawer";',
      },
      {
        code: 'import {\n  refund,\n  // settles the original charge\n  capture,\n} from "./payments";',
        errors: [{ data: { left: "refund", right: "capture" }, messageId: "importSpecifier" }],
        output:
          'import {\n  // settles the original charge\n  capture,\n  refund,\n} from "./payments";',
      },
      {
        code: 'import {\n  shipOrder, // waits for the carrier\n  cancelOrder, // refunds first\n} from "./orders";',
        errors: [
          { data: { left: "shipOrder", right: "cancelOrder" }, messageId: "importSpecifier" },
        ],
        output:
          'import {\n  cancelOrder, // refunds first\n  shipOrder, // waits for the carrier\n} from "./orders";',
      },
      {
        code: 'import {\n  shipOrder, // waits for the carrier\n  cancelOrder /* refunds first */\n} from "./orders";',
        errors: [
          { data: { left: "shipOrder", right: "cancelOrder" }, messageId: "importSpecifier" },
        ],
        output:
          'import {\n  cancelOrder, /* refunds first */\n  shipOrder // waits for the carrier\n} from "./orders";',
      },
      {
        code: 'import {\n  shipOrder, // waits for the carrier\n  cancelOrder,\n} from "./orders";',
        errors: [
          { data: { left: "shipOrder", right: "cancelOrder" }, messageId: "importSpecifier" },
        ],
        output:
          'import {\n  cancelOrder,\n  shipOrder, // waits for the carrier\n} from "./orders";',
      },
      {
        code: 'import {\n  shipOrder, // waits for the carrier\n  cancelOrder, archiveOrder } from "./orders";',
        errors: [
          { data: { left: "shipOrder", right: "cancelOrder" }, messageId: "importSpecifier" },
          { data: { left: "cancelOrder", right: "archiveOrder" }, messageId: "importSpecifier" },
        ],
        output:
          'import {\n  archiveOrder,\n  cancelOrder, shipOrder // waits for the carrier\n } from "./orders";',
      },
      {
        code: 'import {\n  totals, /* legacy name,\n  kept for v1 */\n  amounts\n} from "./ledger";',
        errors: [{ data: { left: "totals", right: "amounts" }, messageId: "importSpecifier" }],
        output:
          'import {\n  amounts, /* legacy name,\n  kept for v1 */\n  totals\n} from "./ledger";',
      },
      {
        code: "export { total, discount, subtotal, shipping };",
        errors: [
          { data: { left: "total", right: "discount" }, messageId: "exportSpecifier" },
          { data: { left: "subtotal", right: "shipping" }, messageId: "exportSpecifier" },
        ],
        output: "export { discount, shipping, subtotal, total };",
      },
      {
        code: 'export { listDrawers as drawers, getDrawer as drawer } from "./drawers";',
        errors: [{ data: { left: "drawers", right: "drawer" }, messageId: "exportSpecifier" }],
        output: 'export { getDrawer as drawer, listDrawers as drawers } from "./drawers";',
      },
      {
        code: 'export { formatTotal as "format-total", applyCoupon as "apply-coupon" } from "./cart";',
        errors: [
          { data: { left: "format-total", right: "apply-coupon" }, messageId: "exportSpecifier" },
        ],
        output:
          'export { applyCoupon as "apply-coupon", formatTotal as "format-total" } from "./cart";',
      },
      {
        code: 'export type { Shipment, Parcel } from "./shipping";',
        errors: [{ data: { left: "Shipment", right: "Parcel" }, messageId: "exportSpecifier" }],
        output: 'export type { Parcel, Shipment } from "./shipping";',
      },
      {
        code: 'export { v10, v2 } from "./migrations";\nexport * from "./config";',
        errors: [
          { data: { left: "v10", right: "v2" }, messageId: "exportSpecifier" },
          { data: { left: "./migrations", right: "./config" }, messageId: "moduleSpecifier" },
        ],
        output: 'export * from "./config";\nexport { v2, v10 } from "./migrations";',
      },
      {
        code: 'export { z } from "zod";\nexport { clsx } from "clsx";\nexport { customAlphabet, nanoid } from "nanoid";\nexport { format, parse } from "date-fns";',
        errors: [
          { data: { left: "zod", right: "clsx" }, messageId: "moduleSpecifier" },
          { data: { left: "nanoid", right: "date-fns" }, messageId: "moduleSpecifier" },
        ],
        output:
          'export { clsx } from "clsx";\nexport { format, parse } from "date-fns";\nexport { customAlphabet, nanoid } from "nanoid";\nexport { z } from "zod";',
      },
      {
        code: 'export * as payments from "./payments";\nexport { listCarts } from "./carts";\nexport { closeSession, openSession } from "./sessions";\nexport * from "stripe";\nexport { refund } from "./refunds";',
        errors: [
          { data: { left: "./payments", right: "./carts" }, messageId: "moduleSpecifier" },
          { data: { left: "stripe", right: "./refunds" }, messageId: "moduleSpecifier" },
        ],
        output:
          'export { listCarts } from "./carts";\nexport * as payments from "./payments";\nexport { refund } from "./refunds";\nexport { closeSession, openSession } from "./sessions";\nexport * from "stripe";',
      },
      {
        code: 'export { totals as invoiceTotals } from "./invoice-totals";\nexport { taxRate, taxZone } from "./tax";\nexport { default as Receipt } from "./receipt";',
        errors: [{ data: { left: "./tax", right: "./receipt" }, messageId: "moduleSpecifier" }],
        output:
          'export { totals as invoiceTotals } from "./invoice-totals";\nexport { default as Receipt } from "./receipt";\nexport { taxRate, taxZone } from "./tax";',
      },
      {
        code: 'export * from "./step10";\nexport * from "./step9";',
        errors: [{ data: { left: "./step10", right: "./step9" }, messageId: "moduleSpecifier" }],
        output: 'export * from "./step9";\nexport * from "./step10";',
      },
      {
        code: 'export * from "./report b";\nexport * from "./reportA";',
        errors: [
          { data: { left: "./report b", right: "./reportA" }, messageId: "moduleSpecifier" },
        ],
        output: 'export * from "./reportA";\nexport * from "./report b";',
      },
      {
        code: 'export * from "./widgets";\nexport * from "./buttons";\n\nexport { Modal } from "./dialogs";',
        errors: [{ data: { left: "./widgets", right: "./buttons" }, messageId: "moduleSpecifier" }],
        output:
          'export * from "./buttons";\nexport { Modal } from "./dialogs";\n\nexport * from "./widgets";',
      },
      {
        code: 'export * from "./webhooks";\nexport const API_VERSION = "2026-10";\nexport * from "./charges";',
        errors: [
          { data: { left: "./webhooks", right: "./charges" }, messageId: "moduleSpecifier" },
        ],
        output:
          'export * from "./charges";\nexport const API_VERSION = "2026-10";\nexport * from "./webhooks";',
      },
      {
        code: 'declare module "billing-sdk" {\n  export * from "./refunds";\n  export * from "./disputes";\n}',
        errors: [
          { data: { left: "./refunds", right: "./disputes" }, messageId: "moduleSpecifier" },
        ],
        output:
          'declare module "billing-sdk" {\n  export * from "./disputes";\n  export * from "./refunds";\n}',
      },
      {
        code: 'export { uploadFile } from "./upload"; export { abortUpload } from "./abort"',
        errors: [{ data: { left: "./upload", right: "./abort" }, messageId: "moduleSpecifier" }],
        output: 'export { abortUpload } from "./abort"; export { uploadFile } from "./upload";',
      },
      {
        code: 'export { uploadFile } from "./upload"; export { abortUpload } from "./abort";',
        errors: [{ data: { left: "./upload", right: "./abort" }, messageId: "moduleSpecifier" }],
        output: 'export { abortUpload } from "./abort"; export { uploadFile } from "./upload";',
      },
      {
        code: 'export { uploadFile } from "./upload"\nexport { abortUpload } from "./abort"',
        errors: [{ data: { left: "./upload", right: "./abort" }, messageId: "moduleSpecifier" }],
        output: 'export { abortUpload } from "./abort"\nexport { uploadFile } from "./upload"',
      },
      {
        code: 'export * from "./refunds"; // card refunds only\nexport * from "./disputes"; // opened by the bank',
        errors: [
          { data: { left: "./refunds", right: "./disputes" }, messageId: "moduleSpecifier" },
        ],
        output:
          'export * from "./disputes"; // opened by the bank\nexport * from "./refunds"; // card refunds only',
      },
      {
        code: 'export * from "./refunds"; // oxlint-disable-line import/export\nexport * from "./disputes";',
        errors: [
          { data: { left: "./refunds", right: "./disputes" }, messageId: "moduleSpecifier" },
        ],
        output:
          'export * from "./disputes";\nexport * from "./refunds"; // oxlint-disable-line import/export',
      },
      {
        code: 'export { uploadFile } from "./upload"; /* chunked,\n  resumable */\nexport { abortUpload } from "./abort";',
        errors: [{ data: { left: "./upload", right: "./abort" }, messageId: "moduleSpecifier" }],
        output:
          'export { abortUpload } from "./abort"; /* chunked,\n  resumable */\nexport { uploadFile } from "./upload";',
      },
      {
        code: '#!/usr/bin/env bun\n// Generated by scripts/barrel.ts\n\nexport * from "./sessions";\n// oxlint-disable-next-line import/export\nexport * from "./orders";\nexport * from "./invoices";',
        errors: [
          { data: { left: "./sessions", right: "./orders" }, messageId: "moduleSpecifier" },
          { data: { left: "./orders", right: "./invoices" }, messageId: "moduleSpecifier" },
        ],
        output:
          '#!/usr/bin/env bun\n// Generated by scripts/barrel.ts\n\nexport * from "./invoices";\n// oxlint-disable-next-line import/export\nexport * from "./orders";\nexport * from "./sessions";',
      },
      {
        code: '#!/usr/bin/env node\nexport * from "./serve";\nexport * from "./build";',
        errors: [{ data: { left: "./serve", right: "./build" }, messageId: "moduleSpecifier" }],
        output: '#!/usr/bin/env node\nexport * from "./build";\nexport * from "./serve";',
      },
      {
        code: '/* oxlint-disable import/export */\nexport * from "./serve";\nexport * from "./build";',
        errors: [{ data: { left: "./serve", right: "./build" }, messageId: "moduleSpecifier" }],
        output:
          '/* oxlint-disable import/export */\nexport * from "./build";\nexport * from "./serve";',
      },
      {
        code: 'export * from "./ledger";\n// eslint-enable import/export\nexport * from "./taxes";\nexport * from "./payouts";',
        errors: [{ data: { left: "./taxes", right: "./payouts" }, messageId: "moduleSpecifier" }],
        output:
          'export * from "./ledger";\n// eslint-enable import/export\nexport * from "./payouts";\nexport * from "./taxes";',
      },
    ],
    valid: [
      'import { cancelOrder, refundOrder, shipOrder } from "./orders";',
      'import {\n  archiveInvoice,\n  draftInvoice,\n  sendInvoice,\n  voidInvoice,\n} from "./invoices";',
      'import {\n  expireSession,\n  loadSession as session1,\n  readSession as session2\n} from "./sessions";',
      'import Checkout, { submit as Pay } from "./checkout";',
      'import Drawer, {\n  openDrawer as Handle,\n  backdrop as Overlay,\n  Panel,\n  slideOut as Sheet,\n} from "./drawer";',
      'import { "z-index" as layer, "a-index" as order } from "./styles";',
      'import * as stripe from "stripe";',
      'import { retry, retry1s, retry2, retry10 } from "./backoff";',
      'import { item, Item } from "./catalog";',
      'import { Item, item } from "./catalog";',
      'import { $session, _cache, account } from "./auth";',
      'import { type Chunk, startUpload, type Upload } from "./uploads";',
      'import type { Parcel, Shipment } from "./shipping";',
      "export { discount, shipping, subtotal, total };",
      'export { getDrawer as drawer, listDrawers as drawers } from "./drawers";',
      'export { clsx } from "clsx";\nexport { format, parse } from "date-fns";\nexport { z } from "zod";',
      'export { listCarts } from "./carts";\nexport * as payments from "./payments";\nexport { refund } from "./refunds";\nexport * from "stripe";',
      'export { step } from "./step";\nexport { step1a } from "./step1a";\nexport { step2 } from "./step2";\nexport { step10 } from "./step10";',
      'export { db } from "@/db";\nexport { mailer } from "@/mailer";\nexport { queue } from "@/queue";',
      'export type { Invoice } from "./invoice";\nexport { createInvoice } from "./invoice";',
      'export { default as icon } from "./icon?raw";\nexport { iconSize } from "./icon-size";',
      'export * from "./reportA";\nexport * from "./report b";',
      'export * from "./archive";\nexport * from "./arch ive";',
      'export * from "./arch ive";\nexport * from "./archive";',
      'export * from "./v1 2";\nexport * from "./v12";',
      'export * from "./sheet\\u0073";\nexport * from "./sheeta";',
      "export const shipping = 5;\n\nexport const discount = 0;",
      'export default function checkout() {}\nexport { cart } from "./cart";',
      'export * from "./webhooks";\n\ndeclare module "billing-sdk" {\n  export * from "./charges";\n}',
      '#!/usr/bin/env node\nexport * from "./build";\nexport * from "./serve";',
    ],
  },
);
