import path from "node:path";

export const CONFIG_FILE = /\.config\./v;
export const TEST_FILE = /[._](?:test|spec)\.[cm]?[jt]sx?$/v;

export function isTestOrConfigFile(filename: string) {
  const name = path.basename(filename);

  return TEST_FILE.test(name) || CONFIG_FILE.test(name);
}
