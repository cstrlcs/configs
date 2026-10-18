import { defineRule } from "@oxlint/plugins";

const DECLARATION_FILE = /\.d\.[cm]?ts$/v;

export const noExportAssignment = defineRule({
  meta: {
    docs: {
      description: 'Forbid "export =" outside declaration files, so modules use ES exports.',
    },
    messages: {
      exportAssignment:
        '"export =" is a CommonJS export. Use export default or named exports instead.',
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    return {
      before() {
        return !DECLARATION_FILE.test(context.filename);
      },
      TSExportAssignment(node) {
        if (node.parent.type === "Program") {
          context.report({ messageId: "exportAssignment", node });
        }
      },
    };
  },
});
