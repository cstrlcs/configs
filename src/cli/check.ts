import type { Project } from "./project.ts";

export type Fix =
  | { readonly kind: "write"; readonly files: Readonly<Record<string, string>> }
  | { readonly kind: "install-dependencies" }
  | { readonly kind: "manual"; readonly instructions: string };

export interface Check {
  readonly passed: boolean;
  readonly description: string;
  readonly fix: Fix;
}

export interface Requirement {
  readonly files: readonly string[];
  readonly inspect: (project: Project) => readonly Check[] | Promise<readonly Check[]>;
}

interface CheckInput<F extends Fix> {
  readonly passed: boolean;
  readonly label: string;
  readonly detail: string;
  readonly fix: F;
}

export function check<F extends Fix>({ passed, label, detail, fix }: CheckInput<F>) {
  return { passed, description: passed ? label : `${label} (${detail})`, fix };
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
