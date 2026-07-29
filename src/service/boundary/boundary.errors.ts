export type BoundaryServiceErrorKind =
  | "invalid_request"
  | "transport"
  | "api_error"
  | "invalid_response"
  | "unexpected_status";

export interface BoundaryServiceErrorOptions {
  kind: BoundaryServiceErrorKind;
  message: string;
  status?: number;
  flowId?: string;
  code?: string;
  stage?: string;
  details?: unknown;
  cause?: unknown;
}

export class BoundaryServiceError extends Error {
  readonly kind: BoundaryServiceErrorKind;
  readonly status?: number;
  readonly flowId?: string;
  readonly code?: string;
  readonly stage?: string;
  readonly details?: unknown;
  readonly originalCause?: unknown;

  constructor(options: BoundaryServiceErrorOptions) {
    super(options.message);
    this.name = "BoundaryServiceError";
    this.kind = options.kind;
    this.status = options.status;
    this.flowId = options.flowId;
    this.code = options.code;
    this.stage = options.stage;
    this.details = options.details;
    this.originalCause = options.cause;
  }
}
