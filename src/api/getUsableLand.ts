import axios from "axios";
import client from "./client";

export interface UsableLandPoint {
  x: number;
  y: number;
}

export interface UsableLandRoadConnectedSegment {
  segment: [UsableLandPoint, UsableLandPoint];
  roadType: "mainRoad";
}

export interface UsableLandPayload {
  area: number;
  segmentsCoordinates: UsableLandPoint[];
  roadConnected: UsableLandRoadConnectedSegment[];
  min_width: number;
  min_height: number;
  should_plot: boolean;
}

export interface BuildableRectangle {
  vertices: UsableLandPoint[];
  width: number;
  height: number;
  area: number;
}

export interface SegmentCategory {
  index: number;
  category: string;
}

export interface SegmentFinalOffset {
  index: number;
  offset: number;
}

export interface UsableLandResponseMetadata {
  segmentCategories: SegmentCategory[];
  segmentFinalOffsets: SegmentFinalOffset[];
}

export interface UsableLandResponse {
  status: string;
  message: string;
  buildable_rectangle?: BuildableRectangle;
  shrunk_boundary?: UsableLandPoint[];
  metadata?: UsableLandResponseMetadata;
}

const getApiErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError<{ message?: string }>(error)) {
    return error.response?.data?.message ?? error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Failed to compute buildable space.";
};

export async function getUsableLand(payload: UsableLandPayload): Promise<UsableLandResponse> {
  try {
    const response = await client.post<UsableLandResponse>("/algorithms/buildable-space", payload);
    return response.data;
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}
