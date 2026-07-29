export interface MetadataApiResponse {
  schema_version: 1;
  generation_reference_data: {
    room_sizes: Array<{
      room_type: string;
      size: string;
      min_width: number;
      max_width: number;
      min_area: number;
      max_area: number;
    }>;
    room_relations: Array<{
      source_room_type: string;
      target_room_types: string[];
      match_policy: "and" | "or";
      strength: "hard" | "soft";
      required: boolean;
    }>;
  };
  road_types: Array<{
    value: "main_road" | "private_road";
    name: string;
    display_name: string;
  }>;
  room_requirements: Array<{
    room_type: string;
    name: string;
    min_count: number;
    max_count: number;
    client_selectable: boolean;
  }>;
  compatible_aspect_ratios: Array<{
    label: string;
    value: number;
  }>;
  buffers: {
    hallway_area: number;
    floor_area: number;
    unit: "square_project_units";
  };
}
