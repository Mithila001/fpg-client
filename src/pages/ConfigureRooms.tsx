import React, { useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { formatLengthFromCm, parseMetersInputToCm } from "../utils/units";

type OptionalRoomType = "bathroom" | "bedroom" | "kitchen";

type ConfigureRoomsRouteState = {
  maxUsableWidth?: number;
  maxUsableHeight?: number;
};

const roomLabels: Record<OptionalRoomType, string> = {
  bathroom: "Bathroom",
  bedroom: "Bedroom",
  kitchen: "Kitchen",
};

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const ConfigureRooms: React.FC = () => {
  const location = useLocation();
  const routeState = (location.state ?? {}) as ConfigureRoomsRouteState;

  const maxUsableWidth = isFiniteNumber(routeState.maxUsableWidth) ? routeState.maxUsableWidth : null;
  const maxUsableHeight = isFiniteNumber(routeState.maxUsableHeight) ? routeState.maxUsableHeight : null;
  const maxUsableWidthMeters = maxUsableWidth !== null ? maxUsableWidth / 100 : null;
  const maxUsableHeightMeters = maxUsableHeight !== null ? maxUsableHeight / 100 : null;

  const hasValidLimits = maxUsableWidth !== null && maxUsableHeight !== null;

  const [selectedRooms, setSelectedRooms] = useState<Record<OptionalRoomType, boolean>>({
    bathroom: false,
    bedroom: false,
    kitchen: false,
  });
  const [roomCounts, setRoomCounts] = useState<Record<OptionalRoomType, number>>({
    bathroom: 0,
    bedroom: 0,
    kitchen: 0,
  });

  const [floorWidthInput, setFloorWidthInput] = useState<string>("");
  const [floorHeightInput, setFloorHeightInput] = useState<string>("");
  const [submitStatus, setSubmitStatus] = useState<string | null>(null);

  const selectedRoomSummary = useMemo(() => {
    const picked = (Object.keys(roomLabels) as OptionalRoomType[])
      .filter((roomType) => selectedRooms[roomType])
      .map((roomType) => `${roomLabels[roomType]}: ${roomCounts[roomType]}`);

    if (picked.length === 0) {
      return "No optional rooms selected yet.";
    }

    return picked.join(" | ");
  }, [selectedRooms, roomCounts]);

  const handleToggleRoom = (roomType: OptionalRoomType) => {
    setSelectedRooms((prev) => {
      const nextSelected = !prev[roomType];

      setRoomCounts((prevCounts) => ({
        ...prevCounts,
        [roomType]: nextSelected ? Math.max(prevCounts[roomType], 1) : 0,
      }));

      return {
        ...prev,
        [roomType]: nextSelected,
      };
    });
  };

  const handleCountChange = (roomType: OptionalRoomType, nextValue: string) => {
    const parsed = Number.parseInt(nextValue, 10);
    if (!Number.isFinite(parsed)) {
      setRoomCounts((prev) => ({ ...prev, [roomType]: 0 }));
      return;
    }

    const bounded = Math.min(10, Math.max(0, parsed));
    setRoomCounts((prev) => ({ ...prev, [roomType]: bounded }));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasValidLimits || maxUsableWidth === null || maxUsableHeight === null) {
      setSubmitStatus("Max usable width/height is missing. Please run algorithm from Input Plan first.");
      return;
    }

    const floorWidthCm = parseMetersInputToCm(floorWidthInput);
    const floorHeightCm = parseMetersInputToCm(floorHeightInput);

    if (floorWidthCm === null || floorWidthCm <= 0) {
      setSubmitStatus("Enter a valid positive floor width.");
      return;
    }

    if (floorHeightCm === null || floorHeightCm <= 0) {
      setSubmitStatus("Enter a valid positive floor height.");
      return;
    }

    if (floorWidthCm > maxUsableWidth || floorHeightCm > maxUsableHeight) {
      setSubmitStatus("Floor dimensions cannot exceed max usable width/height.");
      return;
    }

    const payload = {
      roomRequirements: {
        bathroom: selectedRooms.bathroom ? roomCounts.bathroom : 0,
        bedroom: selectedRooms.bedroom ? roomCounts.bedroom : 0,
        kitchen: selectedRooms.kitchen ? roomCounts.kitchen : 0,
        // Living room is intentionally excluded from payload because backend auto-includes it.
      },
      floor: {
        width: floorWidthCm,
        height: floorHeightCm,
      },
    };

    setSubmitStatus("Submitting room configuration...");

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));
      void payload;
      setSubmitStatus("Placeholder submit complete. API integration will be added later.");
    } catch {
      setSubmitStatus("Placeholder submit failed. Please try again.");
    }
  };

  return (
    <div className="flex flex-col flex-1 min-h-0 h-full bg-slate-50">
      <div className="flex flex-1 overflow-hidden min-h-0 p-4 gap-4">
        <section className="w-[68%] min-w-0 rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-4 overflow-auto">
          <h1 className="text-lg font-semibold text-slate-800">Configure Rooms</h1>
          <p className="text-sm text-slate-600">
            Add optional room requirements. Living room is always included by default.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="rounded-md border border-slate-200 p-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Room Requirements</h2>

              {(Object.keys(roomLabels) as OptionalRoomType[]).map((roomType) => (
                <div key={roomType} className="grid grid-cols-[1fr_130px] gap-3 items-center py-2 border-b border-slate-100 last:border-b-0">
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={selectedRooms[roomType]}
                      onChange={() => handleToggleRoom(roomType)}
                      className="h-4 w-4"
                    />
                    {roomLabels[roomType]}
                  </label>

                  <input
                    type="number"
                    min={0}
                    max={10}
                    step={1}
                    value={roomCounts[roomType]}
                    onChange={(e) => handleCountChange(roomType, e.target.value)}
                    disabled={!selectedRooms[roomType]}
                    className="rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>
              ))}

              <div className="grid grid-cols-[1fr_130px] gap-3 items-center py-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input type="checkbox" checked disabled className="h-4 w-4" />
                  Living Room (always included)
                </label>
                <input
                  type="number"
                  value={1}
                  disabled
                  className="rounded border border-slate-300 px-3 py-2 text-sm bg-slate-100 text-slate-500"
                />
              </div>
            </div>

            <div className="rounded-md border border-slate-200 p-3">
              <h2 className="text-sm font-semibold text-slate-800 mb-3">Floor Dimensions</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-sm text-slate-700 flex flex-col gap-1">
                  Floor Width (m)
                  <input
                    type="number"
                    min="0"
                    max={maxUsableWidthMeters !== null ? maxUsableWidthMeters : undefined}
                    step="any"
                    value={floorWidthInput}
                    onChange={(e) => setFloorWidthInput(e.target.value)}
                    disabled={!hasValidLimits}
                    className="rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                    placeholder="e.g. 10"
                  />
                </label>

                <label className="text-sm text-slate-700 flex flex-col gap-1">
                  Floor Height (m)
                  <input
                    type="number"
                    min="0"
                    max={maxUsableHeightMeters !== null ? maxUsableHeightMeters : undefined}
                    step="any"
                    value={floorHeightInput}
                    onChange={(e) => setFloorHeightInput(e.target.value)}
                    disabled={!hasValidLimits}
                    className="rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100 disabled:text-slate-400"
                    placeholder="e.g. 8"
                  />
                </label>
              </div>

              {!hasValidLimits && (
                <div className="mt-2 text-xs text-amber-700">
                  Open this page from Input Plan after Run Algorithm to get max usable limits.
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!hasValidLimits}
              className="px-4 py-2 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-sm w-full md:w-fit disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Submit Room Requirements
            </button>

            {submitStatus && <div className="text-sm text-indigo-700">{submitStatus}</div>}
          </form>
        </section>

        <aside className="w-[32%] min-w-[280px] rounded-lg border border-slate-200 bg-white p-4 flex flex-col gap-4 overflow-auto">
          <h2 className="text-base font-semibold text-slate-800">Current Setup Details</h2>

          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <div>
              Max Usable Width:{" "}
              <span className="font-semibold">
                {maxUsableWidth !== null ? formatLengthFromCm(maxUsableWidth, 2) : "Not available"}
              </span>
            </div>
            <div>
              Max Usable Height:{" "}
              <span className="font-semibold">
                {maxUsableHeight !== null ? formatLengthFromCm(maxUsableHeight, 2) : "Not available"}
              </span>
            </div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <div className="font-medium text-slate-800 mb-1">Room Summary</div>
            <div>{selectedRoomSummary}</div>
            <div>Living Room: Always included</div>
          </div>

          <div className="rounded border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
            <div className="font-medium text-slate-800 mb-1">Selected Floor</div>
            <div>Width: {floorWidthInput ? `${floorWidthInput} m` : "Not set"}</div>
            <div>Height: {floorHeightInput ? `${floorHeightInput} m` : "Not set"}</div>
          </div>
        </aside>
      </div>
    </div>
  );
};

export default ConfigureRooms;
