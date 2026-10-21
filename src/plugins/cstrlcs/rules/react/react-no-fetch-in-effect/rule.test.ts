import { RuleTester } from "oxlint/plugins-dev";

import { reactNoFetchInEffect } from "./rule.ts";

const LANGUAGE_OPTIONS = { parserOptions: { lang: "tsx" as const } };

function projectOf(name: string) {
  return { cwd: `${import.meta.dirname}/fixtures/${name}`, languageOptions: LANGUAGE_OPTIONS };
}

function fetching(name: string) {
  return [{ data: { name }, messageId: "fetchInEffect" }];
}

new RuleTester(projectOf("react-app")).run("react-no-fetch-in-effect", reactNoFetchInEffect, {
  invalid: [
    {
      code: `import { useEffect } from "react";
function Profile({ userId }) {
  useEffect(() => {
    fetch(\`/api/users/\${userId}\`).then((response) => response.json()).then(setUser);
  }, [userId]);
}`,
      errors: fetching("fetch"),
    },
    {
      code: `import { useLayoutEffect } from "react";
useLayoutEffect(() => {
  window.fetch("/api/layout");
}, []);`,
      errors: fetching("fetch"),
    },
    {
      code: `import * as React from "react";
React.useEffect(() => {
  (async () => {
    const response = await globalThis.fetch("/api/cart");
    setCart(await response.json());
  })();
}, []);`,
      errors: fetching("fetch"),
    },
    {
      code: `useEffect(() => {
  async function loadOrders() {
    setOrders(await (await fetch("/api/orders")).json());
  }
  void loadOrders();
}, []);`,
      errors: fetching("fetch"),
    },
    {
      code: `import axios from "axios";
import { useEffect } from "react";
useEffect(() => {
  axios.get("/api/invoices").then(({ data }) => setInvoices(data));
  axios("/api/totals");
  axios.post("/api/views", { page: "invoices" });
}, []);`,
      errors: [...fetching("axios.get"), ...fetching("axios"), ...fetching("axios.post")],
    },
    {
      code: `import http from "ky";
import { useEffect } from "react";
useEffect(() => {
  http.get("/api/plans").json().then(setPlans);
  http("/api/usage");
}, []);`,
      errors: [...fetching("http.get"), ...fetching("http")],
    },
    {
      code: `import { $fetch, ofetch } from "ofetch";
import { useEffect } from "react";
useEffect(() => {
  ofetch("/api/teams").then(setTeams);
  $fetch.raw("/api/members");
}, []);`,
      errors: [...fetching("ofetch"), ...fetching("$fetch.raw")],
    },
    {
      code: `import { useEffect } from "react";
useEffect(() => {
  const controller = new AbortController();
  fetch("/api/feed", { signal: controller.signal }).then(setFeed);
  return () => controller.abort();
}, []);`,
      errors: fetching("fetch"),
    },
  ],
  valid: [
    `import { useEffect } from "react";
useEffect(() => {
  document.title = "Orders";
}, []);`,
    `async function loader() {
  return fetch("/api/orders");
}`,
    `import axios from "axios";
function submitOrder(order) {
  return axios.post("/api/orders", order);
}
const onClick = () => fetch("/api/ping");`,
    `import { useEffect } from "react";
function useOrders(fetch) {
  useEffect(() => {
    fetch("/api/orders");
  }, [fetch]);
}`,
    `import axios from "axios";
import { useEffect } from "react";
useEffect(() => {
  const client = axios.create({ baseURL: "/api" });
  if (axios.isCancel(error)) setError(null);
}, []);`,
    `import { get } from "./http.ts";
import { useEffect } from "react";
useEffect(() => {
  get("/api/orders");
}, []);`,
    `import { useMemo } from "react";
useMemo(() => fetch("/api/orders"), []);`,
  ],
});

new RuleTester(projectOf("without-react")).run(
  "react-no-fetch-in-effect without react installed",
  reactNoFetchInEffect,
  {
    invalid: [],
    valid: [
      `useEffect(() => {
  fetch("/api/orders");
}, []);`,
    ],
  },
);
