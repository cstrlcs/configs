import { RuleTester } from "oxlint/plugins-dev";

import { reactNoLeakedEffects } from "./rule.ts";

const LANGUAGE_OPTIONS = { parserOptions: { lang: "tsx" as const } };

function projectOf(name: string) {
  return { cwd: `${import.meta.dirname}/fixtures/${name}`, languageOptions: LANGUAGE_OPTIONS };
}

new RuleTester(projectOf("react-app")).run("react-no-leaked-effects", reactNoLeakedEffects, {
  invalid: [
    {
      code: "useEffect(() => { setTimeout(run, 1000); }, []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "useEffect(() => { window.setTimeout(run, 1000); }, []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "useEffect(() => { (setTimeout as any)(run, 1000); }, []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "useEffect(() => { const id = globalThis.setTimeout(run, 1000); }, []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "useEffect(() => { const id = setTimeout(run, 1000) as number; }, []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "useEffect(() => { return () => { const id = setTimeout(run, 1000); }; }, []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "useEffect(() => { const id = setTimeout(run, 1000); const other = 0; return () => clearTimeout(other); }, []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "React.useLayoutEffect(() => { const id = setTimeout(run, 1000); }, []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "useEffect(() => { let id: number; const schedule = () => { id = setTimeout(run, 1000); }; schedule(); }, []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "useEffect(() => { const id = setTimeout(run, 1000); }, []);\nuseEffect(() => { const id = 0; return () => clearTimeout(id); }, []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "useEffect(() => { const id = setTimeout(run, 1000); const cancel = () => clearTimeout(id); button.onclick = cancel; }, []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "useEffect(memo(() => { const id = setTimeout(run, 1000); return () => clearTimeout(id); }), []);",
      errors: [{ messageId: "timeout" }],
    },
    {
      code: "useEffect(() => { setInterval(tick, 1000); }, []);",
      errors: [{ messageId: "interval" }],
    },
    {
      code: "useLayoutEffect((() => { const id = setInterval(tick, 1000); }) as any, []);",
      errors: [{ messageId: "interval" }],
    },
    {
      code: "useEffect(() => { const id = setInterval(tick, 1000); return () => clearTimeout(id); }, []);",
      errors: [{ messageId: "interval" }],
    },
    {
      code: 'useEffect(() => { window.addEventListener("resize", onResize); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { addEventListener("resize", onResize, { once: true }); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'import { useLayoutEffect as useBrowserEffect } from "react";\nuseBrowserEffect(() => { window.addEventListener("scroll", onScroll); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'import * as React from "react";\nReact.useInsertionEffect(() => { document.addEventListener("keydown", onKey); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'const PANEL_EVENT = "toggle";\nuseEffect(() => { panel.addEventListener(PANEL_EVENT, onToggle); return () => panel.removeEventListener("close", onToggle); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'let dragEvent = "dragstart";\nuseEffect(() => { addEventListener(dragEvent, onDrag); return () => removeEventListener("dragstart", onDrag); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { const a = () => {}; const b = () => {}; addEventListener("resize", a); return () => removeEventListener("resize", b); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { window.addEventListener("resize", () => {}); return () => window.removeEventListener("resize", () => {}); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { addEventListener("resize", onResize); return () => removeEventListener("focus", onResize); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { addEventListener("resize", onResize); return () => document.removeEventListener("resize", onResize); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { window.addEventListener("resize", onResize); return () => globalThis.removeEventListener("resize", onResize); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize, true); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { window.addEventListener("resize", onResize, { capture: true }); return () => window.removeEventListener("resize", onResize, false); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { const options = { capture: true }; window.addEventListener("resize", onResize, options); return () => window.removeEventListener("resize", onResize); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { const options = { capture: true }; addEventListener("resize", onResize, { capture: options.capture }); return () => removeEventListener("resize", onResize); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { addEventListener("resize", onResize, true); addEventListener("resize", onResize); return () => removeEventListener("resize", onResize); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: "useEffect(() => { events.forEach((type) => addEventListener(type, onA)); return () => events.forEach((type) => removeEventListener(type, onB)); }, []);",
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: "useEffect(() => { for (const type of first) addEventListener(type, onA); return () => { for (const type of second) removeEventListener(type, onA); }; }, []);",
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { const { signal, abort } = new AbortController(); addEventListener("resize", onResize, { signal }); return () => abort(); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { const ac = new AbortController(); addEventListener("resize", onResize, { signal: ac.signal }); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { const ac = new AbortController(); addEventListener("resize", onResize, { ["signal"]: ac.signal }); return () => ac.abort(); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { window.removeEventListener("resize", ref.current); return () => window.addEventListener("resize", ref.current); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { setTimeout(() => window.addEventListener("resize", onResize), 100); }, []);',
      errors: [{ messageId: "timeout" }, { messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { addEventListener("resize", onResize); const cleanup = () => removeEventListener("resize", onResize); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { const restore = () => element.removeEventListener("scrollend", restore); const onEnd = () => element.addEventListener("scrollend", restore); element.addEventListener("pointerup", onEnd); return () => element.removeEventListener("pointerup", onEnd); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { const remove = () => removeEventListener("resize", onResize); addEventListener("resize", onResize); }, []);\nuseEffect(() => () => remove(), []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'function Example({ handlers }) { useEffect(() => { function stop() { removeEventListener("resize", onResize); } addEventListener("resize", onResize); return () => handlers.stop(); }, []); }',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { const attach = () => { const stop = () => removeEventListener("resize", onResize); document.addEventListener("pointerup", stop); }; const stop = () => {}; addEventListener("resize", onResize); attach(); return () => stop(); }, []);',
      errors: [{ messageId: "eventListener" }, { messageId: "eventListener" }],
    },
    {
      code: 'useEffect(memo(() => { addEventListener("resize", onResize); return () => removeEventListener("resize", onResize); }), []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'function Example({ emitter }) { useEffect(() => { const window = emitter; window.addEventListener("resize", onResize); return () => removeEventListener("resize", onResize); }, []); }',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: 'useEffect(() => { const onResize = () => {}; addEventListener("resize", onResize); }, []);\nuseEffect(() => { const onResize = () => {}; return () => removeEventListener("resize", onResize); }, []);',
      errors: [{ messageId: "eventListener" }],
    },
    {
      code: "useEffect(() => { new IntersectionObserver(onChange); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { const observer = new IntersectionObserver(onChange) as IntersectionObserver; observer.observe(document.body); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { const observer = new IntersectionObserver(onChange); (observer.observe as any)(document.body); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { const observer = new IntersectionObserver(onChange); observer.observe(document.body); observer.observe(element); return () => observer.unobserve(document.body); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { const observer = new IntersectionObserver(([entry], current) => { if (entry.isIntersecting) current.disconnect(); }); observer.observe(element); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { const observer = new IntersectionObserver(() => observer.disconnect()); observer.observe(element); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { const observer = new IntersectionObserver(() => observer.unobserve(element)); observer.observe(element); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: 'useEffect(() => { const observer = new IntersectionObserver(onChange); for (const item of document.querySelectorAll(".item")) observer.observe(item); return () => { for (const item of document.querySelectorAll(".item")) observer.unobserve(item); }; }, []);',
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { const observer = new IntersectionObserver(onChange); items.forEach((item) => observer.observe(item)); return () => items.forEach((item) => observer.unobserve(item)); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { const observer = new IntersectionObserver(onChange); function init() { observer.observe(document.body); } init(); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { return () => { const observer = new IntersectionObserver(onChange); observer.observe(document.body); }; }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useLayoutEffect(() => { const observer = new IntersectionObserver(onChange); observer.observe(document.body); observer.disconnect(); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { const observer = new IntersectionObserver(onChange); observer.observe(document.body); const cleanup = () => observer.disconnect(); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { const observer = new IntersectionObserver(onChange); observer.observe(document.body); function stop() { observer.disconnect(); } stop(); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { ref.current = new IntersectionObserver(onChange); ref.current.observe(document.body); }, []);",
      errors: [{ messageId: "intersectionObserver" }],
    },
    {
      code: "useEffect(() => { const observer = new ResizeObserver(onResize); observer.observe(element); }, []);",
      errors: [{ messageId: "resizeObserver" }],
    },
  ],
  valid: [
    'useCustomEffect(() => { window.addEventListener("resize", onResize); }, []);',
    'import { useEffect } from "@preact/signals-react";\nuseEffect(() => { setTimeout(flushQueue, 50); }, []);',
    "function Uploader({ useEffect }) { useEffect(() => { setInterval(pollUploads, 2000); }, []); }",
    "const RESIZE_EVENT = \"resize\";\nfunction Gallery() { useEffect(() => { window.addEventListener(RESIZE_EVENT, onResize); return () => window.removeEventListener('resize', onResize); }, []); }",
    "useEffect(() => { addEventListener(\"orientationchange\", onRotate); return () => removeEventListener('orientationchange', onRotate); }, []);",
    "useEffect(() => { const id = setTimeout(run, 1000); return () => clearTimeout(id); }, []);",
    "useEffect(() => { const id = window.setTimeout(run, 1000); return () => window.clearTimeout(id); }, []);",
    "useEffect(() => { const id = setTimeout(run, 1000); return () => globalThis.clearTimeout(id); }, []);",
    "useEffect(() => { const id = global.setTimeout(run, 1000) as number; return () => clearTimeout(id as number); }, []);",
    "useEffect(() => { ref.current = setTimeout(run, 1000); return () => { if (ref.current !== null) clearTimeout(ref.current); }; }, []);",
    "useEffect(() => { let a = null; let b = null; if (ready) { a = setTimeout(run, 1000); b = setTimeout(run, 1000); } return () => { a && clearTimeout(a); b && clearTimeout(b); }; }, []);",
    "useEffect(() => { let id: number; const schedule = () => { id = setTimeout(run, 1000); }; schedule(); return () => { const cancel = () => clearTimeout(id); cancel(); }; }, []);",
    "useEffect(() => { const id = setTimeout(run, 1000); function cancel() { clearTimeout(id); } return cancel; }, []);",
    "useEffect(() => { const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);",
    "function setup() { const id = setTimeout(run, 1000); } useEffect(setup, []);",
    "const onClick = () => { const id = setTimeout(run, 1000); };",
    "const callback = useCallback(() => { const id = setTimeout(run, 1000); }, []);",
    "useEffect(() => {}, [setTimeout(run, 1000)]);",
    "useEffect(setTimeout(run, 1000), []);",
    'import { setTimeout } from "node:timers/promises"; useEffect(() => { void setTimeout(100); }, []);',
    'useEffect(() => { window.addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize); }, []);',
    'useEffect(() => { window.addEventListener("resize", ref.current); return () => window.removeEventListener("resize", ref.current); }, []);',
    'const onResize = useCallback(() => {}, []); useEffect(() => { addEventListener("resize", onResize); return () => removeEventListener("resize", onResize); }, []);',
    'useEffect(() => { addEventListener("resize", onResize, true); return () => removeEventListener("resize", onResize, true); }, []);',
    'useEffect(() => { addEventListener("resize", onResize, false); return () => removeEventListener("resize", onResize); }, []);',
    'useEffect(() => { addEventListener("resize", onResize, { capture: true }); return () => removeEventListener("resize", onResize, { capture: true }); }, []);',
    'useEffect(() => { const options = { capture: true }; addEventListener("resize", onResize, options); return () => removeEventListener("resize", onResize, options); }, []);',
    'useEffect(() => { const options = { capture: true }; addEventListener("resize", onResize, { capture: options.capture }); return () => removeEventListener("resize", onResize, true); }, []);',
    'useEffect(() => { addEventListener("resize", onResize); addEventListener("resize", onResize); return () => removeEventListener("resize", onResize); }, []);',
    'useEffect(() => { addEventListener("resize", onResize); return () => window.removeEventListener("resize", onResize); }, []);',
    'useEffect(() => { self.addEventListener("resize", onResize); return () => removeEventListener("resize", onResize); }, []);',
    'useEffect(() => { window?.addEventListener("resize", onResize, { once: true }); return () => removeEventListener("resize", onResize); }, []);',
    "useEffect(() => { events.forEach((type) => addEventListener(type, onActivity)); return () => events.forEach((name) => removeEventListener(name, onActivity)); }, []);",
    "useEffect(() => { for (const type of events) addEventListener(type, onActivity); return () => { for (const name of events) removeEventListener(name, onActivity); }; }, []);",
    "useEffect(() => { for (const [type, handler] of events) addEventListener(type, handler); return () => { for (const [type, handler] of events) removeEventListener(type, handler); }; }, []);",
    'useEffect(() => { const ac = new AbortController(); target.addEventListener("resize", () => {}, { signal: ac.signal }); return () => ac.abort(); }, []);',
    'useEffect(() => { const ac = new AbortController(); const signal = ac.signal; const alias = signal; target.addEventListener("resize", onResize, { signal: alias }); return () => ac.abort(); }, []);',
    'useEffect(() => { const ac = new AbortController(); const { signal } = ac; addEventListener("resize", onResize, { signal }); return () => ac.abort(); }, []);',
    'const controller = new AbortController(); useEffect(() => { addEventListener("focus", onFocus, { signal: controller.signal }); return () => controller.abort(); }, []);',
    'useEffect((signal) => { addEventListener("resize", () => {}, { signal }); }, []);',
    'function useResize({ signal }) { useEffect(() => { addEventListener("resize", onResize, { signal }); }, [signal]); }',
    'useEffect(() => { (window as Window).addEventListener("resize", onResize as EventListener); return () => window.removeEventListener("resize", onResize); }, []);',
    'useEffect(() => { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", onChange); return () => matchMedia("(prefers-color-scheme: dark)").removeEventListener("change", onChange); }, []);',
    'import { BackHandler } from "react-native"; useEffect(() => { const subscription = BackHandler.addEventListener("hardwareBackPress", onBack); return () => subscription.remove(); }, []);',
    'useEffect(() => { void (async () => { addEventListener("resize", onResize); })(); return () => removeEventListener("resize", onResize); }, []);',
    'useEffect(() => { addEventListener("resize", onResize); return () => { const teardown = () => removeEventListener("resize", onResize); teardown(); }; }, []);',
    'useEffect(() => { function restore() { element.removeEventListener("scrollend", restore); } const onEnd = () => element.addEventListener("scrollend", restore); element.addEventListener("pointerup", onEnd); return () => { element.removeEventListener("pointerup", onEnd); restore(); }; }, []);',
    'useEffect(() => { const handlers = { stop() { removeEventListener("resize", onResize); } }; addEventListener("resize", onResize); return () => handlers.stop(); }, []);',
    'useEffect(() => { const handlers = { "stop": () => removeEventListener("resize", onResize) }; addEventListener("resize", onResize); return () => handlers.stop(); }, []);',
    'useEffect(() => { addEventListener("resize", onResize); function cleanup() { removeEventListener("resize", onResize); } return cleanup; }, []);',
    'useEffect(() => { addEventListener("resize", ref.current); }, []);\nuseLayoutEffect(() => () => removeEventListener("resize", ref.current), []);',
    'useEffect(() => { addEventListener("resize", onResize); return ready ? () => removeEventListener("resize", onResize) : null; }, []);',
    'useEffect(() => {}, [addEventListener("scroll", onScroll)]);',
    'useEffectOnce(() => { addEventListener("resize", onResize); });',
    'const setup = () => addEventListener("resize", onResize); useEffect(setup, []);',
    'class Example extends Component { componentDidMount() { document.addEventListener("click", this.onClick); } }',
    "useEffect(() => { const observer = new IntersectionObserver(onChange); observer.observe(document.body); return () => observer.disconnect(); }, []);",
    "useEffect(() => { const observer = new IntersectionObserver(onChange); observer.observe(document.body as HTMLElement); return () => observer.unobserve(document.body); }, []);",
    "useEffect(() => { const observer = new IntersectionObserver(onChange) as IntersectionObserver; observer.observe(document.body); observer.observe(element!); return () => { observer.unobserve(document.body); observer.unobserve(element!); }; }, []);",
    "useEffect(() => { if (!ref.current) return; const observer = new IntersectionObserver(() => observer.disconnect()); observer.observe(ref.current); return () => observer.disconnect(); }, []);",
    "useEffect(() => { const observer = new IntersectionObserver(onChange); items.forEach((item) => observer.observe(item)); return () => observer.disconnect(); }, []);",
    "useEffect(() => { const observer = new IntersectionObserver(onChange); observer.observe(getElement()); return () => observer.unobserve(getElement()); }, []);",
    "useEffect(() => { const observer = new IntersectionObserver(onChange); function init() { observer.observe(document.body); } init(); return () => observer.disconnect(); }, []);",
    "useEffect(() => { const observer = new IntersectionObserver(onChange); observer.observe(document.body); const cleanup = () => observer.disconnect(); return cleanup; }, []);",
    "let observer; useEffect(() => { observer = new IntersectionObserver(onChange); observer.observe(document.body); }, []);\nuseEffect(() => () => observer.unobserve(document.body), []);",
    "useEffect(identity(() => { const observer = new IntersectionObserver(onChange); observer.observe(document.body); }), []);",
    "const observer = new IntersectionObserver(onChange); observer.observe(document.body); useEffect(() => {}, [new IntersectionObserver(onChange)]);",
    "useEffect(() => { const observer = new IntersectionObserver(onChange); observer.observe(document.body); function stop() { observer.disconnect(); } return () => stop(); }, []);",
    "useEffect(() => { const observer = new IntersectionObserver(onChange); observer.observe(document.body); return () => { if (shouldDisconnect) observer.disconnect(); }; }, []);",
    "useEffect(() => { const observer = new IntersectionObserver(onChange); observer.observe(document.body); const handlers = { stop() { observer.disconnect(); } }; return () => handlers.stop(); }, []);",
    "const ref = useRef(new IntersectionObserver(onChange)); useEffect(() => { ref.current.observe(document.body); }, []);",
    "useLayoutEffect(() => { const observer = new ResizeObserver(onResize); observer.observe(element); return () => observer.disconnect(); }, []);",
  ],
});

new RuleTester(projectOf("without-react")).run(
  "react-no-leaked-effects without react installed",
  reactNoLeakedEffects,
  {
    invalid: [],
    valid: [
      'import { useEffect } from "preact/hooks";\nuseEffect(() => { window.addEventListener("resize", onResize); }, []);',
      "useEffect(() => { setTimeout(flushQueue, 50); }, []);",
    ],
  },
);
