import { REQUIRED_DEPENDENCIES, addDependencies } from "./package-manager.ts";
import { loadProject } from "./project.ts";
import { managedFiles, checkBunRuntime, repair } from "./requirements.ts";
import { exitCodeOf, isInteractive, print, printManualFix, run } from "./terminal.ts";

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

  const lintExitCode = await exitCodeOf(
    ["bunx", "oxlint", "--type-aware", "--fix", "--silent"],
    root,
    { signal },
  );

  await run(["bunx", "oxfmt"], root, { signal, stdout: "ignore" });

  if (lintExitCode !== 0) {
    print("⚠️  oxlint --fix left issues it could not fix");
    printManualFix('Run "bun run lint" to see them');
  }
}
