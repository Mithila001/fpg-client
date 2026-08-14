export interface ApiGenerationRequest {
  floor_limits: { max_width: number; max_length: number };
  aspect_ratio: number | string;
  rooms: Array<{ room_type: string; id?: string | null; name?: string | null; requested_size?: string | null }>;
}
