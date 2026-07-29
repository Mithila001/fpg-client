import type { ProjectArea, ProjectLength } from "./measurement";
import type { RoadType } from "./boundary";

export interface MetadataRoomSize {
  roomType: string;
  size: string;
  minWidth: ProjectLength;
  maxWidth: ProjectLength;
  minArea: ProjectArea;
  maxArea: ProjectArea;
}

export interface MetadataRoomRelation {
  sourceRoomType: string;
  targetRoomTypes: string[];
  matchPolicy: "and" | "or";
  strength: "hard" | "soft";
  required: boolean;
}

export interface MetadataRoadType {
  value: RoadType;
  name: string;
  displayName: string;
}

export interface MetadataRoomRequirement {
  roomType: string;
  name: string;
  minCount: number;
  maxCount: number;
  clientSelectable: boolean;
}

export interface MetadataAspectRatio {
  label: string;
  value: number;
}

export interface WorkspaceMetadata {
  schemaVersion: 1;
  roomSizes: MetadataRoomSize[];
  roomRelations: MetadataRoomRelation[];
  roadTypes: MetadataRoadType[];
  roomRequirements: MetadataRoomRequirement[];
  compatibleAspectRatios: MetadataAspectRatio[];
  buffers: {
    hallwayArea: ProjectArea;
    floorArea: ProjectArea;
    unit: "square_project_units";
  };
}
