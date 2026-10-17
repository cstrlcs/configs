import type { CheckedList } from "../shared/finding.ts";

import { finding } from "../shared/finding.ts";

const MARKER_CLASS = /^(?:group|peer)(?:\/\S+)?$/v;

function findUnknown({ classNames, known }: CheckedList) {
  const knownNames = new Set(known);

  return classNames
    .filter((className) => !knownNames.has(className) && !MARKER_CLASS.test(className))
    .map((className) => finding(className, "unknown"));
}

export function findUnknownClasses(lists: CheckedList[]) {
  const tailwindGroups = new Set(
    lists.filter(({ known }) => known.length > 0).map(({ group }) => group),
  );

  return lists.map((list) => (tailwindGroups.has(list.group) ? findUnknown(list) : []));
}
