import React, { useState, useEffect } from "react";
import CoordinateCanvas from "../components/Konva/KonvaCanvas";
import { fetchFormattedPlan, formatResponseToSegments, roomsToLabels } from "../api/floorPlan";
import type { Coordinate, Label } from "../components/Konva/shapes/types";

const Home: React.FC = () => {
  const [segments, setSegments] = useState<Coordinate[][] | null>(null);
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // helper to fetch and update data
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchFormattedPlan();
      setSegments(formatResponseToSegments(data));
      setLabels(roomsToLabels(data.rooms));
    } catch (err) {
      setError("Failed to load formatted plan. Is the backend running?");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // fetch formatted walls on component mount
  useEffect(() => {
    load();
  }, []);

  // toggle auto-refresh loop
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      load();
    }, 2000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

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
                segments={segments}
                labels={labels ?? undefined}
                resolution={20}
                wallThickness={8}
              />
            )}
          </div>
        </div>

        {/* Right*/}
        <div className="bg-green-200 w-64 flex-none p-8 flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <label htmlFor="auto-refresh" className="text-sm">
              Auto‑refresh
            </label>
            <input
              id="auto-refresh"
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4"
            />
          </div>
          <div className="text-xs text-gray-600">
            {autoRefresh && <span>Updating every 2 seconds…</span>}
          </div>
          <div className="flex-1">Right Property Panel</div>
        </div>
      </div>
    </div>
  );
};

export default Home;
