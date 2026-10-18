import { RuleTester } from "oxlint/plugins-dev";

import { reactNoLegacyApis } from "./rule.ts";

const LANGUAGE_OPTIONS = { parserOptions: { lang: "tsx" as const } };

function repeated(messageId: string, count: number) {
  return Array.from({ length: count }, () => ({ messageId }));
}

function projectOf(name: string) {
  return { cwd: `${import.meta.dirname}/fixtures/${name}`, languageOptions: LANGUAGE_OPTIONS };
}

new RuleTester(projectOf("react-19")).run("react-no-legacy-apis", reactNoLegacyApis, {
  invalid: [
    {
      code: `import { forwardRef } from "react";
const SearchField = forwardRef((props) => <input {...props} />);`,
      errors: [{ messageId: "forwardRef" }],
      output: `import { forwardRef } from "react";
const SearchField = ({ ref, ...props }) => <input {...props} />;`,
    },
    {
      code: `import { forwardRef } from "react";
const OrderRow = forwardRef(function (props) {
  return <tr {...props} />;
});`,
      errors: [{ messageId: "forwardRef" }],
      output: `import { forwardRef } from "react";
const OrderRow = function ({ ref, ...props }) {
  return <tr {...props} />;
};`,
    },
    {
      code: `import React from "react";
const Avatar = React.forwardRef(function Avatar(props, ref) {
  return <img ref={ref} alt="" {...props} />;
});`,
      errors: [{ messageId: "forwardRef" }],
      output: `import React from "react";
const Avatar = function Avatar({ ref, ...props }) {
  return <img ref={ref} alt="" {...props} />;
};`,
    },
    {
      code: `import * as React from "react";
interface InvoiceCardProps {
  total: number;
}
const InvoiceCard = React.forwardRef<HTMLDivElement, InvoiceCardProps>(function InvoiceCard(props, ref) {
  return <div ref={ref}>{props.total}</div>;
});`,
      errors: [{ messageId: "forwardRef" }],
      output: `import * as React from "react";
interface InvoiceCardProps {
  total: number;
}
const InvoiceCard = function InvoiceCard({ ref, ...props }: InvoiceCardProps & { ref?: React.Ref<HTMLDivElement> }) {
  return <div ref={ref}>{props.total}</div>;
};`,
    },
    {
      code: `import * as React from "react";
const PriceTag = React.forwardRef<HTMLSpanElement, { amount: string }>(function PriceTag({ amount }, tagRef) {
  return <span ref={tagRef}>{amount}</span>;
});`,
      errors: [{ messageId: "forwardRef" }],
      output: `import * as React from "react";
const PriceTag = function PriceTag({ ref: tagRef, amount }: { amount: string } & { ref?: React.Ref<HTMLSpanElement> }) {
  return <span ref={tagRef}>{amount}</span>;
};`,
    },
    {
      code: `import * as React from "react";
const Component = React.forwardRef<HTMLElement, { foo: string; bar: number }>(({ foo, ...rest }, ref) => (
  <div ref={ref} {...rest}>{foo}</div>
));`,
      errors: [{ messageId: "forwardRef" }],
      output: `import * as React from "react";
const Component = ({ ref, foo, ...rest }: { foo: string; bar: number } & { ref?: React.Ref<HTMLElement> }) => (
  <div ref={ref} {...rest}>{foo}</div>
);`,
    },
    {
      code: `import * as React from "react";
const Component = React.forwardRef<HTMLElement, A | B>((props, ref) => <div ref={ref} />);`,
      errors: [{ messageId: "forwardRef" }],
      output: `import * as React from "react";
const Component = ({ ref, ...props }: (A | B) & { ref?: React.Ref<HTMLElement> }) => <div ref={ref} />;`,
    },
    {
      code: `import { forwardRef, type Ref } from "react";
const Input = forwardRef((props: Props, ref: Ref<HTMLInputElement>) => <input ref={ref} {...props} />);
const Field = forwardRef<HTMLInputElement, Props>((props, ref) => <input ref={ref} {...props} />);`,
      errors: [{ messageId: "forwardRef" }, { messageId: "forwardRef" }],
      output: `import { forwardRef, type Ref } from "react";
const Input = ({ ref, ...props }: Props & { ref?: Ref<HTMLInputElement> }) => <input ref={ref} {...props} />;
const Field = ({ ref, ...props }: Props & { ref?: Ref<HTMLInputElement> }) => <input ref={ref} {...props} />;`,
    },
    {
      code: `import { forwardRef } from "react";
const Component = forwardRef(() => null);
const Label = forwardRef(({ text }) => <span>{text}</span>);`,
      errors: [{ messageId: "forwardRef" }, { messageId: "forwardRef" }],
      output: `import { forwardRef } from "react";
const Component = () => null;
const Label = ({ text }) => <span>{text}</span>;`,
    },
    {
      code: `import * as React from "react";
const Toolbar = (React.forwardRef as any)((props) => {
  return <menu {...props} />;
});`,
      errors: [{ messageId: "forwardRef" }],
      output: `import * as React from "react";
const Toolbar = ({ ref, ...props }) => {
  return <menu {...props} />;
};`,
    },
    {
      code: `import { forwardRef as wrap } from "react";
const Component = wrap(props => <div {...props} />);`,
      errors: [{ messageId: "forwardRef" }],
      output: `import { forwardRef as wrap } from "react";
const Component = ({ ref, ...props }) => <div {...props} />;`,
    },
    {
      code: `import { forwardRef, memo } from "react";
export const Button = memo(forwardRef(function Button(props, ref) {
  return <button ref={ref} {...props} />;
}));`,
      errors: [{ messageId: "forwardRef" }],
      output: `import { forwardRef, memo } from "react";
export const Button = memo(function Button({ ref, ...props }) {
  return <button ref={ref} {...props} />;
});`,
    },
    {
      code: `import { forwardRef } from "react";
export default forwardRef(function Button(props, ref) {
  return <button ref={ref} {...props} />;
});`,
      errors: [{ messageId: "forwardRef" }],
      output: `import { forwardRef } from "react";
export default function Button({ ref, ...props }) {
  return <button ref={ref} {...props} />;
};`,
    },
    {
      code: `const { forwardRef } = require("react");
const Box = forwardRef((props) => null);
const Other = React.forwardRef((props) => null);`,
      errors: [{ messageId: "forwardRef" }, { messageId: "forwardRef" }],
      output: `const { forwardRef } = require("react");
const Box = ({ ref, ...props }) => null;
const Other = ({ ref, ...props }) => null;`,
    },
    {
      code: `import { forwardRef } from "react";
const ref = 1;
const Input = forwardRef<HTMLInputElement, Props>((props, ref) => <input ref={ref} {...props} />);
const Field = forwardRef((props: Props, ref) => <input ref={ref} {...props} />);
const Empty = forwardRef<HTMLElement, Props>(() => null);
const Box = forwardRef((props) => <div data-ref={ref} {...props} />);
const Own = forwardRef(({ ref, ...props }, forwarded) => <div ref={forwarded} {...props} />);
const Either = forwardRef((props) => null) || Fallback;`,
      errors: repeated("forwardRef", 6),
    },
    {
      code: `import { forwardRef } from "react";
const Button = 1;
export default forwardRef(function Button(props, ref) {
  return <button ref={ref} {...props} />;
});`,
      errors: [{ messageId: "forwardRef" }],
    },
    {
      code: `import { useContext } from "react";
export const Component = () => {
  const value = useContext(MyContext);
  const other = useContext(OtherContext);
  return <div>{value}{other}</div>;
};`,
      errors: [{ messageId: "useContext" }, { messageId: "useContext" }],
      output: `import { use } from "react";
export const Component = () => {
  const value = use(MyContext);
  const other = use(OtherContext);
  return <div>{value}{other}</div>;
};`,
    },
    {
      code: `import React from "react";
const value = React.useContext(MyContext);`,
      errors: [{ messageId: "useContext" }],
      output: `import React from "react";
const value = React.use(MyContext);`,
    },
    {
      code: `import { use, useContext } from "react";
const value = useContext(MyContext);`,
      errors: [{ messageId: "useContext" }],
      output: `import { use, useContext } from "react";
const value = use(MyContext);`,
    },
    {
      code: `import { useContext as read } from "react";
const value = read(MyContext);`,
      errors: [{ messageId: "useContext" }],
      output: `import { use as read } from "react";
const value = read(MyContext);`,
    },
    {
      code: `import { useContext } from "react";
const value = useContext(MyContext);
export { useContext };`,
      errors: [{ messageId: "useContext" }],
    },
    {
      code: `import { useContext } from "react";
function useTheme(use: number) {
  return useContext(ThemeContext);
}`,
      errors: [{ messageId: "useContext" }],
    },
    {
      code: `import { createContext } from "react";
const ThemeContext = createContext(null);
export function ThemeProvider({ children }) {
  return <ThemeContext.Provider value="dark">{children}</ThemeContext.Provider>;
}`,
      errors: [{ data: { context: "ThemeContext" }, messageId: "contextProvider" }],
      output: `import { createContext } from "react";
const ThemeContext = createContext(null);
export function ThemeProvider({ children }) {
  return <ThemeContext value="dark">{children}</ThemeContext>;
}`,
    },
    {
      code: `import * as React from "react";
const Theme = React.createContext<string>("light");
export const App = () => <Theme.Provider value="dark" />;`,
      errors: [{ data: { context: "Theme" }, messageId: "contextProvider" }],
      output: `import * as React from "react";
const Theme = React.createContext<string>("light");
export const App = () => <Theme value="dark" />;`,
    },
    {
      code: `<>
  <Context.Provider>{children}</Context.Provider>
  <ThemeContext.Provider><App /></ThemeContext.Provider>
  <contexts.ThemeContext.Provider value={1} />
</>;`,
      errors: [
        { data: { context: "Context" }, messageId: "contextProvider" },
        { data: { context: "ThemeContext" }, messageId: "contextProvider" },
        { data: { context: "contexts.ThemeContext" }, messageId: "contextProvider" },
      ],
    },
    {
      code: `import React from "react";
import ReactDOM from "react-dom";
const rootEl = document.getElementById("app")!;
ReactDOM.render(<Component />, rootEl);`,
      errors: [{ messageId: "render" }],
      output: `import { createRoot } from "react-dom/client";
import React from "react";
import ReactDOM from "react-dom";
const rootEl = document.getElementById("app")!;
createRoot(rootEl).render(<Component />);`,
    },
    {
      code: `import { render } from "react-dom";
(render as typeof render)(<Dashboard />, mountNode);`,
      errors: [{ messageId: "render" }],
      output: `import { createRoot } from "react-dom/client";
import { render } from "react-dom";
createRoot(mountNode).render(<Dashboard />);`,
    },
    {
      code: `import { render } from "react-dom";
import { createRoot } from "react-dom/client";
render(<App />, container);`,
      errors: [{ messageId: "render" }],
      output: `import { render } from "react-dom";
import { createRoot } from "react-dom/client";
createRoot(container).render(<App />);`,
    },
    {
      code: `import ReactDOM from "react-dom";
ReactDOM.hydrate(<Component />, document.getElementById("app")!);`,
      errors: [{ messageId: "hydrate" }],
      output: `import { hydrateRoot } from "react-dom/client";
import ReactDOM from "react-dom";
hydrateRoot(document.getElementById("app")!, <Component />);`,
    },
    {
      code: `import { hydrate, render } from "react-dom";
const result = render(<A />, container);
render(<A />, container, () => {});
render(<A />);
const root = hydrate(<A />, container);
hydrate();`,
      errors: [...repeated("render", 3), ...repeated("hydrate", 2)],
    },
    {
      code: `import { render } from "react-dom";
const createRoot = 1;
render(<App />, container);`,
      errors: [{ messageId: "render" }],
    },
    {
      code: `ReactDOM.render(<App />, container);`,
      errors: [{ messageId: "render" }],
    },
    {
      code: `import { useFormState } from "react-dom";
function StatefulForm() {
  const [state, formAction] = useFormState(increment, 0);
  return <button formAction={formAction}>{state}</button>;
}`,
      errors: [{ messageId: "useFormState" }],
      output: `import { useActionState } from "react";
import { useFormState } from "react-dom";
function StatefulForm() {
  const [state, formAction] = useActionState(increment, 0);
  return <button formAction={formAction}>{state}</button>;
}`,
    },
    {
      code: `import * as ReactDOM from "react-dom";
function useCounter() {
  return ReactDOM.useFormState(increment, 0);
}`,
      errors: [{ messageId: "useFormState" }],
      output: `import { useActionState } from "react";
import * as ReactDOM from "react-dom";
function useCounter() {
  return useActionState(increment, 0);
}`,
    },
    {
      code: `import { useActionState } from "react";
import ReactDOM from "react-dom";
const counter = ReactDOM.useFormState(increment, 0);`,
      errors: [{ messageId: "useFormState" }],
      output: `import { useActionState } from "react";
import ReactDOM from "react-dom";
const counter = useActionState(increment, 0);`,
    },
    {
      code: `import { useFormState } from "react-dom";
(useFormState as typeof useFormState)(submitOrder);`,
      errors: [{ messageId: "useFormState" }],
      output: `import { useActionState } from "react";
import { useFormState } from "react-dom";
(useActionState)(submitOrder);`,
    },
    {
      code: `import { flushSync, flushSync as fs } from "react-dom";
import * as ReactDOM from "react-dom";
import reactDom from "react-dom";
import { Component } from "react";
flushSync(() => fs(() => setCount(1)));
ReactDOM.flushSync(() => {});
condition && doSomething(reactDom.flushSync(() => {}));
class Store extends Component {
  update = () => flushSync(() => this.setState({ value: 1 }));
}`,
      errors: repeated("flushSync", 5),
    },
    {
      code: `import React, { createRef } from "react";
const { createRef: make } = require("react");
const alias = React.createRef;
export const dialogRef = createRef<HTMLDialogElement>();
const createRefHolder = () => make();
function Component() {
  const first = createRef();
  const second = React.createRef();
  return <div ref={first} data-ref={second} />;
}
function useCustomRef() {
  return alias();
}`,
      errors: repeated("createRef", 5),
    },
  ],
  valid: [
    `import * as React from "react";
const Component = ({ ref, ...props }) => null;`,
    `import { forwardRef } from "preact/compat";
const Panel = forwardRef(() => <div />);`,
    `function forwardRef(render) {
  return render;
}
forwardRef(() => null);`,
    `import { forwardRef } from "react";
function wrap(forwardRef) {
  return forwardRef(() => null);
}`,
    `import React, { use } from "react";
const value = use(MyContext);
const other = React.use(OtherContext);`,
    `import { useContext } from "use-context-selector";
const value = useContext(MyContext);`,
    `<>
  <Context />
  <ThemeContext><App /></ThemeContext>
</>;`,
    `import { Provider } from "jotai";
<Provider>hello world</Provider>;`,
    `import { Tooltip } from "@base-ui-components/react/tooltip";
<Tooltip.Provider>hello world</Tooltip.Provider>;`,
    `import { createContext } from "use-context-selector";
const ThemeContext = createContext(null);
<ThemeContext.Provider value={1} />;`,
    `import { createRoot, hydrateRoot } from "react-dom/client";
createRoot(document.getElementById("app")).render(<Component />);
hydrateRoot(document.getElementById("app"), <Component />);`,
    `import { render } from "@testing-library/react";
render(<Component />);`,
    `const render = createRenderer();
render.start();`,
    `import { useFormState } from "react-hook-form";
const { errors } = useFormState({ control });`,
    `import { destination } from "pino";
destination().flushSync();
const store = { flushSync() {} };
store.flushSync();
store["flushSync"]();`,
    `function flushSync(queue: Job[]) {
  queue.forEach((job) => job.run());
}
flushSync(pendingJobs);`,
    `import React, { createRef, Component } from "react";
class Input extends Component {
  inputRef = createRef();
}
class DialogStore {
  constructor() {
    this.popupRef = React.createRef<HTMLElement>();
  }
}`,
  ],
});

new RuleTester(projectOf("react-18")).run("react-no-legacy-apis on React 18", reactNoLegacyApis, {
  invalid: [
    {
      code: `import ReactDOM from "react-dom";
ReactDOM.render(<Storefront />, document.getElementById("store")!);`,
      errors: [{ messageId: "render" }],
      output: `import { createRoot } from "react-dom/client";
import ReactDOM from "react-dom";
createRoot(document.getElementById("store")!).render(<Storefront />);`,
    },
    {
      code: `import { hydrate } from "react-dom";
hydrate(<Storefront />, shell);`,
      errors: [{ messageId: "hydrate" }],
      output: `import { hydrateRoot } from "react-dom/client";
import { hydrate } from "react-dom";
hydrateRoot(shell, <Storefront />);`,
    },
  ],
  valid: [
    `import { createRef, forwardRef, useContext } from "react";
import { flushSync, useFormState } from "react-dom";
const SearchField = forwardRef((props, ref) => <input ref={ref} {...props} />);
const cart = useContext(CartContext);
const [order, submit] = useFormState(placeOrder, null);
const listRef = createRef<HTMLUListElement>();
flushSync(() => setOpen(true));`,
    `<CartContext.Provider value={cart}>{children}</CartContext.Provider>;`,
  ],
});

new RuleTester(projectOf("react-17")).run("react-no-legacy-apis on React 17", reactNoLegacyApis, {
  invalid: [],
  valid: [
    `import ReactDOM from "react-dom";
ReactDOM.render(<Storefront />, document.getElementById("store"));
ReactDOM.hydrate(<Storefront />, shell);`,
    `import { forwardRef } from "react";
const SearchField = forwardRef((props, ref) => <input ref={ref} {...props} />);`,
  ],
});

new RuleTester(projectOf("without-react")).run(
  "react-no-legacy-apis without react installed",
  reactNoLegacyApis,
  {
    invalid: [],
    valid: [
      `ReactDOM.render(<Storefront />, shell);`,
      `<CartContext.Provider value={cart}>{children}</CartContext.Provider>;`,
      `import { useContext } from "react";
const cart = useContext(CartContext);`,
    ],
  },
);
