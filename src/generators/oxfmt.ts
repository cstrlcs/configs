import config from "./oxfmt-config.ts";
import { writePreset } from "./write-preset.ts";

await writePreset("oxfmt", "base", config);
