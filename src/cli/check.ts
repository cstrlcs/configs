import type { Project } from "./project.ts";

export type Fix =
  | { readonly kind: "write"; readonly files: Readonly<Record<string, string>> }
  | { readonly kind: "install-dependencies" }
  | { readonly kind: "manual"; readonly instructions: string };

export type Status = "passed" | "warning" | "failed";

export interface Check {
  readonly status: Status;
  readonly description: string;
  readonly fix: Fix;
}

export interface Requirement {
  readonly files: readonly string[];
  readonly inspect: (project: Project) => readonly Check[] | Promise<readonly Check[]>;
}

interface CheckInput<F extends Fix> {
  readonly passed: boolean;
  readonly warning?: boolean;
  readonly label: string;
  readonly detail: string;
  readonly fix: F;
}

export function check<F extends Fix>({
  passed,
  warning = false,
  label,
  detail,
  fix,
}: CheckInput<F>) {
  if (passed) {
    return { status: "passed", description: label, fix } as const;
  }

  return {
    status: warning ? "warning" : "failed",
    description: `${label} (${detail})`,
    fix,
  } as const;
}

export function expectation(label: string, actual: string, expected: string) {
  return {
    passed: actual === expected,
    label,
    detail: `expected: "${expected}", got: "${actual}"`,
  };
}

export function write(files: Readonly<Record<string, string>>) {
  return { kind: "write", files } as const;
}

export function manual(instructions: string) {
  return { kind: "manual", instructions } as const;
}

export function json(value: unknown) {
  return `${JSON.stringify(value, undefined, 2)}\n`;
}
