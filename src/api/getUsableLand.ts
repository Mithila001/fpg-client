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
}

// Placeholder API call: endpoint not ready yet, so log the payload for inspection.
export async function getUsableLand(payload: UsableLandPayload): Promise<void> {
  console.log("[getUsableLand] payload", payload);
}
