import type { Options, RuleOptionsSchema } from "@oxlint/plugins";

type Json = Options[number];
type JsonRecord = Readonly<Record<string, Json>>;
type Schema = Exclude<RuleOptionsSchema, false | unknown[]>;

interface PathCondition {
  readonly path: string | undefined;
  readonly pathNot: string | undefined;
}

export interface DependencyRule {
  readonly name: string;
  readonly comment: string | undefined;
  readonly from: PathCondition;
  readonly to: PathCondition;
}

const PATTERN: Schema = {
  oneOf: [{ type: "string" }, { items: { type: "string" }, minItems: 1, type: "array" }],
};

const CONDITION: Schema = {
  additionalProperties: false,
  properties: { path: PATTERN, pathNot: PATTERN },
  type: "object",
};

export const DEPENDENCY_RULES_SCHEMA: Schema = {
  items: {
    additionalProperties: false,
    properties: {
      comment: { type: "string" },
      from: CONDITION,
      name: { type: "string" },
      to: CONDITION,
    },
    required: ["name", "to"],
    type: "object",
  },
  type: "array",
};

const regExpCache = new Map<string, RegExp>();

function toRegExp(source: string) {
  let regExp = regExpCache.get(source);

  if (regExp === undefined) {
    regExp = new RegExp(source, "u");
    regExpCache.set(source, regExp);
  }

  return regExp;
}

function isRecord(value: Json | undefined): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toSource(value: Json | undefined) {
  if (typeof value === "string") {
    return value;
  }

  return Array.isArray(value)
    ? value.filter((part): part is string => typeof part === "string").join("|")
    : undefined;
}

function toCondition(value: Json | undefined) {
  const condition = isRecord(value) ? value : {};

  return { path: toSource(condition["path"]), pathNot: toSource(condition["pathNot"]) };
}

function toRule(value: JsonRecord) {
  const { comment, from, name, to } = value;

  return {
    comment: typeof comment === "string" ? comment : undefined,
    from: toCondition(from),
    name: typeof name === "string" ? name : "",
    to: toCondition(to),
  };
}

export function parseDependencyRules(options: Readonly<Options>) {
  return options
    .filter((option): option is JsonRecord => isRecord(option))
    .map((option) => toRule(option));
}

export function matchFrom(rule: DependencyRule, file: string) {
  const { path, pathNot } = rule.from;

  if (pathNot !== undefined && toRegExp(pathNot).test(file)) {
    return;
  }

  if (path === undefined) {
    return [];
  }

  const match = toRegExp(path).exec(file);

  return match === null ? undefined : [...match];
}

function withGroups(source: string | undefined, groups: readonly string[]) {
  return source?.replaceAll(/\$(?<index>[1-9])/gv, (_match, index: string) =>
    RegExp.escape(groups[Number(index)] ?? ""),
  );
}

export function matchTo(rule: DependencyRule, groups: readonly string[], target: string) {
  const path = withGroups(rule.to.path, groups);
  const pathNot = withGroups(rule.to.pathNot, groups);

  return (
    (path === undefined || toRegExp(path).test(target)) &&
    (pathNot === undefined || !toRegExp(pathNot).test(target))
  );
}
