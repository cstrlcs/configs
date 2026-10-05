#!/usr/bin/env bun

import { cli } from "./program.ts";

const controller = new AbortController();

function interrupt(exitCode: number) {
  process.exitCode = exitCode;
  controller.abort(new Error("Interrupted"));
}

function onSigint() {
  interrupt(130);
}

function onSigterm() {
  interrupt(143);
}

process.once("SIGINT", onSigint);
process.once("SIGTERM", onSigterm);

try {
  await cli(Bun.argv.slice(2), process.cwd(), controller.signal);
} catch (error) {
  if (!controller.signal.aborted) {
    console.error("❌", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  }
} finally {
  process.removeListener("SIGINT", onSigint);
  process.removeListener("SIGTERM", onSigterm);
}
