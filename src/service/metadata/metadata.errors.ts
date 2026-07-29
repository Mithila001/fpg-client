export type MetadataServiceErrorKind =
  | "transport"
  | "aborted"
  | "api_error"
  | "invalid_response";

export class MetadataServiceError extends Error {
  readonly kind: MetadataServiceErrorKind;
  readonly status?: number;
  readonly code?: string;
  readonly stage?: string;
  readonly details?: unknown;
  readonly originalCause?: unknown;

  constructor(options: {
    kind: MetadataServiceErrorKind;
    message: string;
    status?: number;
    code?: string;
    stage?: string;
    details?: unknown;
    cause?: unknown;
  }) {
    super(options.message);
    this.name = "MetadataServiceError";
    this.kind = options.kind;
    this.status = options.status;
    this.code = options.code;
    this.stage = options.stage;
    this.details = options.details;
    this.originalCause = options.cause;
  }
}
