import type { ProjectArea, ProjectLength } from "./measurement";
import type { RoadType } from "./boundary";

export interface MetadataRoomSize {
  roomType: string; size: string; minWidth: ProjectLength; maxWidth: ProjectLength;
  minArea: ProjectArea; maxArea: ProjectArea;
}
export interface MetadataRoadType { value: RoadType; name: string; displayName: string }
export interface MetadataRoomRequirement {
  roomType: string; minCount: number; maxCount: number; clientSelectable: boolean;
}
export interface MetadataAspectRatio { label: string; value: number }
export interface WorkspaceMetadata {
  schemaVersion: 2; projectUnitsPerMeter: number; frontAxis: "-Y";
  roomSizes: MetadataRoomSize[]; roadTypes: MetadataRoadType[];
  roomRequirements: MetadataRoomRequirement[]; compatibleAspectRatios: MetadataAspectRatio[];
}
