import type { AstNode, DesignSystem } from "../shared/design-system.ts";

import { finding } from "../shared/finding.ts";

function collectProperties(nodes: AstNode[], path: string, properties: Map<string, Set<string>>) {
  for (const node of nodes) {
    if (node.kind === "declaration" && node.value !== undefined) {
      properties.set(path, (properties.get(path) ?? new Set()).add(node.property));
    } else if (node.kind === "rule") {
      collectProperties(node.nodes, `${path}${node.selector}`, properties);
    } else if (node.kind === "at-rule") {
      collectProperties(node.nodes, `${path}@${node.name} ${node.params}`, properties);
    }
  }
}

function findProperties(designSystem: DesignSystem, className: string) {
  const properties = new Map<string, Set<string>>();

  for (const candidate of designSystem.parseCandidate(className)) {
    const [compiled] = designSystem.compileAstNodes(candidate);

    if (compiled?.node.kind === "rule") {
      collectProperties(compiled.node.nodes, "", properties);
    }
  }

  const [scope, ...others] = properties.entries();

  if (scope === undefined || others.length > 0) {
    return;
  }

  return { path: scope[0], properties: [...scope[1]].toSorted() };
}

export function findConflicts(designSystem: DesignSystem, classNames: string[]) {
  const groups = new Map<string, { classNames: string[]; properties: string[] }>();

  for (const className of classNames) {
    const scoped = findProperties(designSystem, className);

    if (scoped !== undefined) {
      const key = `${scoped.path}\0${scoped.properties.join(" ")}`;
      const group = groups.get(key) ?? { classNames: [], properties: scoped.properties };

      group.classNames.push(className);
      groups.set(key, group);
    }
  }

  return [...groups.values()]
    .filter((group) => group.classNames.length > 1)
    .flatMap((group) =>
      group.classNames.map((className) =>
        finding(className, "conflicting", {
          others: group.classNames.filter((other) => other !== className).join(", "),
          properties: group.properties.join(", "),
        }),
      ),
    );
}
