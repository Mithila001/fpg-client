import client from "./client";
import type { JobStateResponse } from "../types";
import { fetchJobState } from "./jobs";

export interface UsableLandPoint {
  x: number;
  y: number;
}

export interface UsableLandRoadConnectedSegment {
  segment: [UsableLandPoint, UsableLandPoint];
  roadType: string;
}

export interface BuildableSpaceRequest {
  area: number;
  segmentsCoordinates: UsableLandPoint[];
  roadConnected?: UsableLandRoadConnectedSegment[];
  min_width?: number;
  min_height?: number;
}

export interface BuildableRectangleSides {
  front: [UsableLandPoint, UsableLandPoint];
  back: [UsableLandPoint, UsableLandPoint];
  left: [UsableLandPoint, UsableLandPoint];
  right: [UsableLandPoint, UsableLandPoint];
}

export interface BuildableRectangle {
  vertices: UsableLandPoint[];
  width: number;
  height: number;
  area: number;
  sides?: BuildableRectangleSides;
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

export interface BuildableSpaceResult {
  status: string;
  message: string;
  buildable_rectangle?: BuildableRectangle;
  shrunk_boundary?: UsableLandPoint[];
  metadata?: UsableLandResponseMetadata;
}

export interface BuildableSpaceJobSubmission {
  job_id: string;
  status: string;
  message: string;
}

export const submitBuildableSpaceJob = async (
  payload: BuildableSpaceRequest,
): Promise<BuildableSpaceJobSubmission> => {
  const response = await client.post<BuildableSpaceJobSubmission>(
    "/algorithms/buildable-space",
    payload,
  );
  return response.data;
};

export const fetchBuildableSpaceJobState = async (
  jobId: string,
): Promise<JobStateResponse<BuildableSpaceResult>> => {
  return fetchJobState<BuildableSpaceResult>(jobId);
};
