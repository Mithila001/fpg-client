export { calculateBuildableSpace } from "./boundary.service";
export { BoundaryServiceError } from "./boundary.errors";

export type {
  BoundaryServiceErrorKind,
  BoundaryServiceErrorOptions,
} from "./boundary.errors";

export type {
  BoundarySide,
  BuildableSpaceErrorCode,
  BuildableSpaceErrorResponse,
  BuildableSpaceErrorStage,
  BuildableSpaceRequest,
  BuildableSpaceResponse,
  EdgeSetbackResponse,
  FloorWidthAlignment,
  LandBoundaryRequest,
  LandPointRequest,
  PointResponse,
  PolygonResponse,
  RoadAttachmentRequest,
  RoadRole,
  RoadType,
} from "./boundary.api.types";
