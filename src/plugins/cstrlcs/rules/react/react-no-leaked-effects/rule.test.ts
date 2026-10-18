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
      code: 'useEffect(() => { fetch("/api/user"); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { window.fetch("/api/user", {}); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useInsertionEffect(() => { (fetch as any)("/api/user"); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { const ctrl = new AbortController(); fetch("/api/user", { signal: ctrl.signal }); return null; }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: "useEffect(() => { for (const id of ids) { fetch(id); } }, []);",
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { const ctrl = new AbortController(); const signal = "cache"; fetch("/api/user", { [signal]: ctrl.signal }); return () => ctrl.abort(); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { const ctrl = new AbortController(); const options = { signal: ctrl.signal } as RequestInit; fetch("/api/user", options); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { const ctrl = new AbortController(); fetch("/api/user", { ...defaults, signal: ctrl.signal as AbortSignal }); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { const a = new AbortController(); const b = new AbortController(); fetch("/a", { signal: a.signal }); fetch("/b", { signal: b.signal }); return () => a.abort(); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { const a = new AbortController(); const b = new AbortController(); fetch("/a", { signal: a.signal }); return () => (b as AbortController).abort(); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { const ctrl = new AbortController(); fetch("/api/user", { signal: ctrl.signal }); setTimeout(() => ctrl.abort(), 5000); }, []);',
      errors: [{ messageId: "fetch" }, { messageId: "timeout" }],
    },
    {
      code: 'useEffect(() => fetch("/api/user"), []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { const s = getExternalSignal(); const signal = s; fetch("/api/user", { signal }); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { let a = b; let b = a; fetch("/api/user", { signal: b }); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { const request = { signal: getExternalSignal() }; const s = request.signal; fetch("/api/user", { signal: s }); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { const ctrl = new AbortController(); fetch("/api/user", { signal: ctrl.signal }); }, []);\nuseEffect(() => { const ctrl = new AbortController(); return () => ctrl.abort(); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { (async () => { setUser(await (await fetch("/api/user")).json()); })(); }, []);',
      errors: [{ messageId: "fetch" }],
    },
    {
      code: 'useEffect(() => { async function load() { await fetch("/api/user"); } void load(); }, []);',
      errors: [{ messageId: "fetch" }],
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
    'useEffect(() => { const ctrl = new AbortController(); fetch("/api/user", { signal: ctrl.signal }); return () => ctrl.abort(); }, []);',
    'useLayoutEffect(() => { const ctrl = new AbortController(); globalThis.fetch("/api/user", { signal: ctrl.signal! }); return () => (ctrl as AbortController).abort(); }, []);',
    'useEffect(() => { const ctrl = new AbortController(); const s = ctrl?.signal; const options = { signal: s } as RequestInit; fetch("/api/user", options); return () => ctrl.abort(); }, []);',
    'const ctrl = new AbortController(); const s = ctrl.signal; useEffect(() => { const signal = s; fetch("/api/user", { signal }); return () => ctrl.abort(); }, []);',
    'useEffect(() => { const ctrl = new AbortController(); const signal = ctrl.signal; { const signal = other.signal; } fetch("/api/user", { signal }); return () => ctrl.abort(); }, []);',
    'useEffect(() => { const ctrl = new AbortController(); let s = ctrl.signal; s = other.signal; fetch("/api/user", { signal: s }); return () => ctrl.abort(); }, []);',
    'useEffect(() => { const ctrl = new AbortController(); fetch("/api/user", { ...defaults, signal: ctrl.signal }); return function cleanup() { ctrl.abort(); }; }, []);',
    "useEffect(() => { const ctrl = new AbortController(); for (const id of ids) fetch(id, { signal: ctrl.signal }); return () => ctrl.abort(); }, []);",
    'useEffect(() => { const a = new AbortController(); const b = new AbortController(); fetch("/a", { signal: a.signal }); fetch("/b", { signal: b.signal }); return () => { a.abort(); b.abort(); }; }, []);',
    'useEffect(() => { const ctrl = new AbortController(); fetch("/api/user", { signal: ctrl.signal }); return () => { Promise.resolve().then(() => ctrl.abort()); }; }, []);',
    'useEffect(() => { const ctrl = new AbortController(); fetch("/api/user", { signal: ctrl.signal }); return () => { function abort() { ctrl.abort(); } abort(); }; }, []);',
    'useEffect(() => { fetch("/api/user", { signal: getController().signal }); return () => getController().abort(); }, []);',
    'useEffect((signal) => { const s = signal; fetch("/api/user", { signal: s }); }, []);',
    'function useUser(options) { useEffect(() => { fetch("/api/user", { signal: options.signal }); }, [options]); }',
    'useEffect(() => { const onClick = () => fetch("/api/user"); return () => {}; }, []);',
    "useEffect(() => { ids.forEach((id) => fetch(id)); return () => {}; }, []);",
    'function load() { return fetch("/api/user"); } useEffect(() => { load(); }, []);',
    'useEffect(() => () => { fetch("/api/unsubscribe"); }, []);',
    'const ctrl = new AbortController(); useEffect(() => { fetch("/api/user", { signal: ctrl.signal }); }, []);\nuseEffect(() => () => ctrl.abort(), []);',
    'fetch("/api/user"); useEffect(() => {}, [fetch("/api/user")]);',
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
