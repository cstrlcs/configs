const CAMEL_CASE = /^[a-z][a-z0-9]*(?:[A-Z][a-z0-9]+)*[A-Z]?$/v;
const PASCAL_CASE = /^[A-Z][a-z0-9]*(?:[A-Z][a-z0-9]+)*[A-Z]?$/v;
const CONSTANT_CASE = /^[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)*$/v;
const INTERFACE_PREFIX = /^I[A-Z][a-z]/v;
const BOOLEAN_PREFIX = /^(?:is|has|can|should|did|will)[A-Z0-9]/v;
const CONSTANT_BOOLEAN_PREFIX = /^(?:IS|HAS|CAN|SHOULD|DID|WILL)_/v;
const PRODUCER_NAME = /^(?:build|create|fetch|find|get|load|make|parse|read|to)[A-Z0-9]/v;

export type Casing = "camelCase" | "constantCase" | "pascalCase";

export function matchesCasing(name: string, casing: Casing) {
  if (casing === "pascalCase") {
    return PASCAL_CASE.test(name);
  }

  if (casing === "constantCase") {
    return CONSTANT_CASE.test(name);
  }

  return name === "_" || CAMEL_CASE.test(name);
}

export function hasInterfacePrefix(name: string) {
  return INTERFACE_PREFIX.test(name);
}

export function hasBooleanPrefix(name: string) {
  return BOOLEAN_PREFIX.test(name) || CONSTANT_BOOLEAN_PREFIX.test(name);
}

export function isProducerName(name: string) {
  return PRODUCER_NAME.test(name);
}
