import { RuleTester } from "oxlint/plugins-dev";

import { reactNoMirroredProps } from "./rule.ts";

const LANGUAGE_OPTIONS = { parserOptions: { lang: "tsx" as const } };

function projectOf(name: string) {
  return { cwd: `${import.meta.dirname}/fixtures/${name}`, languageOptions: LANGUAGE_OPTIONS };
}

function mirrored(name: string, seed: string) {
  return [{ data: { name, seed }, messageId: "mirroredProp" }];
}

new RuleTester(projectOf("react-app")).run("react-no-mirrored-props", reactNoMirroredProps, {
  invalid: [
    {
      code: `import { useState } from "react";
function Message({ messageColor }) {
  const [color, setColor] = useState(messageColor);
}`,
      errors: mirrored("messageColor", "initialMessageColor"),
    },
    {
      code: `import { useState } from "react";
function Message(props) {
  const [color, setColor] = useState(props.messageColor);
}`,
      errors: mirrored("messageColor", "initialMessageColor"),
    },
    {
      code: `import * as React from "react";
const CartRow = ({ item: { quantity } }) => {
  const [count, setCount] = React.useState(() => quantity);
};
const PriceTag = ({ price = 0 }: { price?: number }) => {
  const [amount] = React.useState(() => {
    return price;
  });
};`,
      errors: [...mirrored("item", "initialItem"), ...mirrored("price", "initialPrice")],
    },
    {
      code: `import { useReducer, useState } from "react";
function Filters(props) {
  const { query } = props;
  const [filters, dispatch] = useReducer(filtersReducer, props.filters);
  const [search, setSearch] = useState(query ?? "");
  const [owner] = useState(props.owner?.name);
}`,
      errors: [
        ...mirrored("filters", "initialFilters"),
        ...mirrored("query", "initialQuery"),
        ...mirrored("owner", "initialOwner"),
      ],
    },
    {
      code: `import { useState } from "react";
function useSelection({ selected }) {
  return useState(selected);
}`,
      errors: mirrored("selected", "initialSelected"),
    },
    {
      code: `import { useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
function TodoForm() {
  const { data } = useQuery(todoQuery);
  const profile = useSuspenseQuery(profileQuery);
  const [todo, setTodo] = useState(data);
  const [name, setName] = useState(profile.data.name);
}`,
      errors: [
        { data: { name: "data" }, messageId: "query" },
        { data: { name: "profile.data.name" }, messageId: "query" },
      ],
    },
    {
      code: `import { useInfiniteQuery as usePages } from "@tanstack/react-query";
import { useState } from "react";
function Feed() {
  const [pages] = useState(() => usePages(feedQuery).data);
}`,
      errors: [{ data: { name: "usePages(feedQuery).data" }, messageId: "query" }],
    },
    {
      code: `import { use, useState } from "react";
function Comments({ commentsPromise }) {
  const comments = use(commentsPromise);
  const [visible, setVisible] = useState(comments);
  const [author] = useState(use(authorPromise).name);
}`,
      errors: [
        { data: { name: "comments" }, messageId: "use" },
        { data: { name: "use(authorPromise).name" }, messageId: "use" },
      ],
    },
  ],
  valid: [
    `import { useState } from "react";
function Message({ initialColor, defaultOpen }) {
  const [color, setColor] = useState(initialColor);
  const [open, setOpen] = useState(defaultOpen);
}`,
    `import { useState } from "react";
function Counter(props) {
  const [count, setCount] = useState(props.initialCount);
  const [step] = useState(1);
}`,
    `import { useState } from "react";
function useDebouncedValue(value, delay) {
  const [debounced, setDebounced] = useState(value);
}`,
    `import { useState } from "react";
function Gallery({ images }) {
  const [index, setIndex] = useState(0);
  const selected = images[index];
}`,
    `import { useState } from "react";
const DEFAULT_LIMIT = 10;
function Pager() {
  const [limit] = useState(DEFAULT_LIMIT);
  const [now] = useState(() => Date.now());
}`,
    `import { useQuery } from "./queries.ts";
import { useState } from "react";
function Todo() {
  const { data } = useQuery();
  const [todo] = useState(data);
}`,
    `import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
function Todo() {
  const { data } = useQuery(todoQuery);
  const [draft, setDraft] = useState("");
  return data;
}`,
    `import { useMemo } from "react";
function Message({ messageColor }) {
  const color = useMemo(() => messageColor.toUpperCase(), [messageColor]);
}`,
    `function useState(value) {
  return [value];
}
function Message({ messageColor }) {
  useState(messageColor);
}`,
  ],
});

new RuleTester(projectOf("without-react")).run(
  "react-no-mirrored-props without react installed",
  reactNoMirroredProps,
  {
    invalid: [],
    valid: [
      `function Message({ messageColor }) {
  const [color] = useState(messageColor);
}`,
    ],
  },
);
