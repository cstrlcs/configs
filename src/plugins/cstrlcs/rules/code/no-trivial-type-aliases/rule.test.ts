import { RuleTester } from "oxlint/plugins-dev";

import { noTrivialTypeAliases } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "ts" } } }).run(
  "no-trivial-type-aliases",
  noTrivialTypeAliases,
  {
    invalid: [
      {
        code: "export type InvoiceTotal = number;",
        errors: [{ data: { name: "InvoiceTotal" }, messageId: "primitive" }],
      },
      {
        code: "type Cents = number;\ntype Refund = Cents;\nexport type Payout = Refund;",
        errors: [
          { data: { name: "Cents" }, messageId: "primitive" },
          { data: { name: "Refund" }, messageId: "primitive" },
          { data: { name: "Payout" }, messageId: "primitive" },
        ],
      },
      {
        code: "export type WebhookBody = RawPayload;\ntype RawPayload = unknown;",
        errors: [
          { data: { name: "WebhookBody" }, messageId: "unknown" },
          { data: { name: "RawPayload" }, messageId: "unknown" },
        ],
      },
      {
        code: [
          "type SessionCount = bigint;",
          "type IsDraft = boolean;",
          "type Missing = null;",
          "type Token = symbol;",
          "type NotLoaded = undefined;",
          "type Sku = string;",
        ].join("\n"),
        errors: [
          { data: { name: "SessionCount" }, messageId: "primitive" },
          { data: { name: "IsDraft" }, messageId: "primitive" },
          { data: { name: "Missing" }, messageId: "primitive" },
          { data: { name: "Token" }, messageId: "primitive" },
          { data: { name: "NotLoaded" }, messageId: "primitive" },
          { data: { name: "Sku" }, messageId: "primitive" },
        ],
      },
      {
        code: 'declare module "upload-client" {\n  type ChunkSize = number;\n}',
        errors: [{ data: { name: "ChunkSize" }, messageId: "primitive" }],
      },
      {
        code: "function readCookie(header: string) {\n  type Parsed = unknown;\n\n  return decode<Parsed>(header);\n}",
        errors: [{ data: { name: "Parsed" }, messageId: "unknown" }],
      },
      {
        code: "type DrawerId = string;\n\nfunction openDrawer<DrawerId>() {\n  type Target = DrawerId;\n\n  return mount<Target>();\n}",
        errors: [{ data: { name: "DrawerId" }, messageId: "primitive" }],
      },
    ],
    valid: [
      "type OrderId = string & { readonly __orderId: unique symbol };",
      'type UploadStatus = "queued" | "sending" | "done";',
      "type Tags = readonly string[];",
      "type Range = [start: number, end: number];",
      'import type { Locale } from "./i18n";\n\ntype UserLocale = Locale;',
      "type Maybe<Value> = Value;",
      "type Price = Maybe<number>;\ntype Maybe<Value> = Value;",
      "type Lookup = Record<string, number>;",
      "type Ref = Billing.InvoiceId;",
      "type Anything = any;",
      "type Impossible = never;",
      "type Bag = object;",
      "type Ping = Pong;\ntype Pong = Ping;",
      "type Port = number | string;",
    ],
  },
);
