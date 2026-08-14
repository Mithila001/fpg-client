export interface MetadataApiResponse {
  schema_version: 2;
  project_units_per_meter: number;
  front_axis: "-Y";
  road_types: Array<{ value: "main_road" | "private_road"; name: string; display_name: string }>;
  room_requirements: Array<{ room_type: string; min_count: number; max_count: number; client_selectable: boolean }>;
  room_sizes: Array<{ room_type: string; size: string; min_width: number; max_width: number; min_area: number; max_area: number }>;
  compatible_aspect_ratios: Array<{ label: string; value: number }>;
}
