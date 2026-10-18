import { RuleTester } from "oxlint/plugins-dev";

import { reactNaming } from "./rule.ts";

const LANGUAGE_OPTIONS = { parserOptions: { lang: "tsx" as const } };

function named(messageId: string, ...names: string[]) {
  return names.map((name) => ({ data: { name }, messageId }));
}

new RuleTester({
  cwd: `${import.meta.dirname}/fixtures/react-app`,
  languageOptions: LANGUAGE_OPTIONS,
}).run("react-naming", reactNaming, {
  invalid: [
    {
      code: 'import { createContext } from "react";\nexport const cart = createContext<Cart | null>(null);',
      errors: named("contextName", "cart"),
    },
    {
      code: 'import React from "react";\nconst Checkout = React.createContext({ step: 1 });',
      errors: named("contextName", "Checkout"),
    },
    {
      code: "const SessionCtx = React.createContext(null);",
      errors: named("contextName", "SessionCtx"),
    },
    {
      code: "const Billing = react.createContext(null);",
      errors: named("contextName", "Billing"),
    },
    {
      code: 'import * as ReactLib from "react";\nconst Basket = ReactLib.createContext([]);',
      errors: named("contextName", "Basket"),
    },
    {
      code: 'const { createContext } = require("react");\nconst Wallet = createContext(0);',
      errors: named("contextName", "Wallet"),
    },
    {
      code: 'import { createContext as makeStore } from "react";\nconst invoices = makeStore([]);',
      errors: named("contextName", "invoices"),
    },
    {
      code: "const DrawerCONTEXT = createContext(false);",
      errors: named("contextName", "DrawerCONTEXT"),
    },
    {
      code: "const UploadContextValue = createContext(0);",
      errors: named("contextName", "UploadContextValue"),
    },
    {
      code: "const InvoiceContext1 = createContext(null);",
      errors: named("contextName", "InvoiceContext1"),
    },
    {
      code: 'const LOCALE_CONTEXT = createContext("en");',
      errors: named("contextName", "LOCALE_CONTEXT"),
    },
    {
      code: "const CartContext = createContext([]),\n  drawer = createContext(false);",
      errors: named("contextName", "drawer"),
    },
    {
      code: "stores.cartcontext = createContext([]);",
      errors: named("contextName", "cartcontext"),
    },
    {
      code: 'app.providers.locale = createContext("en");',
      errors: named("contextName", "locale"),
    },
    {
      code: 'providers["upload"] = createContext(null);',
      errors: named("contextName", "upload"),
    },
    {
      code: "class Registry {\n  session = createContext(null);\n  ['invoice'] = createContext(null);\n}",
      errors: named("contextName", "session", "invoice"),
    },
    {
      code: "const registry = { checkout: { payment: createContext(null) } };",
      errors: named("contextName", "payment"),
    },
    {
      code: "let drawerState;\n\ndrawerState = createContext(false);",
      errors: named("contextName", "drawerState"),
    },
    {
      code: "primary = secondary = createContext(null);",
      errors: named("contextName", "secondary"),
    },
    {
      code: "const SessionStore = isServer ? createContext(null) : undefined;",
      errors: named("contextName", "SessionStore"),
    },
    {
      code: 'const Locale = createContext("en") ?? fallbackLocale;',
      errors: named("contextName", "Locale"),
    },
    {
      code: 'const Upload = (track("upload"), createContext(null));',
      errors: named("contextName", "Upload"),
    },
    {
      code: 'import { useRef } from "react";\nconst drawer = useRef<HTMLDialogElement>(null);',
      errors: named("refName", "drawer"),
    },
    {
      code: 'import React from "react";\nconst scrollTop = React.useRef(0);',
      errors: named("refName", "scrollTop"),
    },
    {
      code: "const upload = useRef(null);\nconst x = useRef(0);",
      errors: named("refName", "upload", "x"),
    },
    {
      code: "cache.lastInvoice = useRef();",
      errors: named("refName", "lastInvoice"),
    },
    {
      code: "const handles = { drawer: useRef(null) };",
      errors: named("refName", "drawer"),
    },
    {
      code: "const panelRef = { element: useRef(null) };",
      errors: named("refName", "element"),
    },
    {
      code: "const scroller = isMobile ? useRef(null) : { current: null };",
      errors: named("refName", "scroller"),
    },
    {
      code: "const pointer = (useRef as typeof useRef)(null);\nconst anchor = useRef?.(null);",
      errors: named("refName", "pointer", "anchor"),
    },
    {
      code: 'import * as ReactNs from "react";\nconst cursor = ReactNs.useRef(0);',
      errors: named("refName", "cursor"),
    },
    {
      code: 'import { useRef as useBox } from "react";\nclass Tracker {\n  latest = useBox(null);\n}',
      errors: named("refName", "latest"),
    },
    {
      code: 'import { useId } from "react";\nconst fieldName = useId();',
      errors: named("idName", "fieldName"),
    },
    {
      code: "const label = React.useId();\nconst n = useId();",
      errors: named("idName", "label", "n"),
    },
    {
      code: "class SignupForm {\n  email = useId();\n}\n\nfields['password'] = useId();",
      errors: named("idName", "email", "password"),
    },
    {
      code: "const hint = (useId as () => string)();",
      errors: named("idName", "hint"),
    },
    {
      code: "async function issueToken() {\n  const token = await useId();\n\n  return token;\n}",
      errors: named("idName", "token"),
    },
    {
      code: "const useFormatPrice = (cents: number) => {\n  const dollars = cents / 100;\n\n  return dollars.toFixed(2);\n};",
      errors: named("hookPrefix", "useFormatPrice"),
    },
    {
      code: 'function useJoinTags(tags: string[]) {\n  return tags.join(", ");\n}',
      errors: named("hookPrefix", "useJoinTags"),
    },
    {
      code: "export function useCartTotals() {\n  const [items] = useState([]);\n\n  function useLineCount() {\n    return items.length;\n  }\n\n  return [items, useLineCount] as const;\n}",
      errors: named("hookPrefix", "useLineCount"),
    },
    {
      code: "export function useCheckout() {\n  const useStep = () => {\n    const [step] = useState(1);\n\n    return step;\n  };\n\n  return useStep;\n}",
      errors: named("hookPrefix", "useCheckout"),
    },
    {
      code: 'export function useBilling() {\n  const useInvoice = () => {\n    return "draft";\n  };\n\n  return null;\n}',
      errors: named("hookPrefix", "useBilling", "useInvoice"),
    },
    {
      code: 'function useUploads() {\n  return [];\n}\n\nvi.mock("./uploads", () => ({ useUploads }));',
      errors: named("hookPrefix", "useUploads"),
    },
    {
      code: "function useCurrentUser() {\n  // return useContext(UserContext);\n  return GUEST_USER;\n}",
      errors: named("hookPrefix", "useCurrentUser"),
    },
    {
      code: "const cartApi = {\n  useTotal() {\n    return 0;\n  },\n};",
      errors: named("hookPrefix", "useTotal"),
    },
    {
      code: "drawer.useOpen = () => true;",
      errors: named("hookPrefix", "useOpen"),
    },
    {
      code: "class Uploads {\n  useQueue = () => [];\n\n  useLimit() {\n    return 3;\n  }\n}",
      errors: named("hookPrefix", "useQueue", "useLimit"),
    },
  ],
  valid: [
    "const Context = createContext<Session | null>(null);",
    'import { createContext } from "react";\nexport const CartContext = createContext<Cart | null>(null);',
    'import React from "react";\nconst SessionContext = React.createContext(null);',
    'const UiContext = createContext("compact");',
    "const drawerContext = React.createContext(false);",
    "stores.CartContext = createContext([]);",
    'providers["LocaleContext"] = createContext("en");',
    "class Registry {\n  UploadContext = createContext(null);\n}",
    "const SessionContext = isServer ? createContext(null) : undefined;",
    'const LocaleContext = createContext("en") ?? fallbackLocale;',
    "const registry = { BillingContext: createContext(null) };",
    'import { createContext } from "react";\ncreateContext({ items: [] });',
    "export default createContext<Cart>([]);",
    "const { Provider } = createContext(null);",
    "const makeCart = () => createContext([]);",
    "export function buildInvoiceContext() {\n  return createContext(null);\n}",
    "const store = (() => createContext(0))();",
    "const tree = <Panel context={createContext(null)} />;",
    'const lookup = { [createContext(null)]: "cart" };',
    "providers[slot] = createContext(null);",
    "const { checkout = createContext(null) } = registry;",
    "export default { cart: createContext([]) };",
    "class Registry {\n  #session = createContext(null);\n}",
    "const providers = [createContext(null)];",
    "const merged = { ...createContext(null) };",
    "const merged = { [slot]: createContext(null) };",
    "const SessionProvider = createContext(null).Provider;",
    "const ready = (createContext(null), boot());",
    'import { createContext } from "use-context-selector";\nconst cart = createContext([]);',
    "function setup(createContext: () => unknown) {\n  const cart = createContext();\n}",
    'import { useRef } from "react";\nconst ref = useRef<HTMLFormElement | null>(null);',
    "const timerRef = useRef(0);",
    'import React from "react";\nconst drawerRef = React.useRef<HTMLDialogElement>(null);',
    "cache.invoiceRef = useRef();",
    "const scrollRef = useRef(null) ?? fallbackRef;",
    "const latest = (cursorRef = useRef(0));",
    "const cell = grid[useRef(null)!];",
    'import { useRef } from "react";\nuseRef<HTMLCanvasElement | null>(null);',
    "const snapshot = useRef({ total: 0 }).current;",
    "const snapshot = React.useRef([]).current;",
    "const current = (useRef(null) as { current: null } | null)!.current;",
    "const current = useRef(null)?.current;",
    "const formRef = useRef(null) as MutableRefObject<null>;",
    "const [handle] = [useRef(null)];",
    "const { handle } = { handle: useRef(null) };",
    "export const useDrawerAnchor = () => useRef<HTMLDivElement>(null);",
    "const canvas = <canvas ref={useRef(null)} />;",
    "const cache = useRefCache(null);",
    'const label = useRef(null) ? "set" : "unset";',
    'const handle = React["useRef"](null);',
    "const total = useRef(0) + 1;",
    "const widget = hooks.useRef(null);",
    'import { useRef } from "preact/hooks";\nconst canvas = useRef(null);',
    "function mount(useRef: () => unknown) {\n  const canvas = useRef();\n}",
    "const react = createStore();\nconst canvas = react.useRef(null);",
    'import { useId as useStableId } from "react";\nconst id = useStableId();',
    "const emailId = useId();",
    'import React from "react";\nconst passwordHintId = React.useId();',
    "outerKey = labelId = useId();",
    "function useFieldId() {\n  return useId();\n}",
    "const field = <label htmlFor={useId()} />;",
    "const fields = { emailId: useId() };",
    `const anchor = \`#\${useId()}\`;`,
    "const size = useId().length;",
    "const slug = slugify(useId());",
    "function* ids() {\n  const next = yield useId();\n}",
    'const token = registry["useId"]();',
    "const useInvoice = (invoiceId: string) => useQuery(invoiceId);",
    "function useInvoice(invoiceId: string) {\n  const query = useQuery(invoiceId);\n\n  return query;\n}",
    "const useInvoice = (invoiceId: string) => {\n  return api.useQuery(invoiceId);\n};",
    "const useNothing = () => {};",
    "export const username = (account: Account) => account.name;",
    `function useCardShadow() {\n  const depth = useSpring(2);\n\n  return useMotionTemplate\`0 0 \${depth}px black\`;\n}`,
    'vi.mock("./session", () => ({\n  useSession: () => sessionStub,\n}));',
    'jest.mock("./i18n", {\n  namedExports: {\n    useLocale: () => "en",\n  },\n});',
    'mock.module("./i18n", {\n  namedExports: {\n    useLocale: () => "en",\n  },\n});',
    "export function useCartBadge() {\n  const read = () => {\n    const [count] = useState(0);\n\n    return count;\n  };\n\n  return read;\n}",
    "function useUploadProgress(files: File[]) {\n  return files.map((file) => useProgress(file));\n}",
    'export const use = typeof React.use === "function" ? React.use : (thenable: Thenable) => thenable.value;',
    "export function use(thenable: Thenable) {\n  return thenable.value;\n}",
    "function useCart() {\n  return use(CartContext);\n}",
    "declare function useCheckout(): Checkout;",
    "function useBadge(count: number): string;\nfunction useBadge(count: number) {\n  return useMemo(() => String(count), [count]);\n}",
    "export function useMDXComponents(components: MDXComponents) {\n  return { ...components, h1: Heading };\n}",
  ],
});

new RuleTester({
  cwd: `${import.meta.dirname}/fixtures/vue-app`,
  languageOptions: LANGUAGE_OPTIONS,
}).run("react-naming without react installed", reactNaming, {
  invalid: [],
  valid: [
    'import { ref } from "vue";\n\nexport function useCounter() {\n  const count = ref(0);\n\n  return { count };\n}',
    "export function useFormatPrice(cents: number) {\n  return (cents / 100).toFixed(2);\n}",
    "const panel = createContext(null);\nconst canvas = useRef(null);\nconst field = useId();",
  ],
});
