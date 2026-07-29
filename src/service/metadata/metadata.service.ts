import type { WorkspaceMetadata } from "../../types";
import { createApiUrl, readApiFailure, readResponseBody } from "../http";
import { MetadataServiceError } from "./metadata.errors";
import { fromMetadataApiResponse } from "./metadata.mapper";
import { parseMetadataResponse } from "./metadata.validators";

export const METADATA_PATH = "/metadata";

const isAbortError = (error: unknown): boolean =>
  typeof DOMException !== "undefined" &&
  error instanceof DOMException &&
  error.name === "AbortError";

export const getMetadata = async (
  options: { signal?: AbortSignal; fetchImplementation?: typeof fetch } = {},
): Promise<WorkspaceMetadata> => {
  const fetchImplementation = options.fetchImplementation ?? fetch;
  let response: Response;

  try {
    response = await fetchImplementation(createApiUrl(METADATA_PATH), {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: options.signal,
    });
  } catch (error: unknown) {
    if (options.signal?.aborted || isAbortError(error)) {
      throw new MetadataServiceError({
        kind: "aborted",
        message: "The metadata request was aborted.",
        cause: error,
      });
    }
    throw new MetadataServiceError({
      kind: "transport",
      message: "Unable to connect to the metadata API.",
      cause: error,
    });
  }

  if (!response.ok) {
    const failure = await readApiFailure(response);
    throw new MetadataServiceError({
      kind: "api_error",
      message:
        failure.message ??
        `Metadata request failed with HTTP status ${response.status}.`,
      status: response.status,
      code: failure.code,
      stage: failure.stage,
      details: failure.details ?? failure.body,
    });
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new MetadataServiceError({
      kind: "invalid_response",
      message: "The metadata API returned a non-JSON response.",
      status: response.status,
    });
  }

  const body = await readResponseBody(response);
  return fromMetadataApiResponse(parseMetadataResponse(body));
};
