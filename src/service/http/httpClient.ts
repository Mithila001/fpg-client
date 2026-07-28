import axios from "axios";
import { createApiUrl } from "./apiUrl";

/** Shared JSON client for synchronous API endpoints. */
export const httpClient = axios.create({
  baseURL: createApiUrl(""),
  headers: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
});
