export interface ApiErrorPayload {
  code: string;
  message: string;
  stage: string;
  details: Record<string, unknown>;
}

export interface ApiErrorEnvelope {
  error: ApiErrorPayload;
}

export interface ParsedApiFailure {
  message: string | null;
  code?: string;
  stage?: string;
  details?: Record<string, unknown>;
  body: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const parseApiErrorEnvelope = (
  value: unknown,
): ApiErrorPayload | null => {
  if (!isRecord(value) || !isRecord(value.error)) {
    return null;
  }

  const { error } = value;
  if (
    typeof error.code !== "string" ||
    typeof error.message !== "string" ||
    typeof error.stage !== "string" ||
    !isRecord(error.details)
  ) {
    return null;
  }

  return {
    code: error.code,
    message: error.message,
    stage: error.stage,
    details: error.details,
  };
};

export const readResponseBody = async (response: Response): Promise<unknown> => {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";

  if (contentType.includes("application/json")) {
    try {
      return (await response.json()) as unknown;
    } catch {
      return null;
    }
  }

  try {
    const text = await response.text();
    return text.length > 0 ? text : null;
  } catch {
    return null;
  }
};

export const extractApiFailure = (body: unknown): ParsedApiFailure => {
  const envelope = parseApiErrorEnvelope(body);
  if (envelope !== null) {
    return { ...envelope, body };
  }

  if (typeof body === "string") {
    return {
      message: body.trim().length > 0 ? body : null,
      body,
    };
  }

  if (isRecord(body)) {
    const message =
      typeof body.message === "string"
        ? body.message
        : typeof body.detail === "string"
          ? body.detail
          : null;
    return {
      message,
      code: typeof body.code === "string" ? body.code : undefined,
      stage: typeof body.stage === "string" ? body.stage : undefined,
      details: isRecord(body.details) ? body.details : undefined,
      body,
    };
  }

  return { message: null, body };
};

export const readApiFailure = async (
  response: Response,
): Promise<ParsedApiFailure> => extractApiFailure(await readResponseBody(response));
