import { defineConfig } from "oxfmt";

export default defineConfig({
  ignorePatterns: [],
  sortImports: {
    newlinesBetween: false,
    order: "asc",
    groups: [
      "type",
      "builtin",
      "external",
      {
        newlinesBetween: true,
      },
      "server",
      {
        newlinesBetween: true,
      },
      "components",
      {
        newlinesBetween: true,
      },
      "modules",
      "internal",
      {
        newlinesBetween: true,
      },
      ["parent", "sibling", "index"],
      "unknown",
    ],
    customGroups: [
      {
        groupName: "components",
        elementNamePattern: ["^@/components/.*$"],
      },
      {
        groupName: "modules",
        elementNamePattern: ["^@/modules/.*$"],
      },
      {
        groupName: "server",
        elementNamePattern: ["^@server/.*$"],
      },
    ],
  },
});
