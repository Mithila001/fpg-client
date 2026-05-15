import client from "./client";

export interface RoomSizeConstraint {
  id: string | null;
  type: string;
  size: string;
  min_w: number;
  max_w: number;
  min_h: number;
  max_h: number;
  max_area: number;
  min_area: number;
  preset_id: string;
  last_updated: string | null;
}

export const fetchRoomSizeConstraints = async (): Promise<RoomSizeConstraint[]> => {
  const response = await client.get<RoomSizeConstraint[]>(
    "/algorithms/room-size-constraints/",
  );
  return response.data;
};
