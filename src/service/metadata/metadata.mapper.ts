import type { WorkspaceMetadata } from "../../types";
import type { MetadataApiResponse } from "./metadata.api.types";

export const fromMetadataApiResponse = (response: MetadataApiResponse): WorkspaceMetadata => ({
  schemaVersion: response.schema_version,
  projectUnitsPerMeter: response.project_units_per_meter,
  frontAxis: response.front_axis,
  roadTypes: response.road_types.map((item) => ({ value: item.value, name: item.name, displayName: item.display_name })),
  roomRequirements: response.room_requirements.map((item) => ({
    roomType: item.room_type, minCount: item.min_count, maxCount: item.max_count,
    clientSelectable: item.client_selectable,
  })),
  roomSizes: response.room_sizes.map((item) => ({
    roomType: item.room_type, size: item.size, minWidth: item.min_width, maxWidth: item.max_width,
    minArea: item.min_area, maxArea: item.max_area,
  })),
  compatibleAspectRatios: response.compatible_aspect_ratios.map((item) => ({ ...item })),
});
