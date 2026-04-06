import axios from "axios";
import client from "./client";
import { m2ToCm2, mToCm } from "../utils/units";

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

const normalizePointToCm = (point: UsableLandPoint): UsableLandPoint => ({
  x: mToCm(point.x),
  y: mToCm(point.y),
});

const normalizeBuildableRectangleToCm = (
  rectangle?: BuildableRectangle,
): BuildableRectangle | undefined => {
  if (!rectangle) return undefined;

  return {
    ...rectangle,
    vertices: (rectangle.vertices ?? []).map(normalizePointToCm),
    width: mToCm(rectangle.width),
    height: mToCm(rectangle.height),
    area: m2ToCm2(rectangle.area),
  };
};

// Backend returns Step A values in meters; normalize to internal centimeters.
const normalizeUsableLandResponseToCm = (response: UsableLandResponse): UsableLandResponse => ({
  ...response,
  buildable_rectangle: normalizeBuildableRectangleToCm(response.buildable_rectangle),
  shrunk_boundary: (response.shrunk_boundary ?? []).map(normalizePointToCm),
});

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
    return normalizeUsableLandResponseToCm(response.data);
  } catch (error) {
    throw new Error(getApiErrorMessage(error));
  }
}
