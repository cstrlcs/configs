import process from "node:process";

const AUTOMATION_ENVIRONMENT_VARIABLES = [
  "CI",
  "CLAUDECODE",
  "CURSOR_AGENT",
  "CODEX_CI",
  "OPENCODE",
  "AMP_HOME",
];

export function isInteractive() {
  return (
    process.stdin.isTTY &&
    AUTOMATION_ENVIRONMENT_VARIABLES.every((name) => Bun.env[name] === undefined)
  );
}

export function print(line = "") {
  process.stdout.write(`${line}\n`);
}

export function printManualFix(instructions: string | undefined) {
  if (instructions == null) {
    return;
  }

  print(`   → ${instructions}`);
}

interface RunOptions {
  readonly signal?: AbortSignal | undefined;
}

export async function exitCodeOf(
  command: readonly [string, ...string[]],
  cwd: string,
  { signal }: RunOptions = {},
) {
  signal?.throwIfAborted();

  const child = Bun.spawn([...command], {
    cwd,
    stdio: ["inherit", "inherit", "inherit"],
    detached: process.platform !== "win32",
  });

  function interrupt() {
    if (process.platform === "win32") {
      Bun.spawnSync(["taskkill", "/pid", String(child.pid), "/T", "/F"], {
        stdio: ["ignore", "ignore", "ignore"],
      });
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill();
      }
    }
  }

  signal?.addEventListener("abort", interrupt, { once: true });

  try {
    const exitCode = await child.exited;

    signal?.throwIfAborted();

    return exitCode;
  } finally {
    signal?.removeEventListener("abort", interrupt);
  }
}

export async function run(
  command: readonly [string, ...string[]],
  cwd: string,
  options?: RunOptions,
) {
  const exitCode = await exitCodeOf(command, cwd, options);

  if (exitCode !== 0) {
    throw new Error(`${command.join(" ")} failed with exit code ${exitCode}`);
  }
}
