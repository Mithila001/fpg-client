import axios from "axios";
import type { JobEventPayload } from "../types";

const BASE_URL = "http://127.0.0.1:8000";
const CLIENT_ID_STORAGE_KEY = "fpg-client-id";

const createClientId = (): string => {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }

  return `client-${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export const getClientId = (): string => {
  if (typeof window === "undefined") return "server-side-client";

  const existing = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (existing) return existing;

  const created = createClientId();
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, created);
  return created;
};

const client = axios.create({
  baseURL: BASE_URL,
});

client.interceptors.request.use((config) => {
  const headers = config.headers ?? {};
  headers["X-Client-Id"] = getClientId();
  config.headers = headers;
  return config;
});

export const jobEventTypes = [
  "JOB_STARTED",
  "initiate_fpg",
  "fpg_generated",
  "refine_1",
  "refine_2",
  "refine_3",
  "post_processed",
  "fpg_score",
  "current_best_updated",
  "success",
  "time_out",
  "fpg_low_score",
  "message",
];

type JobEventHandler = (event: JobEventPayload & { eventName?: string; raw?: string }) => void;

const parseEventPayload = (eventName: string, message: MessageEvent<string>): JobEventPayload => {
  try {
    const data = JSON.parse(message.data) as JobEventPayload;
    return { ...data, event: data.event ?? eventName };
  } catch {
    return {
      event: eventName,
      message: message.data,
    };
  }
};

export const subscribeToJobEvents = (
  jobId: string,
  onEvent: JobEventHandler,
  onError?: (error: Event) => void,
): EventSource => {
  const source = new EventSource(`${BASE_URL}/algorithms/job/${jobId}/events`);

  const handler = (eventName: string) => (message: MessageEvent<string>) => {
    const payload = parseEventPayload(eventName, message);
    onEvent({ ...payload, eventName, raw: message.data });
  };

  jobEventTypes.forEach((eventName) => {
    if (eventName === "message") {
      source.onmessage = handler(eventName);
    } else {
      source.addEventListener(eventName, handler(eventName));
    }
  });

  if (onError) {
    source.addEventListener("error", onError);
  }

  return source;
};

export default client;
