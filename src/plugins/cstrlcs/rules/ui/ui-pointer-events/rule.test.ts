import { RuleTester } from "oxlint/plugins-dev";

import { uiPointerEvents } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run(
  "ui-pointer-events",
  uiPointerEvents,
  {
    invalid: [
      {
        code: "<div onMouseDown={start} onPointerUp={end} />;",
        errors: [
          { data: { pointer: "onPointerDown" }, messageId: "mouseOnly" },
          { messageId: "pointerWithoutCancel" },
        ],
      },
      {
        code: "<div onMouseMove={drag} onMouseUp={end} />;",
        errors: [
          { data: { pointer: "onPointerMove" }, messageId: "mouseOnly" },
          { data: { pointer: "onPointerUp" }, messageId: "mouseOnly" },
        ],
      },
    ],
    valid: [
      "<div onPointerDown={start} onPointerUp={end} onPointerCancel={end} />;",
      "<div onMouseEnter={show} onMouseLeave={hide} />;",
      "<div {...handlers} onMouseDown={start} />;",
    ],
  },
);
