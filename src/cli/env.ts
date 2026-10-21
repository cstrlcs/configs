const AUTOMATION_ENVIRONMENT_VARIABLES = [
  "CI",
  "CLAUDECODE",
  "CURSOR_AGENT",
  "CODEX_CI",
  "OPENCODE",
  "AMP_HOME",
];

export const isAutomated = AUTOMATION_ENVIRONMENT_VARIABLES.some(
  (name) => Bun.env[name] !== undefined,
);
