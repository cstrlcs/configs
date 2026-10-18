import type { Project } from "./project.ts";
import type { __unstable__loadDesignSystem as LoadDesignSystem } from "tailwindcss";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { ResolverFactory } from "oxc-resolver";

import { DEFAULT_CSS } from "./project.ts";

export type DesignSystem = Awaited<ReturnType<typeof LoadDesignSystem>>;
export type DesignSystems = Awaited<ReturnType<typeof getDesignSystems>>;
export type AstNode = ReturnType<DesignSystem["candidatesToAst"]>[number][number];

interface Loaded {
  base: string;
  path: string;
}

interface TailwindModule {
  __unstable__loadDesignSystem: (
    css: string,
    options: {
      base: string;
      loadModule: (id: string, base: string) => Promise<Loaded & { module: unknown }>;
      loadStylesheet: (id: string, base: string) => Promise<Loaded & { content: string }>;
    },
  ) => Promise<DesignSystem>;
}

const stylesheetResolver = new ResolverFactory({
  conditionNames: ["style"],
  extensions: [".css"],
  mainFields: ["style"],
});

const moduleResolver = new ResolverFactory({
  conditionNames: ["node", "import"],
  extensions: [".js", ".mjs", ".cjs", ".ts", ".mts", ".cts"],
});

const designSystems = new Map<string, Promise<DesignSystem>>();

function resolvePath(resolver: ResolverFactory, id: string, base: string) {
  const { error, path: resolved } = resolver.sync(base, id);

  if (resolved === undefined) {
    throw new Error(error ?? `Cannot resolve "${id}" from ${base}.`);
  }

  return resolved;
}

function isTailwindModule(value: unknown): value is TailwindModule {
  return (
    typeof value === "object" &&
    value !== null &&
    "__unstable__loadDesignSystem" in value &&
    typeof value.__unstable__loadDesignSystem === "function"
  );
}

async function loadStylesheet(id: string, base: string) {
  const resolved = resolvePath(stylesheetResolver, id, base);

  return {
    base: path.dirname(resolved),
    content: await readFile(resolved, "utf8"),
    path: resolved,
  };
}

async function loadModule(id: string, base: string) {
  const resolved = resolvePath(moduleResolver, id, base);
  const namespace: unknown = await import(pathToFileURL(resolved).href);

  if (typeof namespace === "object" && namespace !== null && "default" in namespace) {
    return { base: path.dirname(resolved), module: namespace.default, path: resolved };
  }

  return { base: path.dirname(resolved), module: namespace, path: resolved };
}

async function loadDesignSystem({ base, css, tailwind }: Project) {
  const module: unknown = await import(pathToFileURL(tailwind).href);

  if (!isTailwindModule(module)) {
    throw new Error(`${tailwind} does not expose the Tailwind CSS v4 design system API.`);
  }

  return module.__unstable__loadDesignSystem(css, { base, loadModule, loadStylesheet });
}

async function getDesignSystem(project: Project) {
  const key = `${project.base}\0${project.css}`;
  const cached = designSystems.get(key);

  if (cached !== undefined) {
    return cached;
  }

  const designSystem = loadDesignSystem(project);

  designSystems.set(key, designSystem);

  return designSystem;
}

export async function getDesignSystems(project: Project) {
  const [designSystem, baseline] = await Promise.all([
    getDesignSystem(project),
    getDesignSystem({ ...project, css: DEFAULT_CSS }),
  ]);

  return { baseline, designSystem };
}
