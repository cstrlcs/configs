import { RuleTester } from "oxlint/plugins-dev";

import { uiMedia } from "./rule.ts";

new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } }).run("ui-media", uiMedia, {
  invalid: [
    {
      code: '<video autoPlay src="/intro.mp4" />;',
      errors: [{ messageId: "autoplayWithSound" }],
    },
    {
      code: '<video autoPlay muted={false} src="/intro.mp4" />;',
      errors: [{ messageId: "autoplayWithSound" }],
    },
    {
      code: '<img alt="" src="/a.jpg" srcSet="/a-480.jpg 480w, /a-960.jpg 960w" />;',
      errors: [{ messageId: "srcSetWithoutSizes" }],
    },
  ],
  valid: [
    "<video autoPlay muted loop playsInline />;",
    "<video autoPlay {...media} />;",
    '<img alt="" srcSet="/a.jpg 1x, /a@2x.jpg 2x" />;',
    '<img alt="" srcSet="/a-480.jpg 480w" sizes="100vw" />;',
    "<audio autoPlay />;",
  ],
});
