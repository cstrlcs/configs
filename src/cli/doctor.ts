import type { Status } from "./check.ts";

import { loadProject } from "./project.ts";
import { diagnose } from "./requirements.ts";
import { print, printManualFix } from "./terminal.ts";

const STATUS_ICONS: Record<Status, string> = {
  passed: "✅",
  warning: "⚠️ ",
  failed: "❌",
};

export async function doctor(root: string) {
  const checks = await diagnose(await loadProject(root));

  for (const result of checks) {
    print(`${STATUS_ICONS[result.status]} ${result.description}`);

    if (result.status !== "passed") {
      printManualFix(result.fix.kind === "manual" ? result.fix.instructions : undefined);
    }
  }

  print();

  const failed = checks.filter(({ status }) => status === "failed");

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
