import path from "node:path";
import { parseArgs } from "node:util";

import { doctor } from "./doctor.ts";
import { isDirectory, readJson } from "./files.ts";
import { install } from "./install.ts";
import { stringField } from "./json.ts";
import { print } from "./terminal.ts";

const HELP = `Usage: cstrlcs-configs <install|doctor> [options]

Commands:
  install          Add the dependencies and configuration files
  doctor           Check that the project is configured correctly

Options:
  --cwd, -c <dir>   Project directory (defaults to the current directory)
  --yes, -y        Skip the confirmation prompt (install only)
  --help, -h       Show help information
  --version, -v    Show version information`;

function parseCommand(positionals: readonly string[], yes: boolean) {
  const [command] = positionals;

  if (positionals.length !== 1 || (command !== "install" && command !== "doctor")) {
    throw new Error("Expected one command: install or doctor. Run with --help for usage.");
  }

  if (command === "doctor" && yes) {
    throw new Error("--yes is only available for install.");
  }

  return command;
}

export async function cli(args: readonly string[], root: string, signal?: AbortSignal) {
  const { values, positionals } = parseArgs({
    args: [...args],
    allowPositionals: true,
    options: {
      cwd: { type: "string", short: "c", default: root },
      yes: { type: "boolean", short: "y", default: false },
      help: { type: "boolean", short: "h", default: false },
      version: { type: "boolean", short: "v", default: false },
    },
  });

  if (values.version) {
    const packageJson = await readJson(import.meta.dir, "../../package.json");

    print(`cstrlcs@configs v${stringField(packageJson, "version")}`);

    return;
  }

  if (values.help || args.length === 0) {
    print(HELP);

    return;
  }

  const command = parseCommand(positionals, values.yes);
  const cwd = path.resolve(root, values.cwd);

  if (!(await isDirectory(cwd))) {
    throw new Error(`Project directory does not exist or is not a directory: ${cwd}`);
  }

  signal?.throwIfAborted();

  if (command === "install") {
    await install(cwd, values.yes, signal);
  } else {
    await doctor(cwd);
  }
}
