import React, { useState } from "react";
import CoordinateCanvas from "../components/Konva/KonvaCanvas";
import { fetchFloorPlan, fetchRawFloorPlan, wallsToPoints, roomsToLabels } from "../api/floorPlan";
import type { Coordinate, Label } from "../components/Konva/shapes/types";

const Home: React.FC = () => {
  const [points, setPoints] = useState<Coordinate[] | null>(null);
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoadFloorPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFloorPlan();
      setPoints(wallsToPoints(data.walls));
      setLabels(roomsToLabels(data.rooms));
    } catch (err) {
      setError("Failed to load floor plan. Is the backend running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRawFloorPlan = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRawFloorPlan();
      setPoints(wallsToPoints(data.walls));
      setLabels(roomsToLabels(data.rooms));
    } catch (err) {
      setError("Failed to load raw floor plan. Is the backend running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    // ensure this page fills the available space and never scrolls
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left */}
        <div className="bg-amber-200 flex-1 min-w-0 p-2 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <button
              onClick={handleLoadFloorPlan}
              disabled={loading}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading…" : "Load Floor Plan"}
            </button>
            <button
              onClick={handleLoadRawFloorPlan}
              disabled={loading}
              className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Loading…" : "Load Raw Plan"}
            </button>
            {error && <span className="text-red-600 text-sm">{error}</span>}
          </div>
          <div className="flex-1 min-h-0">
            {points !== null && (
              <CoordinateCanvas
                points={points}
                labels={labels ?? undefined}
                resolution={20}
                wallThickness={8}
              />
            )}
          </div>
        </div>

        {/* Right*/}
        <div className="bg-green-200 w-64 flex-none p-8">Right Property Panel</div>
      </div>
    </div>
  );
};

export default Home;
