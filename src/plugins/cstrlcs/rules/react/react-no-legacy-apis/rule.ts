import type { FunctionNode, Identifier } from "../shared/nodes.ts";
import type { Context, ESTree, Fixer, Scope, Variable } from "@oxlint/plugins";
import { defineRule } from "@oxlint/plugins";

import { unwrap } from "../shared/nodes.ts";
import { originOf, originOfName } from "../shared/origin.ts";
import { reactMajorVersion } from "../shared/project.ts";
import { findVariable } from "../shared/scope.ts";

const REACT_18_MAJOR = 18;
const REACT_19_MAJOR = 19;

const MINIMUM_MAJORS = new Map([
  ["hydrate", REACT_18_MAJOR],
  ["render", REACT_18_MAJOR],
]);

const LEGACY_CALLS = new Map([
  ["react-dom.flushSync", "flushSync"],
  ["react-dom.hydrate", "hydrate"],
  ["react-dom.render", "render"],
  ["react-dom.useFormState", "useFormState"],
  ["react.createRef", "createRef"],
  ["react.forwardRef", "forwardRef"],
  ["react.useContext", "useContext"],
]);

const EXPRESSION_SLOTS = new Set([
  "ArrayExpression",
  "ExportDefaultDeclaration",
  "JSXExpressionContainer",
  "ReturnStatement",
  "VariableDeclarator",
]);

function moduleScopeOf(scope: Scope) {
  let current = scope;

  while (current.type !== "module" && current.upper !== null) {
    current = current.upper;
  }

  return current;
}

function isNameFree(root: Scope, name: string) {
  const scopes = [root];

  for (const scope of scopes) {
    if (
      scope.set.has(name) ||
      scope.references.some((reference) => reference.identifier.name === name)
    ) {
      return false;
    }

    scopes.push(...scope.childScopes);
  }

  return true;
}

function importFix(
  context: Context,
  node: ESTree.Node,
  { module, name }: Record<"module" | "name", string>,
) {
  const scope = context.sourceCode.getScope(node);
  const source = module === "react-dom" ? "react-dom/client" : module;

  const firstImport = context.sourceCode.ast.body.find(
    (statement) => statement.type === "ImportDeclaration",
  );

  if (originOfName(scope, name) === `${module}.${name}`) {
    return () => [];
  }

  if (firstImport === undefined || !isNameFree(moduleScopeOf(scope), name)) {
    return null;
  }

  return (fixer: Fixer) => [
    fixer.insertTextBefore(firstImport, `import { ${name} } from "${source}";\n`),
  ];
}

function fixRootCall(context: Context, call: ESTree.CallExpression, name: string) {
  const [element, container, ...rest] = call.arguments.map((argument) =>
    argument.type === "SpreadElement" ? null : context.sourceCode.getText(argument),
  );

  const imports = importFix(context, call, { module: "react-dom", name });

  if (
    typeof element !== "string" ||
    typeof container !== "string" ||
    rest.length > 0 ||
    imports === null ||
    call.parent.type !== "ExpressionStatement"
  ) {
    return null;
  }

  const replacement =
    name === "createRoot"
      ? `createRoot(${container}).render(${element})`
      : `hydrateRoot(${container}, ${element})`;

  return (fixer: Fixer) => [...imports(fixer), fixer.replaceText(call, replacement)];
}

function fixUseFormState(context: Context, call: ESTree.CallExpression) {
  const imports = importFix(context, call, { module: "react", name: "useActionState" });

  return imports === null
    ? null
    : (fixer: Fixer) => [...imports(fixer), fixer.replaceText(call.callee, "useActionState")];
}

function renameEverywhere(variable: Variable, specifier: ESTree.ImportSpecifier) {
  const isRenamable =
    isNameFree(moduleScopeOf(variable.scope), "use") &&
    variable.references.every(
      ({ identifier }) =>
        identifier.parent.type === "CallExpression" && identifier.parent.callee === identifier,
    );

  return isRenamable
    ? (fixer: Fixer) => [
        fixer.replaceText(specifier, "use"),
        ...variable.references.map((reference) => fixer.replaceText(reference.identifier, "use")),
      ]
    : null;
}

function renameUseContext(context: Context, callee: Identifier) {
  const scope = context.sourceCode.getScope(callee);
  const variable = findVariable(scope, callee.name);
  const specifier = variable?.defs[0]?.node;

  if (variable === undefined || specifier?.type !== "ImportSpecifier") {
    return null;
  }

  if (specifier.imported.range[0] !== specifier.local.range[0]) {
    return (fixer: Fixer) => [fixer.replaceText(specifier.imported, "use")];
  }

  if (originOfName(scope, "use") === "react.use") {
    return (fixer: Fixer) => [fixer.replaceText(callee, "use")];
  }

  return renameEverywhere(variable, specifier);
}

function fixUseContext(context: Context, call: ESTree.CallExpression) {
  const callee = unwrap(call.callee);

  if (callee.type === "MemberExpression") {
    return (fixer: Fixer) => [fixer.replaceText(callee.property, "use")];
  }

  return callee.type === "Identifier" ? renameUseContext(context, callee) : null;
}

function refTypeName(scope: Scope) {
  const moduleScope = moduleScopeOf(scope);

  for (const { name } of moduleScope.variables) {
    const origin = originOfName(moduleScope, name);

    if (origin === "react" || origin === "react.Ref") {
      return origin === "react" ? `${name}.Ref` : name;
    }
  }

  return null;
}

function annotationOf(parameter: ESTree.ParamPattern | undefined) {
  return parameter !== undefined && "typeAnnotation" in parameter
    ? parameter.typeAnnotation?.typeAnnotation
    : undefined;
}

function typeText(context: Context, type: ESTree.TSType | undefined) {
  if (type === undefined) {
    return "";
  }

  const text = context.sourceCode.getText(type);

  return type.type === "TSTypeReference" || type.type === "TSTypeLiteral" ? text : `(${text})`;
}

function refType(
  context: Context,
  call: ESTree.CallExpression,
  ref: ESTree.ParamPattern | undefined,
) {
  const [target] = call.typeArguments?.params ?? [];
  const annotated = annotationOf(ref);
  const name = refTypeName(context.sourceCode.getScope(call));

  if (annotated !== undefined) {
    return `{ ref?: ${typeText(context, annotated)} }`;
  }

  if (target === undefined) {
    return "";
  }

  return name === null ? null : `{ ref?: ${name}<${context.sourceCode.getText(target)}> }`;
}

function forwardedTypes(context: Context, call: ESTree.CallExpression, render: FunctionNode) {
  const [props, ref] = render.params;
  const [, argument] = call.typeArguments?.params ?? [];
  const propsText = typeText(context, annotationOf(props) ?? argument);
  const refText = refType(context, call, ref);

  if (refText === null || (propsText !== "" && refText === "")) {
    return null;
  }

  const types = [propsText, refText].filter((type) => type !== "");

  return types.length === 0 ? "" : `: ${types.join(" & ")}`;
}

function propsEntries(context: Context, props: ESTree.ParamPattern) {
  if (props.type === "Identifier") {
    return [`...${props.name}`];
  }

  if (
    props.type !== "ObjectPattern" ||
    props.properties.some(
      (property) =>
        property.type === "Property" &&
        property.key.type === "Identifier" &&
        property.key.name === "ref",
    )
  ) {
    return null;
  }

  return props.properties.map((property) => context.sourceCode.getText(property));
}

function refEntry(context: Context, render: FunctionNode, entries: string[]) {
  const [, ref, ...rest] = render.params;

  if (ref?.type === "Identifier" && rest.length === 0) {
    return ref.name === "ref" ? "ref" : `ref: ${ref.name}`;
  }

  if (ref !== undefined) {
    return null;
  }

  if (!entries.some((entry) => entry.startsWith("..."))) {
    return "";
  }

  return isNameFree(context.sourceCode.getScope(render), "ref") ? "ref" : null;
}

function isParenthesized(context: Context, render: FunctionNode, props: ESTree.ParamPattern) {
  const opening = context.sourceCode.getTokenBefore(props);

  return opening?.value === "(" && opening.range[0] >= render.range[0];
}

function forwardedPattern(context: Context, call: ESTree.CallExpression, render: FunctionNode) {
  const [props] = render.params;
  const entries = props === undefined ? null : propsEntries(context, props);
  const ref = entries === null ? null : refEntry(context, render, entries);
  const types = forwardedTypes(context, call, render);

  if (props === undefined || entries === null || ref === null || types === null) {
    return null;
  }

  const pattern = `{ ${[ref, ...entries].filter((entry) => entry !== "").join(", ")} }${types}`;

  return isParenthesized(context, render, props) ? pattern : `(${pattern})`;
}

function isExpressionSlot(call: ESTree.CallExpression) {
  const { parent } = call;

  return (
    EXPRESSION_SLOTS.has(parent.type) ||
    (parent.type === "CallExpression" && parent.callee !== call) ||
    (parent.type === "Property" && parent.value === call)
  );
}

function isFunctionNode(node: ESTree.Argument | undefined): node is FunctionNode {
  return node?.type === "ArrowFunctionExpression" || node?.type === "FunctionExpression";
}

function isRedeclared(context: Context, call: ESTree.CallExpression, render: FunctionNode) {
  return (
    call.parent.type === "ExportDefaultDeclaration" &&
    render.id !== null &&
    moduleScopeOf(context.sourceCode.getScope(call)).set.has(render.id.name)
  );
}

function unwrapCall(call: ESTree.CallExpression, render: FunctionNode, fixer: Fixer) {
  return [
    fixer.removeRange([call.range[0], render.range[0]]),
    fixer.removeRange([render.range[1], call.range[1]]),
  ];
}

function forwardedRender(context: Context, call: ESTree.CallExpression) {
  const [render, ...rest] = call.arguments;

  return isFunctionNode(render) &&
    rest.length === 0 &&
    isExpressionSlot(call) &&
    !isRedeclared(context, call, render)
    ? render
    : null;
}

function fixForwardRef(context: Context, call: ESTree.CallExpression) {
  const render = forwardedRender(context, call);

  if (render === null) {
    return null;
  }

  const [props, ref] = render.params;
  const pattern = forwardedPattern(context, call, render);

  if (props === undefined) {
    return call.typeArguments ? null : (fixer: Fixer) => unwrapCall(call, render, fixer);
  }

  const range: [number, number] = [props.range[0], (ref ?? props).range[1]];

  return pattern === null
    ? null
    : (fixer: Fixer) => [
        ...unwrapCall(call, render, fixer),
        fixer.replaceTextRange(range, pattern),
      ];
}

function initializerOf(scope: Scope, name: string) {
  const declarator = findVariable(scope, name)?.defs[0]?.node;

  return declarator?.type === "VariableDeclarator" && declarator.init !== null
    ? unwrap(declarator.init)
    : null;
}

function contextOrigin(context: Context, identifier: ESTree.JSXIdentifier) {
  const init = initializerOf(context.sourceCode.getScope(identifier), identifier.name);

  if (init?.type !== "CallExpression") {
    return null;
  }

  const callee = unwrap(init.callee);
  const property = callee.type === "MemberExpression" ? callee.property : callee;

  if (originOf(context, callee) === "react.createContext") {
    return "react";
  }

  return property.type === "Identifier" && property.name === "createContext" ? "other" : null;
}

function renameProvider(node: ESTree.JSXOpeningElement, replacement: string, fixer: Fixer) {
  const closing = node.parent.type === "JSXElement" ? node.parent.closingElement : null;

  return [
    fixer.replaceText(node.name, replacement),
    ...(closing === null ? [] : [fixer.replaceText(closing.name, replacement)]),
  ];
}

function checkProvider(context: Context, node: ESTree.JSXOpeningElement) {
  const { name } = node;

  if (name.type !== "JSXMemberExpression" || name.property.name !== "Provider") {
    return;
  }

  const { object } = name;
  const origin = object.type === "JSXIdentifier" ? contextOrigin(context, object) : null;
  const contextName = object.type === "JSXIdentifier" ? object.name : object.property.name;
  const replacement = context.sourceCode.getText(object);

  if (origin === "other" || (origin === null && !contextName.endsWith("Context"))) {
    return;
  }

  context.report({
    data: { context: replacement },
    fix: (fixer) => (origin === "react" ? renameProvider(node, replacement, fixer) : null),
    messageId: "contextProvider",
    node: name,
  });
}

function isInsideClass(context: Context, node: ESTree.Node) {
  return context.sourceCode
    .getAncestors(node)
    .some((ancestor) => "type" in ancestor && ancestor.type === "ClassBody");
}

const repairs = new Map([
  ["forwardRef", fixForwardRef],
  [
    "hydrate",
    (context: Context, call: ESTree.CallExpression) => fixRootCall(context, call, "hydrateRoot"),
  ],
  [
    "render",
    (context: Context, call: ESTree.CallExpression) => fixRootCall(context, call, "createRoot"),
  ],
  ["useContext", fixUseContext],
  ["useFormState", fixUseFormState],
]);

export const reactNoLegacyApis = defineRule({
  meta: {
    docs: {
      description:
        "Forbid React APIs that the installed React version replaced, removed or discourages.",
    },
    fixable: "code",
    messages: {
      contextProvider:
        '"{{context}}.Provider" is no longer needed, because React 19 renders a context as its own provider. Render "{{context}}" instead.',
      createRef:
        '"createRef" is meant for class components. Call useRef in components and hooks, or use a plain { current } object elsewhere.',
      flushSync:
        '"flushSync" forces a synchronous render that hurts performance. Let React batch the update instead.',
      forwardRef:
        '"forwardRef" is no longer needed, because React 19 passes ref as a regular prop. Read ref from props instead.',
      hydrate:
        '"hydrate" is deprecated since React 18 and removed in React 19. Call hydrateRoot(container, element) from react-dom/client instead.',
      render:
        '"render" is deprecated since React 18 and removed in React 19. Call createRoot(container).render(element) from react-dom/client instead.',
      useContext:
        '"useContext" reads a context like use, but use also works after an early return. Call use instead.',
      useFormState:
        '"useFormState" was renamed to useActionState in React 19. Import useActionState from react instead.',
    },
    schema: [],
    type: "problem",
  },
  createOnce(context) {
    let installedMajor = 0;

    return {
      before() {
        installedMajor = reactMajorVersion(context.filename) ?? 0;

        return installedMajor >= REACT_18_MAJOR;
      },
      CallExpression(node) {
        const messageId = LEGACY_CALLS.get(originOf(context, node.callee) ?? "");

        if (
          messageId === undefined ||
          installedMajor < (MINIMUM_MAJORS.get(messageId) ?? REACT_19_MAJOR) ||
          (messageId === "createRef" && isInsideClass(context, node))
        ) {
          return;
        }

        context.report({
          fix: (fixer) => repairs.get(messageId)?.(context, node)?.(fixer) ?? null,
          messageId,
          node: node.callee,
        });
      },
      JSXOpeningElement(node) {
        if (installedMajor >= REACT_19_MAJOR) {
          checkProvider(context, node);
        }
      },
    };
  },
});
