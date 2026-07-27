import axios from "axios";
import { httpClient } from "../http/httpClient";
import { BoundaryServiceError } from "./boundary.errors";
import {
  assertBuildableSpaceRequest,
  parseBuildableSpaceErrorResponse,
  parseBuildableSpaceResponse,
} from "./boundary.validators";
import type {
  BuildableSpaceErrorResponse,
  BuildableSpaceRequest,
  BuildableSpaceResponse,
} from "./boundary.api.types";

const readFlowIdHeader = (headers: unknown): string | undefined => {
  if (typeof headers !== "object" || headers === null) {
    return undefined;
  }

  const headerRecord = headers as Record<string, unknown>;
  const directValue = headerRecord["x-flow-id"];

  if (typeof directValue === "string" && directValue.length > 0) {
    return directValue;
  }

  const get = headerRecord.get;
  if (typeof get === "function") {
    const getValue = get.call(headers, "x-flow-id") as unknown;
    if (typeof getValue === "string" && getValue.length > 0) {
      return getValue;
    }
  }

  return undefined;
};

const assertFlowIdConsistency = (
  bodyFlowId: string,
  headerFlowId: string | undefined,
): void => {
  if (headerFlowId !== undefined && headerFlowId !== bodyFlowId) {
    throw new BoundaryServiceError({
      kind: "invalid_response",
      message: "The buildable-space response flow ID does not match X-Flow-ID.",
      flowId: headerFlowId,
    });
  }
};

const parseSuccessResponse = (
  data: unknown,
  status: number,
  headerFlowId: string | undefined,
): BuildableSpaceResponse => {
  try {
    const result = parseBuildableSpaceResponse(data);
    assertFlowIdConsistency(result.flow_id, headerFlowId);
    return result;
  } catch (error: unknown) {
    if (
      error instanceof BoundaryServiceError &&
      error.kind === "invalid_response"
    ) {
      throw new BoundaryServiceError({
        kind: "invalid_response",
        message: error.message,
        status,
        flowId: error.flowId ?? headerFlowId,
        cause: error,
      });
    }

    throw error;
  }
};

const parseErrorResponse = (
  data: unknown,
  status: number,
  headerFlowId: string | undefined,
): BuildableSpaceErrorResponse => {
  try {
    const result = parseBuildableSpaceErrorResponse(data);
    assertFlowIdConsistency(result.flow_id, headerFlowId);
    return result;
  } catch (error: unknown) {
    if (
      error instanceof BoundaryServiceError &&
      error.kind === "invalid_response"
    ) {
      throw new BoundaryServiceError({
        kind: "invalid_response",
        message: error.message,
        status,
        flowId: error.flowId ?? headerFlowId,
        cause: error,
      });
    }

    throw error;
  }
};

export const calculateBuildableSpace = async (
  request: BuildableSpaceRequest,
): Promise<BuildableSpaceResponse> => {
  assertBuildableSpaceRequest(request);

  try {
    const response = await httpClient.post<unknown>("/buildable-space", request, {
      validateStatus: () => true,
    });
    const headerFlowId = readFlowIdHeader(response.headers);

    if (response.status === 200) {
      return parseSuccessResponse(response.data, response.status, headerFlowId);
    }

    if (response.status === 422 || response.status === 500) {
      const apiError = parseErrorResponse(
        response.data,
        response.status,
        headerFlowId,
      );

      throw new BoundaryServiceError({
        kind: "api_error",
        message: apiError.message,
        status: response.status,
        flowId: apiError.flow_id,
        code: apiError.code,
        stage: apiError.stage,
        details: apiError.details,
      });
    }

    throw new BoundaryServiceError({
      kind: "unexpected_status",
      message: `Unexpected buildable-space HTTP status: ${response.status}.`,
      status: response.status,
      flowId: headerFlowId,
    });
  } catch (error: unknown) {
    if (error instanceof BoundaryServiceError) {
      throw error;
    }

    if (axios.isAxiosError(error)) {
      throw new BoundaryServiceError({
        kind: "transport",
        message: "Unable to communicate with the buildable-space API.",
        status: error.response?.status,
        flowId: readFlowIdHeader(error.response?.headers),
        cause: error,
      });
    }

    throw new BoundaryServiceError({
      kind: "transport",
      message: "Unexpected failure while calling the buildable-space API.",
      cause: error,
    });
  }
};
