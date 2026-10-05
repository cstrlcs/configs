export type JsonObject = Readonly<Record<string, unknown>>;
export const EMPTY_OBJECT: JsonObject = {};

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function decodeJsonObject(text: string, parse: (text: string) => unknown = JSON.parse) {
  try {
    const value = parse(text);

    return isJsonObject(value) ? value : null;
  } catch {
    return null;
  }
}

export function parseJsonObject(text: string) {
  return decodeJsonObject(text) ?? EMPTY_OBJECT;
}

export function stringField(object: JsonObject, key: string) {
  const value = object[key];

  return typeof value === "string" ? value : "";
}

export function objectField(object: JsonObject, key: string) {
  const value = object[key];

  return isJsonObject(value) ? value : EMPTY_OBJECT;
}

export function dependencies(packageJson: JsonObject) {
  return {
    ...objectField(packageJson, "dependencies"),
    ...objectField(packageJson, "devDependencies"),
  };
}

export function declaredDependencyVersion(packageJson: JsonObject, name: string) {
  return stringField(dependencies(packageJson), name);
}
