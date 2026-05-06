import React, { useState, useRef, useCallback, useEffect } from "react";
import { useLocation } from "react-router-dom";
import CoordinateCanvas from "../components/Konva/KonvaCanvas";
import type { CoordinateCanvasHandle } from "../components/Konva/KonvaCanvas";
import {
  submitFormatV2Job,
  fetchFormatV2JobState,
  formatResultToSegments,
  roomCentersFromResult,
  roomsToLabels,
  roomsToOpenings,
  type FormatV2Request,
} from "../api/floorPlan.ts";
import type { Coordinate, Label } from "../components/Konva/shapes/types";
import type { CanvasOpening } from "../types";
import { subscribeToJobEvents } from "../api/client";

type HomeRouteState = {
  generateRequest?: FormatV2Request;
};

const Home: React.FC = () => {
  const location = useLocation();
  const canvasRef = useRef<CoordinateCanvasHandle>(null);
  const [segments, setSegments] = useState<Coordinate[][] | null>(null);
  const [labels, setLabels] = useState<Label[] | null>(null);
  const [roomCenters, setRoomCenters] = useState<Coordinate[] | null>(null);
  const [openings, setOpenings] = useState<CanvasOpening[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const lastRequestAtRef = useRef(0);
  const inFlightRef = useRef(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  const defaultRequest: FormatV2Request = {
    floor_width: 1000,
    floor_height: 800,
    room_template: {
      name: "Quick Layout",
      data: [{ type: "Living Room", size: "Large", name: "Main Lounge" }],
    },
    should_optuna_run: false,
    optuna_trial_count: 20,
  };

  // helper to fetch and update data
  const closeStream = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      closeStream();
    };
  }, []);

  const load = useCallback(async (request?: FormatV2Request, skipThrottle = false) => {
    const now = Date.now();
    if (inFlightRef.current) return;
    if (!skipThrottle && now - lastRequestAtRef.current < 2000) return;

    lastRequestAtRef.current = now;
    inFlightRef.current = true;
    setLoading(true);
    setError(null);
    setStatus("Submitting job...");
    try {
      closeStream();
      const submission = await submitFormatV2Job(request ?? defaultRequest);
      setStatus(submission.message || `Job submitted (${submission.job_id}).`);

      eventSourceRef.current = subscribeToJobEvents(
        submission.job_id,
        async (event) => {
          setStatus(event.message ?? event.event ?? "Processing...");

          if (
            event.event === "success" ||
            event.event === "time_out" ||
            event.event === "fpg_low_score"
          ) {
            closeStream();
            const state = await fetchFormatV2JobState(submission.job_id);
            if (!state.result) {
              setError(`Job ended with status ${state.status}, but no result was returned.`);
              inFlightRef.current = false;
              setLoading(false);
              return;
            }

            setSegments(formatResultToSegments(state.result));
            setRoomCenters(roomCentersFromResult(state.result));
            setLabels(roomsToLabels(state.result));
            setOpenings(roomsToOpenings(state.result));
            setStatus(state.result.message || "Floor plan generated successfully.");
            inFlightRef.current = false;
            setLoading(false);
          }
        },
        () => {
          closeStream();
          setError("Live updates disconnected. Check job status.");
          inFlightRef.current = false;
          setLoading(false);
        },
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load formatted plan.";
      setError(message);
      console.error(err);
    } finally {
      if (!eventSourceRef.current) {
        inFlightRef.current = false;
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const routeState = (location.state ?? null) as HomeRouteState | null;
    if (!routeState?.generateRequest) return;

    void load(routeState.generateRequest, true);
  }, [location.state, load]);

  return (
    // ensure this page fills the available space and never scrolls
    <div className="flex flex-col flex-1 min-h-0 h-full">
      <div className="flex flex-1 overflow-hidden min-h-0">
        {/* Left */}
        <div className="bg-amber-200 flex-1 min-w-0 p-2 flex flex-col gap-2">
          <div className="flex items-center gap-3">
            {loading && <span className="text-sm">Loading…</span>}
            {status && <span className="text-xs text-slate-600">{status}</span>}
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
          <div className="text-xs text-gray-700">
            API calls are limited to once every 2 seconds.
          </div>
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
