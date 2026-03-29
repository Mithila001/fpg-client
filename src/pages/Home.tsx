import React, { useState, useEffect, useRef, useCallback } from "react";
import CoordinateCanvas from "../components/Konva/KonvaCanvas";
import type { CoordinateCanvasHandle } from "../components/Konva/KonvaCanvas";
import {
  compactRoomsToLabels,
  compactRoomsToOpenings,
  fetchFormattedPlan,
  formatResponseToSegments,
  roomCentersFromCompactByRoom,
} from "../api/floorPlan";
import type { Coordinate, Label } from "../components/Konva/shapes/types";
import type { CanvasOpening } from "../types";

const Home: React.FC = () => {
  const canvasRef = useRef<CoordinateCanvasHandle>(null);
  const [segments, setSegments] = useState<Coordinate[][] | null>(null);
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [roomCenters, setRoomCenters] = useState<Coordinate[] | null>(null);
  const [openings, setOpenings] = useState<CanvasOpening[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastRequestAtRef = useRef(0);
  const inFlightRef = useRef(false);

  // helper to fetch and update data
  const load = useCallback(async () => {
    const now = Date.now();
    if (inFlightRef.current) return;
    if (now - lastRequestAtRef.current < 2000) return;

    lastRequestAtRef.current = now;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFormattedPlan();
      setSegments(formatResponseToSegments(data));
      setRoomCenters(roomCentersFromCompactByRoom(data));
      setLabels(compactRoomsToLabels(data));
      setOpenings(compactRoomsToOpenings(data));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load formatted plan.";
      setError(message);
      console.error(err);
    } finally {
      inFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  // fetch formatted walls on component mount
  useEffect(() => {
    void load();
  }, [load]);

  return (
    // ensure this page fills the available space and never scrolls
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left */}
        <div className="bg-amber-200 flex-1 min-w-0 p-2 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {loading && <span className="text-sm">Loading…</span>}
            {error && <span className="text-red-600 text-sm">{error}</span>}
          </div>
          <div className="flex-1 min-h-0">
            {segments !== null && (
              <CoordinateCanvas
                ref={canvasRef}
                segments={segments}
                labels={labels ?? undefined}
                openings={openings ?? undefined}
                pxPerCm={1}
                wallThickness={6}
              />
            )}
          </div>
        </div>

        {/* Right*/}
        <div className="bg-green-200 w-64 flex-none p-8 flex flex-col gap-4">
          <div className="text-xs text-gray-700">Rooms detected: {roomCenters?.length ?? 0}</div>
          <button
            onClick={() => void load()}
            disabled={loading}
            className="px-3 py-2 bg-emerald-600 text-white text-sm rounded hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Get New Floor Plan
          </button>
          <div className="text-xs text-gray-700">API calls are limited to once every 2 seconds.</div>
          <button
            onClick={() => canvasRef.current?.reset()}
            className="px-3 py-2 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
          >
            Reset View
          </button>
          <div className="flex-1">Right Property Panel</div>
        </div>
      </div>
    </div>
  );
};

export default Home;
