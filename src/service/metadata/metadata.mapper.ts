import type { WorkspaceMetadata } from "../../types";
import type { MetadataApiResponse } from "./metadata.api.types";

export const fromMetadataApiResponse = (
  response: MetadataApiResponse,
): WorkspaceMetadata => ({
  schemaVersion: response.schema_version,
  roomSizes: response.generation_reference_data.room_sizes.map((room) => ({
    roomType: room.room_type,
    size: room.size,
    minWidth: room.min_width,
    maxWidth: room.max_width,
    minArea: room.min_area,
    maxArea: room.max_area,
  })),
  roomRelations: response.generation_reference_data.room_relations.map(
    (relation) => ({
      sourceRoomType: relation.source_room_type,
      targetRoomTypes: [...relation.target_room_types],
      matchPolicy: relation.match_policy,
      strength: relation.strength,
      required: relation.required,
    }),
  ),
  roadTypes: response.road_types.map((roadType) => ({
    value: roadType.value,
    name: roadType.name,
    displayName: roadType.display_name,
  })),
  roomRequirements: response.room_requirements.map((requirement) => ({
    roomType: requirement.room_type,
    name: requirement.name,
    minCount: requirement.min_count,
    maxCount: requirement.max_count,
    clientSelectable: requirement.client_selectable,
  })),
  compatibleAspectRatios: response.compatible_aspect_ratios.map((ratio) => ({
    label: ratio.label,
    value: ratio.value,
  })),
  buffers: {
    hallwayArea: response.buffers.hallway_area,
    floorArea: response.buffers.floor_area,
    unit: response.buffers.unit,
  },
});
