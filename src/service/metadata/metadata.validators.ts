import { MetadataServiceError } from "./metadata.errors";
import type { MetadataApiResponse } from "./metadata.api.types";

const record = (value: unknown, path: string): Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw invalid(path);
  return value as Record<string, unknown>;
};
const invalid = (path: string): MetadataServiceError => new MetadataServiceError({
  kind: "invalid_response", message: `Invalid metadata response at ${path}.`,
});
const string = (value: unknown, path: string): string => {
  if (typeof value !== "string") throw invalid(path); return value;
};
const number = (value: unknown, path: string): number => {
  if (typeof value !== "number" || !Number.isFinite(value)) throw invalid(path); return value;
};
const integer = (value: unknown, path: string): number => {
  const result = number(value, path); if (!Number.isInteger(result) || result < 0) throw invalid(path); return result;
};
const array = (value: unknown, path: string): unknown[] => {
  if (!Array.isArray(value)) throw invalid(path); return value;
};

export const parseMetadataResponse = (value: unknown): MetadataApiResponse => {
  const root = record(value, "metadata");
  if (root.schema_version !== 2 || root.front_axis !== "-Y") throw invalid("metadata.schema_version");
  const roadTypes = array(root.road_types, "metadata.road_types").map((value, index) => {
    const item = record(value, `metadata.road_types[${index}]`);
    if (item.value !== "main_road" && item.value !== "private_road") throw invalid("metadata.road_types.value");
    return { value: item.value as "main_road" | "private_road", name: string(item.name, "road.name"), display_name: string(item.display_name, "road.display_name") };
  });
  const roomRequirements = array(root.room_requirements, "metadata.room_requirements").map((value, index) => {
    const item = record(value, `metadata.room_requirements[${index}]`);
    if (typeof item.client_selectable !== "boolean") throw invalid("room.client_selectable");
    const min = integer(item.min_count, "room.min_count"); const max = integer(item.max_count, "room.max_count");
    if (max < min) throw invalid("room.max_count");
    return { room_type: string(item.room_type, "room.room_type"), min_count: min, max_count: max, client_selectable: item.client_selectable };
  });
  const roomSizes = array(root.room_sizes, "metadata.room_sizes").map((value) => {
    const item = record(value, "metadata.room_sizes[]");
    return { room_type: string(item.room_type, "size.room_type"), size: string(item.size, "size.size"),
      min_width: number(item.min_width, "size.min_width"), max_width: number(item.max_width, "size.max_width"),
      min_area: number(item.min_area, "size.min_area"), max_area: number(item.max_area, "size.max_area") };
  });
  const ratios = array(root.compatible_aspect_ratios, "metadata.compatible_aspect_ratios").map((value) => {
    const item = record(value, "metadata.compatible_aspect_ratios[]");
    return { label: string(item.label, "ratio.label"), value: number(item.value, "ratio.value") };
  });
  return { schema_version: 2, project_units_per_meter: number(root.project_units_per_meter, "metadata.project_units_per_meter"),
    front_axis: "-Y", road_types: roadTypes, room_requirements: roomRequirements, room_sizes: roomSizes,
    compatible_aspect_ratios: ratios };
};
