import { addDependencies, REQUIRED_DEPENDENCIES } from "./package-manager.ts";
import { loadProject } from "./project.ts";
import { checkBunRuntime, managedFiles, repair } from "./requirements.ts";
import { isInteractive, print, printManualFix } from "./terminal.ts";

async function committedEnvFiles(root: string) {
  if (Bun.which("git") === null) {
    return [];
  }

  const git = Bun.spawn(
    [
      "git",
      "log",
      "--all",
      "--diff-filter=A",
      "--name-only",
      "--format=",
      "--",
      ":(glob)**/.env",
      ":(glob)**/.env.*",
    ],
    { cwd: root, stderr: "ignore" },
  );

  const [output, exitCode] = await Promise.all([git.stdout.text(), git.exited]);

  if (exitCode !== 0) {
    return [];
  }

  const files = output
    .split("\n")
    .filter((file) => file !== "" && !/\.env[^/]*\.example$/u.test(file));

  return [...new Set(files)];
}

function bulletList(items: readonly string[]) {
  return items.map((item) => `  - ${item}`).join("\n");
}

const warning = `🚨 This script will add the following dependencies to your project:
${bulletList(REQUIRED_DEPENDENCIES)}

It will also edit/overwrite the following files:
${bulletList(managedFiles)}

Make sure you have a backup of those files before proceeding.`;

export async function install(root: string, yes: boolean, signal?: AbortSignal) {
  const bunRuntime = checkBunRuntime();

  if (bunRuntime.status !== "passed") {
    throw new Error(`${bunRuntime.description}\n   → ${bunRuntime.fix.instructions}`);
  }

  await loadProject(root);
  print(warning);

  if (!yes) {
    if (!isInteractive()) {
      throw new Error(
        "Cannot ask for confirmation in a non-interactive session. Re-run with --yes.",
      );
    }

    if (!confirm("Are you sure you want to continue?")) {
      throw new Error("Installation cancelled.");
    }
  }

  await addDependencies(root, signal);

  for (const unresolved of await repair(await loadProject(root), signal)) {
    print(`⚠️  ${unresolved.description}`);
    printManualFix(unresolved.fix.kind === "manual" ? unresolved.fix.instructions : undefined);
  }

  const committed = await committedEnvFiles(root);

  if (committed.length > 0) {
    print(`⚠️  .env files in git history: ${committed.join(" ")}`);

    printManualFix(
      "Rotate the secrets these files held, then remove them from every commit with 'git filter-repo --invert-paths --path <file>'",
    );
  }

  print("✅ Installed. Run 'bun run lint:fix' to fix and check the project.");
}
