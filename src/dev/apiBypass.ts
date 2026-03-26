import type { FormatResponse } from "../api/floorPlan";

export async function fetchFormattedPlanBypass(): Promise<FormatResponse> {
  return {
    status: "FEASIBLE",
    message: "Solver found a layout",
    walls: [
      { x1: 0.0, y1: 61.0, x2: 0.0, y2: 101.0 },
      { x1: 0.0, y1: 61.0, x2: 25.0, y2: 61.0 },
      { x1: 0.0, y1: 101.0, x2: 25.0, y2: 101.0 },
      { x1: 25.0, y1: 61.0, x2: 25.0, y2: 65.0 },
      { x1: 25.0, y1: 65.0, x2: 25.0, y2: 101.0 },
      { x1: 25.0, y1: 65.0, x2: 31.0, y2: 65.0 },
      { x1: 25.0, y1: 101.0, x2: 25.0, y2: 121.0 },
      { x1: 25.0, y1: 121.0, x2: 61.0, y2: 121.0 },
      { x1: 31.0, y1: 46.0, x2: 31.0, y2: 65.0 },
      { x1: 31.0, y1: 46.0, x2: 61.0, y2: 46.0 },
      { x1: 31.0, y1: 65.0, x2: 61.0, y2: 65.0 },
      { x1: 61.0, y1: 41.0, x2: 61.0, y2: 46.0 },
      { x1: 61.0, y1: 41.0, x2: 100.0, y2: 41.0 },
      { x1: 61.0, y1: 46.0, x2: 61.0, y2: 65.0 },
      { x1: 61.0, y1: 65.0, x2: 61.0, y2: 77.0 },
      { x1: 61.0, y1: 77.0, x2: 61.0, y2: 103.0 },
      { x1: 61.0, y1: 77.0, x2: 100.0, y2: 77.0 },
      { x1: 61.0, y1: 103.0, x2: 61.0, y2: 121.0 },
      { x1: 61.0, y1: 103.0, x2: 100.0, y2: 103.0 },
      { x1: 100.0, y1: 41.0, x2: 100.0, y2: 77.0 },
      { x1: 100.0, y1: 77.0, x2: 100.0, y2: 103.0 },
    ],
    rooms: [
      { name: "bedroom1", type: "bedroom", center: { x: 80.5, y: 90.0 } },
      { name: "bedroom2", type: "bedroom", center: { x: 80.5, y: 59.0 } },
      { name: "bathroom1", type: "bathroom", center: { x: 46.0, y: 55.5 } },
      { name: "kitchen1", type: "kitchen", center: { x: 12.5, y: 81.0 } },
      { name: "Living Room", type: "livingRoom", center: { x: 43.0, y: 93.0 } },
    ],
  };
}
