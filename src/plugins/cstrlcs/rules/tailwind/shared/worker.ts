import type { Analysis, ClassList } from "./analysis.ts";
import type { Project } from "./project.ts";
import type { MessagePort } from "node:worker_threads";
import {
  MessageChannel,
  parentPort,
  receiveMessageOnPort,
  Worker,
  workerData,
} from "node:worker_threads";

import { analyze } from "./analysis.ts";
import { getDesignSystems } from "./design-system.ts";

interface Channel {
  kind: typeof CHANNEL_KIND;
  port: MessagePort;
  signal: Int32Array;
}

interface Request {
  lists: ClassList[];
  project: Project;
}

const CHANNEL_KIND = "cstrlcs-tailwindcss";
const TIMEOUT_MS = 60_000;
let connection: ReturnType<typeof connect> | undefined;

function isChannel(value: unknown): value is Channel {
  return (
    typeof value === "object" && value !== null && "kind" in value && value.kind === CHANNEL_KIND
  );
}

function isRequest(value: unknown): value is Request {
  return typeof value === "object" && value !== null && "lists" in value && "project" in value;
}

function isAnalyses(value: unknown): value is Analysis[] {
  return Array.isArray(value);
}

function connect() {
  const signal = new Int32Array(new SharedArrayBuffer(Int32Array.BYTES_PER_ELEMENT));
  const { port1, port2 } = new MessageChannel();
  const channel: Channel = { kind: CHANNEL_KIND, port: port2, signal };

  const worker = new Worker(new URL(import.meta.url), {
    transferList: [port2],
    workerData: channel,
  });

  worker.unref();

  return { port: port1, signal, worker };
}

export function analyzeSync(project: Project, lists: ClassList[]) {
  connection ??= connect();

  const { port, signal, worker } = connection;

  Atomics.store(signal, 0, 0);
  worker.postMessage({ lists, project } satisfies Request, []);

  if (Atomics.wait(signal, 0, 0, TIMEOUT_MS) === "timed-out") {
    connection = undefined;
    port.close();
    void worker.terminate();

    throw new Error("Timed out waiting for the Tailwind CSS design system.");
  }

  const reply = receiveMessageOnPort(port);

  if (reply === undefined) {
    throw new Error("The Tailwind CSS worker did not reply.");
  }

  const message: unknown = reply.message;

  if (message instanceof Error) {
    throw message;
  }

  if (!isAnalyses(message)) {
    throw new TypeError("The Tailwind CSS worker sent an invalid reply.");
  }

  return message;
}

async function respond({ lists, project }: Request) {
  try {
    return analyze(await getDesignSystems(project), lists);
  } catch (error) {
    if (error instanceof Error) {
      return error;
    }

    return new Error("The Tailwind CSS worker failed.", { cause: error });
  }
}

async function serve({ port, signal }: Channel, request: unknown) {
  if (!isRequest(request)) {
    return;
  }

  port.postMessage(await respond(request));
  Atomics.store(signal, 0, 1);
  Atomics.notify(signal, 0);
}

if (isChannel(workerData)) {
  const channel = workerData;

  parentPort?.on("message", (request: unknown) => {
    void serve(channel, request);
  });
}
