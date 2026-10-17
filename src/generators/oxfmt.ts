import { defineConfig } from "oxfmt";

import { writePreset } from "./preset.ts";

const config = defineConfig({
  ignorePatterns: [],
  tabWidth: 2,
  useTabs: false,
  sortTailwindcss: {
    functions: ["clsx", "cn", "cva", "cx", "tv", "twJoin", "twMerge"],
  },
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

await writePreset("oxfmt", "base", config);
