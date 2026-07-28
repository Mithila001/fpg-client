import type { GenerationHttpErrorBody } from "./floor-plan.api.types";

export type FloorPlanServiceErrorKind =
  | "invalid_request"
  | "transport"
  | "aborted"
  | "api_error"
  | "generation_error"
  | "invalid_response"
  | "unexpected_status"
  | "sse_protocol"
  | "stream_interrupted";

export interface FloorPlanServiceErrorOptions {
  kind: FloorPlanServiceErrorKind;
  message: string;
  status?: number;
  jobId?: string;
  code?: string;
  stage?: string;
  eventName?: string;
  rawData?: string;
  details?: GenerationHttpErrorBody | unknown;
  cause?: unknown;
}

export class FloorPlanServiceError extends Error {
  readonly kind: FloorPlanServiceErrorKind;
  readonly status?: number;
  readonly jobId?: string;
  readonly code?: string;
  readonly stage?: string;
  readonly eventName?: string;
  readonly rawData?: string;
  readonly details?: GenerationHttpErrorBody | unknown;
  readonly originalCause?: unknown;

  constructor(options: FloorPlanServiceErrorOptions) {
    super(options.message);
    this.name = "FloorPlanServiceError";
    this.kind = options.kind;
    this.status = options.status;
    this.jobId = options.jobId;
    this.code = options.code;
    this.stage = options.stage;
    this.eventName = options.eventName;
    this.rawData = options.rawData;
    this.details = options.details;
    this.originalCause = options.cause;
  }
}
