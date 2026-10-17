import { readdirSync } from "node:fs";

import plugin from "./index.ts";

const RULE_FILES = new Set(["fixtures", "rule.test.ts", "rule.ts"]);
const WORKER_FILES = new Set([...RULE_FILES, "analysis.ts"]);
const rulesDirectory = `${import.meta.dirname}/rules`;

const ruleFolders = readdirSync(rulesDirectory).flatMap((domain) =>
  readdirSync(`${rulesDirectory}/${domain}`)
    .filter((name) => name !== "shared")
    .map((name) => ({
      allowed: domain === "tailwind" ? WORKER_FILES : RULE_FILES,
      name,
      path: `${rulesDirectory}/${domain}/${name}`,
    })),
);

const strayFiles = ruleFolders.flatMap(({ allowed, path }) =>
  readdirSync(path)
    .filter((file) => !allowed.has(file))
    .map((file) => `${path}/${file}`),
);

describe("cstrlcs plugin", () => {
  test("registers every rule folder under the folder's name", () => {
    expect.assertions(1);

    expect(Object.keys(plugin.rules).toSorted()).toStrictEqual(
      ruleFolders.map(({ name }) => name).toSorted(),
    );
  });

  test("keeps only rule.ts, rule.test.ts, fixtures and Tailwind's analysis.ts in rule folders", () => {
    expect.assertions(1);
    expect(strayFiles).toStrictEqual([]);
  });
});
