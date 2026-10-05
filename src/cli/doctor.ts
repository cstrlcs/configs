import { loadProject } from "./project.ts";
import { diagnose } from "./requirements.ts";
import { print, printManualFix } from "./terminal.ts";

export async function doctor(root: string) {
  const checks = await diagnose(await loadProject(root));

  for (const result of checks) {
    print(`${result.passed ? "✅" : "❌"} ${result.description}`);

    if (!result.passed) {
      printManualFix(result.fix.kind === "manual" ? result.fix.instructions : undefined);
    }
  }

  print();

  const failed = checks.filter(({ passed }) => !passed);

  if (failed.length === 0) {
    print("✅ Everything looks good!");

    return;
  }

  throw new Error(
    failed.every(({ fix }) => fix.kind === "manual")
      ? "Some checks failed. Follow the steps above to fix them."
      : "Some checks failed. Run 'bunx @cstrlcs/configs install' to fix them.",
  );
}
